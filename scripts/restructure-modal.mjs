// One-shot patcher: replaces the Highlights block + Trends block
// in ai-news-dashboard/src/App.tsx with a single 2-col insights grid.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(here, '..', 'src', 'App.tsx');
const src = readFileSync(file, 'utf8');

const ANCHOR_START = '              {/* Key Highlights & Thailand Relevance Section */}';
const BACKUP_END_ANCHOR = '{/* Back to feed closing actions */}';

const startIdx = src.indexOf(ANCHOR_START);
if (startIdx === -1) { console.error('ANCHOR_START not found'); process.exit(1); }

const bIdx = src.indexOf(BACKUP_END_ANCHOR, startIdx);
if (bIdx === -1) { console.error('BACKUP_END_ANCHOR not found'); process.exit(1); }

const closePattern = '              </div>\r\n';
const lastClose = src.lastIndexOf(closePattern, bIdx);
if (lastClose === -1) { console.error('closing </div> not found'); process.exit(1); }
const endIdx = lastClose + closePattern.length;

const lines = [
  '              {/* INSIGHTS ZONE: 2-col grid (highlights + trends) on desktop, stacked on mobile */}',
  '              <div className="px-6 md:px-8 pt-8 pb-2 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">',
  '                {/* Highlights column (2/3 on desktop) */}',
  '                <div className="md:col-span-2 space-y-5">',
  '                  <h4',
  '                    className="font-mono text-[11px] font-bold text-black/80 dark:text-zinc-400 tracking-[0.18em] uppercase"',
  '                    style={theme === \'light\' ? { color: \'#000000\' } : undefined}',
  '                  >',
  '                    {t.keyHighlights}',
  '                  </h4>',
  '                  <ol className="space-y-5">',
  '                    {(lang === \'en\' ? activeArticle.keyHighlightsEn : activeArticle.keyHighlightsTh).map((highlight: HighlightBullet, idx: number) => (',
  '                      <li',
  '                        id={"highlight-row-" + idx}',
  '                        key={idx}',
  '                        className="group relative pl-9"',
  '                      >',
  '                        <span',
  '                          className="absolute left-0 top-0 font-mono text-2xl font-bold leading-none text-[#0066cc]/30 dark:text-emerald-400/40 group-hover:text-[#0066cc] dark:group-hover:text-emerald-400 transition-colors select-none"',
  '                          aria-hidden="true"',
  '                        >',
  '                          {String(idx + 1).padStart(2, \'0\')}',
  '                        </span>',
  '                        <h5',
  '                          className="text-sm sm:text-base font-bold text-black dark:text-white leading-snug mb-1"',
  '                          style={theme === \'light\' ? { color: \'#000000\' } : undefined}',
  '                        >',
  '                          {highlight.title}',
  '                        </h5>',
  '                        {highlight.desc && highlight.desc !== highlight.title && (',
  '                          <p',
  '                            className="text-xs sm:text-sm text-black/80 dark:text-zinc-300 leading-relaxed font-sans"',
  '                            style={theme === \'light\' ? { color: \'#2b2b2f\' } : undefined}',
  '                          >',
  '                            {highlight.desc}',
  '                          </p>',
  '                        )}',
  '                        {highlight.thailandRelevance && (',
  '                          <div className="mt-2 pl-3 border-l-2 border-[#0066cc]/60 dark:border-emerald-400/60 text-[11px] sm:text-xs leading-relaxed text-black/75 dark:text-zinc-400">',
  '                            <span',
  '                              className="font-mono font-bold uppercase tracking-wider text-[10px] text-[#0066cc] dark:text-emerald-400 block mb-0.5"',
  '                              style={theme === \'light\' ? { color: \'#0066cc\' } : undefined}',
  '                            >',
  '                              {t.thaiPerspectiveLabel}',
  '                            </span>',
  '                            {highlight.thailandRelevance}',
  '                          </div>',
  '                        )}',
  '                      </li>',
  '                    ))}',
  '                  </ol>',
  '                </div>',
  '',
  '                {/* Trends column (1/3 on desktop) */}',
  '                {(lang === \'en\' ? activeArticle.trendsOverviewEn : activeArticle.trendsOverviewTh).length > 0 && (',
  '                  <div className="md:col-span-1">',
  '                    <div className="md:sticky md:top-4 space-y-3 p-4 rounded-md bg-black/[0.03] dark:bg-white/[0.03] border-l-2 border-[#0066cc] dark:border-emerald-400">',
  '                      <h4',
  '                        className="font-mono text-[11px] font-bold text-black/80 dark:text-zinc-400 tracking-[0.18em] uppercase"',
  '                        style={theme === \'light\' ? { color: \'#000000\' } : undefined}',
  '                      >',
  '                        {t.trendsOverview}',
  '                      </h4>',
  '                      <ul className="space-y-3 text-xs sm:text-sm text-black/85 dark:text-zinc-300" id="trends-list">',
  '                        {(lang === \'en\' ? activeArticle.trendsOverviewEn : activeArticle.trendsOverviewTh).map((trend: string, idx: number) => (',
  '                          <li',
  '                            key={idx}',
  '                            className="leading-relaxed font-sans"',
  '                            style={theme === \'light\' ? { color: \'#000000\' } : undefined}',
  '                          >',
  '                            {trend}',
  '                          </li>',
  '                        ))}',
  '                      </ul>',
  '                    </div>',
  '                  </div>',
  '                )}',
  '              </div>',
  '',
];

const replacement = lines.join('\r\n');

const before = src.slice(0, startIdx);
const after = src.slice(endIdx);
const next = before + replacement + after;
writeFileSync(file, next, 'utf8');

console.log(`patched ${file}`);
console.log(`  replaced ${endIdx - startIdx} bytes`);
console.log(`  new size: ${next.length} bytes (was ${src.length})`);
