/**
 * UI-side types for the AI News Dashboard.
 *
 * Derived from the Supabase `articles` row schema (see lib/supabase.ts)
 * and reshaped for the bilingual feed layout.
 *
 * IMPORTANT: this is a read-only client. All fields come from already-
 * stored articles produced by the ai-news-openclaw digest pipeline.
 */

export type Lang = "en" | "th";

export type Category = "MCP" | "Agent" | "Memory" | "Research";

export const CATEGORIES: ReadonlyArray<Category> = [
  "MCP",
  "Agent",
  "Memory",
  "Research",
];

export type CategoryFilter = Category | "All";

export interface HighlightBullet {
  title: string;
  desc: string;
}

/**
 * UI-shaped article derived from one Supabase row. Built in
 * lib/data.ts so the components stay schema-agnostic.
 */
export interface UINewsArticle {
  id: number;
  titleEn: string;
  titleTh: string;
  category: Category;
  publishedDate: string;
  summarizedTime: string;
  summarizedDate?: string;
  snippetEn: string;
  snippetTh: string;
  executiveSummaryEn: string;
  executiveSummaryTh: string;
  keyHighlightsEn: HighlightBullet[];
  keyHighlightsTh: HighlightBullet[];
  originalSourceUrl?: string;
  imageUrl?: string | null;
}

/** Raw row shape returned by Supabase. */
export interface RawArticleRow {
  id: number;
  title_en: string;
  title_th: string;
  summary_en: string;
  summary_th: string;
  body_en: string;
  body_th: string;
  category: string;
  original_url: string;
  image_url: string | null;
  published_date: string;
  inserted_at?: string;
}
