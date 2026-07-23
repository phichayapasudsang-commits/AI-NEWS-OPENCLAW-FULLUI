// One-shot patcher: inserts a "Related Articles" zone right before the
// "Back to feed closing actions" footer in App.tsx.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(here, '..', 'src', 'App.tsx');
const src = readFileSync(file, 'utf8');

const ANCHOR = '              {/* Back to feed closing actions */}';
const idx = src.indexOf(ANCHOR);
if (idx === -1) { console.error('anchor not found'); process.exit(1); }

const lines = [
  '',
  '              {/* RELATED ARTICLES: same category first, fall back to other categories */}',
  '              {(() => {',
  '                const related = findRelatedArticles(filteredArticles, activeArticle, 3);',
  '                if (related.length === 0) return null;',
  '                return (',
  '                  <div className="px-6 md:px-8 pt-8 border-t border-dashed border-black/15 dark:border-zinc-800">',
  '                    <h4',
  '                      className="font-mono text-[11px] font-bold text-black/80 dark:text-zinc-400 tracking-[0.18em] uppercase mb-4"',
  '                      style={theme === \'light\' ? { color: \'#000000\' } : undefined}',
  '                    >',
  '                      More in {activeArticle.category}',
  '                    </h4>',
  '                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">',
  '                      {related.map((r) => (',
  '                        <button',
  '                          key={r.id}',
  '                          onClick={() => setActiveArticle(r)}',
  '                          className="text-left group p-3 rounded-md border border-black/10 dark:border-zinc-800/60 hover:border-black dark:hover:border-zinc-600 transition-all bg-white dark:bg-zinc-900/20"',
  '                          style={theme === \'light\' ? { backgroundColor: \'#FFFBFB\', borderColor: \'#000000\' } : undefined}',
  '                        >',
  '                          {r.imageUrl && (',
  '                            <div className="w-full h-24 mb-2 overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-950/20 flex items-center justify-center">',
  '                              <img',
  '                                src={r.imageUrl}',
  '                                alt={lang === \'en\' ? r.titleEn : r.titleTh}',
  '                                className="w-full h-full object-cover"',
  '                                onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = \'none\'; }}',
  '                              />',
  '                            </div>',
  '                          )}',
  '                          <div className="font-mono text-[10px] text-black/60 dark:text-zinc-500 mb-1">{r.publishedDate}</div>',
  '                          <div',
  '                            className="text-xs sm:text-sm font-bold leading-snug text-black dark:text-zinc-100 line-clamp-3"',
  '                            style={theme === \'light\' ? { color: \'#000000\' } : undefined}',
  '                          >',
  '                            {lang === \'en\' ? r.titleEn : r.titleTh}',
  '                          </div>',
  '                        </button>',
  '                      ))}',
  '                    </div>',
  '                  </div>',
  '                );',
  '              })()}',
  '',
];

const replacement = lines.join('\r\n');
const next = src.slice(0, idx) + replacement + src.slice(idx);
writeFileSync(file, next, 'utf8');

console.log(`patched ${file}`);
console.log(`  inserted ${replacement.length} bytes`);
console.log(`  new size: ${next.length} bytes (was ${src.length})`);
