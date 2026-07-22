/**
 * Mapping layer between Supabase row schema and UI shapes.
 *
 * Pipeline stores articles as flat columns (`title_en`, `body_en`, ...)
 * with `body_en` being a newline-joined bullet list starting with "- ".
 * The UI wants structured fields (executive summary, key highlights),
 * so we reshape here.
 */
import type {
  Category,
  HighlightBullet,
  RawArticleRow,
  UINewsArticle,
} from "./types";

const CATEGORY_SET: ReadonlySet<string> = new Set([
  "MCP",
  "Agent",
  "Memory",
  "Research",
]);

/** Normalize a raw category string from the DB into the typed Category. */
function normalizeCategory(raw: string): Category {
  const c = (raw || "").trim().toLowerCase();
  if (c === "mcp") return "MCP";
  if (c === "agent") return "Agent";
  if (c === "memory") return "Memory";
  if (CATEGORY_SET.has(raw)) return raw as Category;
  return "Research";
}

/**
 * Split a pipeline body string into bullet items. Each line that starts
 * with "-" (with optional leading whitespace) is a bullet. Lines without
 * a leading "-" are ignored.
 */
export function parseBullets(body: string): string[] {
  if (!body) return [];
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter((line) => line.length > 0);
}

/**
 * Structured body shape that the dashboard parses from body_en / body_th.
 * The pipeline packs a rich schema into those columns as multi-section
 * text using marker lines:
 *
 *   [EXECUTIVE]
 *   <paragraph>
 *
 *   [HIGHLIGHTS]
 *   - bullet
 *
 *   [TRENDS]
 *   - macro trend
 */
export interface RichBody {
  executive: string;
  highlights: string[];
  trends: string[];
}

/**
 * Parse a pipeline body into its structured sections. Returns all-empty
 * fields when the body has no recognised section markers, so callers can
 * fall back to legacy parseBullets() for the old flat-bullet shape.
 */
export function parseRichBody(body: string): RichBody {
  const empty: RichBody = { executive: "", highlights: [], trends: [] };
  if (!body) return empty;
  const hasMarker = /\[(EXECUTIVE|HIGHLIGHTS|TRENDS)\]/i.test(body);
  if (!hasMarker) {
    // Legacy shape: every "- ..." line is a highlight, no exec / trends.
    return { executive: "", highlights: parseBullets(body), trends: [] };
  }

  const lines = body.split(/\r?\n/);
  let section: keyof RichBody | null = null;
  const execBuf: string[] = [];
  const highlightsBuf: string[] = [];
  const trendsBuf: string[] = [];

  const flushSection = () => {
    if (section === "executive") {
      // Collapse the executive paragraph to a single trimmed string.
      // (Section body is reassembled externally when needed.)
    }
    section = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    const m = line.match(/^\[(EXECUTIVE|HIGHLIGHTS|TRENDS)\]\s*$/i);
    if (m) {
      section = m[1].toUpperCase() === "EXECUTIVE"
        ? "executive"
        : m[1].toUpperCase() === "HIGHLIGHTS"
        ? "highlights"
        : "trends";
      continue;
    }
    if (section === "executive") {
      if (line.length > 0) execBuf.push(line);
    } else if (section === "highlights") {
      if (line.length > 0) {
        highlightsBuf.push(line.replace(/^[-*•]\s*/, "").trim());
      }
    } else if (section === "trends") {
      if (line.length > 0) {
        trendsBuf.push(line.replace(/^[-*•]\s*/, "").trim());
      }
    }
  }
  flushSection();

  return {
    executive: execBuf.join(" ").trim(),
    highlights: highlightsBuf.filter((s) => s.length > 0),
    trends: trendsBuf.filter((s) => s.length > 0),
  };
}

/** Shape a raw row into the UI model. */
export function toUINewsArticle(row: RawArticleRow): UINewsArticle {
  const category = normalizeCategory(row.category);

  const richEn = parseRichBody(row.body_en);
  const richTh = parseRichBody(row.body_th);

  // Prefer the rich [EXECUTIVE] paragraph. Fall back to summary_en when the
  // pipeline hasn't shipped the new schema yet (or the row pre-dates it).
  const executiveSummaryEn =
    richEn.executive || row.summary_en || "";
  const executiveSummaryTh =
    richTh.executive || row.summary_th || "";

  // Highlights: rich section wins; otherwise legacy bullet parsing.
  const keyHighlightsEn = (richEn.highlights.length > 0
    ? richEn.highlights
    : parseBullets(row.body_en)
  ).map(toHighlight);
  const keyHighlightsTh = (richTh.highlights.length > 0
    ? richTh.highlights
    : parseBullets(row.body_th)
  ).map(toHighlight);

  // Trends: rich section only. Empty array keeps the modal clean for legacy rows.
  // (Trends are plain strings in the UI model, not HighlightBullets.)
  const trendsOverviewEn = richEn.trends;
  const trendsOverviewTh = richTh.trends;

  return {
    id: row.id,
    titleEn: row.title_en || "",
    titleTh: row.title_th || row.title_en || "",
    category,
    publishedDate: row.published_date || "",
    summarizedTime: formatSummarizedTime(row.inserted_at),
    summarizedDate: formatSummarizedDate(row.inserted_at),
    snippetEn: trimForSnippet(row.summary_en),
    snippetTh: trimForSnippet(row.summary_th),
    executiveSummaryEn,
    executiveSummaryTh,
    keyHighlightsEn,
    keyHighlightsTh,
    trendsOverviewEn,
    trendsOverviewTh,
    originalSourceUrl: row.original_url || undefined,
    imageUrl: row.image_url ?? undefined,
  };
}

/** Cap snippet length for card preview. */
function trimForSnippet(text: string, max = 220): string {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

/** Convert a single bullet line into {title, desc}. */
function toHighlight(line: string): HighlightBullet {
  return { title: line, desc: "" };
}

/** e.g. "21 Jul 2026, 13:15" */
function formatSummarizedTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSummarizedDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Stub fallback dataset. Kept here so App.tsx can fall back to a
 * static list when Supabase is unreachable or while the user toggles
 * the local "reset to defaults" action. Phase B will replace this with
 * a proper fetch + delete flow backed by Supabase.
 */
export const ARTICLES_DATA: UINewsArticle[] = [];

/** Empty-state placeholder used while the dashboard is loading. */
export const EMPTY_ARTICLES: UINewsArticle[] = [];
