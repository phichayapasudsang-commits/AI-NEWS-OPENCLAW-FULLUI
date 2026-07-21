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

/** Shape a raw row into the UI model. */
export function toUINewsArticle(row: RawArticleRow): UINewsArticle {
  const category = normalizeCategory(row.category);

  const highlightsEnRaw = parseBullets(row.body_en);
  const highlightsThRaw = parseBullets(row.body_th);

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
    executiveSummaryEn: row.summary_en || "",
    executiveSummaryTh: row.summary_th || "",
    keyHighlightsEn: highlightsEnRaw.map(toHighlight),
    keyHighlightsTh: highlightsThRaw.map(toHighlight),
    trendsOverviewEn: [],
    trendsOverviewTh: [],
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
