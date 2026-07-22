/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sun,
  Moon,
  Search,
  Cpu,
  Brain,
  Layers,
  Sparkles,
  BookOpen,
  Clock,
  Calendar,
  ExternalLink,
  X,
  ArrowUpRight,
  RefreshCw,
  Globe,
  Info
} from 'lucide-react';
import { ARTICLES_DATA } from './lib/data';
import { fetchArticles } from './lib/supabase';
import { NewsArticle, Category, CategoryFilter, HighlightBullet } from './lib/types';

// UI Dictionary for dual-language support
const DICTIONARY = {
  en: {
    title: 'Agentic AI News',
    subtitle: 'Latest agentic AI news summarized by AI',
    tagline: 'A highly structured newsletter summarizing breakthrough development systems, protocols, and autonomous algorithms in AI.',
    published: 'Published',
    summarized: 'Summarized',
    readSummary: 'Read Summary',
    categories: 'Categories',
    searchPlaceholder: 'Search headlines or snippets...',
    all: 'All',
    Agent: 'AI Agent',
    memory: 'Memory',
    MCP: 'MCP',
    Research: 'Research',
    agents: 'Agents',
    mcp: 'MCP',
    research: 'Research',
    close: 'Close',
    backToFeed: 'All News',
    backToHome: 'Back to Home',
    implications: 'Key Implications & Strategic Takeaways',
    structuralDetails: 'Structured AI Breakdown',
    execSummary: 'Executive Summary',
    keyHighlights: 'Key Highlights & Local Perspective',
    trendsOverview: 'Strategic Trends & Outlook',
    thaiPerspectiveLabel: 'Thailand Relevance & Takeaway',
    noArticles: 'No summarized articles found matching your criteria.',
    languageToggle: 'Change to ภาษาไทย',
    themeLight: 'Light Mode',
    themeDark: 'Dark Mode',
    source: 'Source',
    readOriginalSource: 'Read Original Source'
  },
  th: {
    title: 'Agentic AI News',
    subtitle: 'Latest agentic AI news summarized by AI',
    tagline: 'จดหมายข่าวสารระเบียบระดับโลก สรุปโครงสร้างการพัฒนา ระบบสากล โปรโตคอล และอัลกอริทึมเอเจนต์ AI ล่าสุดด้วยปัญญาประดิษฐ์',
    published: 'วันที่เผยแพร่',
    summarized: 'สรุปโดย AI',
    readSummary: 'อ่านบทสรุป',
    categories: 'หมวดหมู่ข่าว',
    searchPlaceholder: 'ค้นหาพาดหัวข่าว หรือเนื้อหาย่อย...',
    all: 'ทั้งหมด',
    Agent: 'เอเจนต์ AI',
    memory: 'หน่วยความจำ',
    MCP: 'มาตรฐาน MCP',
    Research: 'งานวิจัย',
    agents: 'เอเจนต์',
    mcp: 'มาตรฐาน MCP',
    research: 'งานวิจัย',
    close: 'ปิดหน้าต่าง',
    backToFeed: 'ข่าวทั้งหมด',
    backToHome: 'กลับหน้าหลัก',
    implications: 'นัยสำคัญเชิงกลยุทธ์และผลกระทบตลาด',
    structuralDetails: 'โครงสร้างวิเคราะห์จุดต่อจุดโดยละเอียด',
    execSummary: 'บทสรุปผู้บริหาร',
    keyHighlights: 'ประเด็นข่าวเด่นและมุมมองในประเทศ',
    trendsOverview: 'แนวโน้มเชิงกลยุทธ์และคาดการณ์',
    thaiPerspectiveLabel: 'มุมมองและการนำไปใช้ในไทย',
    noArticles: 'ไม่พบเรื่องข่าวย่อยที่ตรงกับเงื่อนไขการค้นหาของคุณ',
    languageToggle: 'สลับเป็น English',
    themeLight: 'โหมดสว่าง (ขาว)',
    themeDark: 'โหมดมืด (ดำ)',
    source: 'แหล่งข่าว',
    readOriginalSource: 'เปิดดูแหล่งข่าวต้นฉบับ'
  }
};

export default function App() {
  // Lang state
  const [lang, setLang] = useState<'en' | 'th'>('th');

  // Theme state: default to 'dark' for premium high-contrast feel, or light as specified
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('agentic-news-theme');
    return saved === 'light' ? 'light' : 'dark'; // default to premium dark text-zinc-100
  });

  // Track articles listing (allows local additions)
  const [articles, setArticles] = useState<NewsArticle[]>(() => {
    const saved = localStorage.getItem('agentic-news-list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return ARTICLES_DATA;
      }
    }
    return ARTICLES_DATA;
  });

  // Save changes to articles list
  useEffect(() => {
    localStorage.setItem('agentic-news-list', JSON.stringify(articles));
  }, [articles]);

  // Loading + error state for the initial Supabase fetch.
  const [isLoadingArticles, setIsLoadingArticles] = useState(true);
  const [articlesFetchError, setArticlesFetchError] = useState<string | null>(null);

  /**
   * Pull the latest feed from Supabase. We snapshot localStorage first so
   * user-added entries (with string ids) are never lost; server entries
   * are tagged with a `srv-` prefix so they cannot collide with future
   * user-added ids. Server wins on collisions; local-only entries are
   * appended at the end.
   */
  const refreshArticlesFromSupabase = useCallback(async () => {
    setIsLoadingArticles(true);
    setArticlesFetchError(null);
    try {
      const savedRaw = localStorage.getItem('agentic-news-list');
      const localArticles: NewsArticle[] = savedRaw ? JSON.parse(savedRaw) : ARTICLES_DATA;

      const serverArticles = await fetchArticles(50);
      const taggedServer: NewsArticle[] = serverArticles.map((a) => ({
        ...a,
        id: `srv-${a.id}`,
      }));
      const seen = new Set(taggedServer.map((a) => String(a.id)));
      const onlyLocal = localArticles.filter((a) => !seen.has(String(a.id)));
      setArticles([...taggedServer, ...onlyLocal]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[dashboard] Failed to fetch articles from Supabase:', msg);
      setArticlesFetchError(msg);
    } finally {
      setIsLoadingArticles(false);
    }
  }, []);

  // Fetch from Supabase on mount.
  useEffect(() => {
    refreshArticlesFromSupabase();
  }, [refreshArticlesFromSupabase]);

  // Persist theme choice
  useEffect(() => {
    localStorage.setItem('agentic-news-theme', theme);
  }, [theme]);

  // Active category filter state
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  
  // Text search filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Selected article for detailed modal dialog view
  const [activeArticle, setActiveArticle] = useState<NewsArticle | null>(null);

  // Hover states for light-mode specific interactive elements
  const [isCloseHovered, setIsCloseHovered] = useState(false);
  const [isRedirectHovered, setIsRedirectHovered] = useState(false);
  const [isBottomCloseHovered, setIsBottomCloseHovered] = useState(false);

  const t = DICTIONARY[lang] as Record<string, string>;

  const handleUpdateNews = async () => {
    // Pure client-side refresh: re-pull the latest feed from Supabase.
    await refreshArticlesFromSupabase();
  };

  const deleteArticle = async (id: string, e: MouseEvent) => {
    e.stopPropagation();
    setArticles((prev) => prev.filter((a) => a.id !== id));
    if (activeArticle?.id === id) {
      setActiveArticle(null);
    }
    try {
      await fetch(`/api/articles/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Failed to delete article from database:', error);
    }
  };

  const resetAllArticles = async () => {
    if (window.confirm(lang === 'en' ? 'Do you want to restore original default summarized news articles?' : 'ต้องการรีเซ็ตเพื่อย้อนคืนค่าข้อมูลบทสรุปข่าวเดิมทึ่กำหนดไว้ใช่หรือไม่?')) {
      try {
        const res = await fetch('/api/articles/reset', {
          method: 'POST'
        });
        if (res.ok) {
          // โหลดบทความใหม่หลังจากรีเซ็ตสำเร็จ
          const articlesRes = await fetch('/api/articles');
          if (articlesRes.ok) {
            const data = await articlesRes.json();
            if (data && (Array.isArray(data.today) || Array.isArray(data.older))) {
              setArticles([...(data.today || []), ...(data.older || [])]);
            } else {
              setArticles(ARTICLES_DATA);
            }
          } else {
            setArticles(ARTICLES_DATA);
          }
          localStorage.removeItem('agentic-news-list');
        }
      } catch (error) {
        console.error('Failed to reset database:', error);
        setArticles(ARTICLES_DATA);
      }
    }
  };

  // Filter criteria logic
  const filteredArticles = articles.filter((article) => {
    const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;
    const normQuery = searchQuery.toLowerCase();
    
    const matchesSearch = 
      article.titleEn.toLowerCase().includes(normQuery) ||
      article.titleTh.toLowerCase().includes(normQuery) ||
      article.snippetEn.toLowerCase().includes(normQuery) ||
      article.snippetTh.toLowerCase().includes(normQuery) ||
      article.category.toLowerCase().includes(normQuery);

    return matchesCategory && matchesSearch;
  });

  // Split articles into Today and Older sections based on local timezone date string
  const getTodayDateString = () => {
    const localDate = new Date();
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayDateString();
  
  const isPublishedToday = (article: NewsArticle) => {
    const pubDate = article.publishedDate;
    if (!pubDate || pubDate === 'N/A') {
      return article.summarizedDate === todayStr;
    }
    
    const cleanPub = pubDate.trim().toLowerCase();
    
    const localDate = new Date();
    const day = localDate.getDate();
    const monthShort = localDate.toLocaleString('en-US', { month: 'short' }).toLowerCase();
    const monthLong = localDate.toLocaleString('en-US', { month: 'long' }).toLowerCase();
    const year = localDate.getFullYear();
    
    // Check multiple formats for today's date (e.g. "29 Jun 2026", "29 June 2026", "2026-06-29")
    const todayFmt1 = `${day} ${monthShort} ${year}`;
    const todayFmt2 = `${day} ${monthLong} ${year}`;
    const todayFmt3 = `${year}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return cleanPub.includes(todayFmt1) || 
           cleanPub.includes(todayFmt2) || 
           cleanPub === todayFmt3 ||
           (cleanPub.includes(String(year)) && (cleanPub.includes(monthShort) || cleanPub.includes(monthLong)) && cleanPub.includes(String(day)));
  };

  const todayArticles = filteredArticles.filter((a) => isPublishedToday(a));
  const olderArticles = filteredArticles.filter((a) => !isPublishedToday(a));

  // Helper to render a single article card
  const renderArticle = (article: NewsArticle) => {
    const title = lang === 'en' ? article.titleEn : article.titleTh;
    const snippet = lang === 'en' ? article.snippetEn : article.snippetTh;
    const categoryLabel = article.category;
    const isAgents = article.category === 'Agent';
    const isMemory = article.category === 'Memory';
    const isMcp = article.category === 'MCP';
    
    const getTitleStyle = () => {
      if (theme !== 'light') return undefined;
      if (article.id === 'openai-framework-2026') return { color: '#080707' };
      if (article.id === 'deepmind-metacognition-research') return { color: '#080808' };
      return { color: '#000000' };
    };

    const getBadgeStyle = () => {
      if (theme !== 'light') return undefined;
      if (isAgents) {
        return { backgroundColor: '#01acf4', color: '#183c48', borderColor: '#01acf4' };
      }
      if (isMemory) {
        return { backgroundColor: '#786efb', color: '#10111c', borderColor: '#786efb' };
      }
      if (isMcp) {
        const bg = article.id === 'microsoft-semantic-kernel-mcp' ? '#aa44fc' : '#a743f9';
        const cl = article.id === 'microsoft-semantic-kernel-mcp' ? '#100d11' : '#171119';
        return { backgroundColor: bg, color: cl, borderColor: bg };
      }
      const bg = '#d6843d';
      const cl = article.id === 'autonomous-mcp-agent-market' ? '#110e05' : '#050401';
      return { backgroundColor: bg, color: cl, borderColor: bg };
    };

    return (
      <motion.article
        id={`article-card-${article.id}`}
        key={article.id}
        layout
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={() => setActiveArticle(article)}
        className="group border border-black dark:border-zinc-800 hover:border-black dark:hover:border-zinc-300 rounded-lg p-5 md:p-6 bg-white dark:bg-[#111218] transition-all hover:shadow-xl hover:translate-y-[-2px] relative cursor-pointer"
        style={theme === 'light' ? { backgroundColor: '#FFFBFB' } : undefined}
      >
        {article.imageUrl && (
          <div className="w-full max-h-64 sm:max-h-80 overflow-hidden rounded bg-zinc-50 dark:bg-zinc-950/20 border border-black/10 dark:border-zinc-800/80 mb-3.5 flex justify-center items-center flex-shrink-0">
            <img 
              src={article.imageUrl} 
              alt={title}
              className="w-full max-h-64 sm:max-h-80 object-contain transition-transform duration-500 group-hover:scale-[1.01]"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).parentElement!.style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
          <span 
            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
              isAgents ? 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20 text-sky-700 dark:text-sky-300' :
              isMemory ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300' :
              isMcp ? 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-300' :
              'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300'
            }`}
            style={getBadgeStyle()}
          >
            {categoryLabel}
          </span>


        </div>

        <div className="w-full min-w-0">
          <div>
            <h2 
              className="font-display text-base sm:text-lg md:text-xl font-bold tracking-tight text-black dark:text-white leading-snug group-hover:text-[#0066cc] dark:group-hover:text-emerald-400 transition-colors"
              style={getTitleStyle()}
            >
              {title}
            </h2>
          </div>

          <div className="my-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-[11px] font-mono text-black/70 dark:text-zinc-500">
            <span 
              className="flex items-center gap-1 select-none"
              style={theme === 'light' ? { color: article.id === 'openai-framework-2026' ? '#0a0a0b' : '#000000' } : undefined}
            >
              {t.published}: {article.publishedDate}
            </span>
            <span 
              className="flex items-center gap-1"
              style={theme === 'light' ? { color: '#000000' } : undefined}
            >
              {t.summarized}: {article.summarizedTime}
            </span>
          </div>

          <p 
            className="text-xs sm:text-sm text-black/90 dark:text-zinc-400 leading-relaxed mb-4"
            style={theme === 'light' ? { color: '#000000' } : undefined}
          >
            {snippet}
          </p>

          <div className="flex items-center justify-between">
            <button
              id={`read-summary-btn-${article.id}`}
              className="font-mono text-xs font-semibold tracking-wide border-b border-dashed border-current pb-0.5 group-hover:text-[#0066cc] dark:group-hover:text-emerald-400 hover:border-solid transition-colors uppercase outline-none"
            >
              [ {t.readSummary} ]
            </button>

            {article.originalSourceUrl && (
              <a
                id={`external-lnk-${article.id}`}
                href={article.originalSourceUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono border border-black dark:border-zinc-700 rounded bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-black dark:text-zinc-300 hover:text-black dark:hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <span>{t.source}</span> <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </motion.article>
    );
  };

  return (
    <div className={theme === 'dark' ? 'dark min-h-screen bg-[#090a0f] text-zinc-100 transition-colors duration-300 font-sans' : 'min-h-screen bg-white text-black transition-colors duration-300 font-sans'}>
      
      {/* Main Body */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Elegant Controls Row */}
        <div className="flex justify-end items-center gap-3 mb-6">
          {/* Language Switcher */}
          <button
            id="lang-toggle-btn"
            onClick={() => setLang(lang === 'en' ? 'th' : 'en')}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono border border-black dark:border-zinc-700 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shadow-sm active:scale-95 text-black dark:text-zinc-200 bg-white dark:bg-[#111218]"
            title={t.languageToggle}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>{lang === 'en' ? 'TH' : 'EN'}</span>
          </button>

          {/* Theme Switcher */}
          <button
            id="theme-toggle-btn"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="px-3 py-1 text-xs font-mono border border-black dark:border-zinc-700 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shadow-sm active:scale-95 text-black dark:text-zinc-200 flex items-center gap-1.5 bg-white dark:bg-[#111218]"
            title={theme === 'light' ? t.themeDark : t.themeLight}
          >
            {theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
          </button>
        </div>
        <AnimatePresence mode="wait">
          {!activeArticle ? (
            <motion.div
              key="feed-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Wireframe Centered Block Layout */}
              <div 
                className="border-4 border-black dark:border-zinc-100 p-6 md:p-8 rounded-lg mb-8 text-center bg-white dark:bg-[#111218] shadow-lg transition-transform duration-300 hover:scale-[1.01]" 
                id="app-hero-header"
                style={theme === 'light' ? { backgroundColor: '#fffbfb' } : undefined}
              >
                <h1 
                  className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-2 uppercase select-none text-black dark:text-white"
                  style={theme === 'light' ? { color: '#000000' } : undefined}
                >
                  {t.title}
                </h1>
                <p 
                  className="font-sans text-sm sm:text-base md:text-lg font-medium text-black/80 dark:text-zinc-400 capitalize max-w-2xl mx-auto"
                  style={theme === 'light' ? { color: '#47474c' } : undefined}
                >
                  {t.subtitle}
                </p>
                <div className="h-1.5 w-16 bg-[#0066cc] dark:bg-emerald-400 mx-auto my-4 rounded-full"></div>
                <p 
                  className="text-xs sm:text-sm text-slate-500 dark:text-zinc-500 italic max-w-lg mx-auto"
                  style={theme === 'light' ? { color: '#434348' } : undefined}
                >
                  {t.tagline}
                </p>
              </div>

              {/* Action Controls Panel */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mb-6">
                
                {/* Categories Selector list (Desktop and Phone layout) */}
                <div className="md:col-span-8 overflow-x-auto scrollbar-none py-1 flex gap-2 select-none" id="categories-dock">
                  {(['All', 'Agent', 'Memory', 'MCP', 'Research'] as CategoryFilter[]).map((cat) => {
                    const active = selectedCategory === cat;
                    return (
                      <button
                        id={`cat-btn-${cat.toLowerCase()}`}
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-mono font-medium border transition-all shrink-0 active:scale-95 ${
                          active
                            ? 'bg-black border-black text-white dark:bg-white dark:border-white dark:text-[#090a0f] shadow-md scale-105'
                            : 'border-black text-black hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900'
                        }`}
                      >
                        [{cat === 'All' ? t.all : (t[cat] || cat)}]
                      </button>
                    );
                  })}
                </div>

                {/* Search bar */}
                <div className="md:col-span-4 relative">
                  <Search 
                    className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-zinc-500" 
                    style={theme === 'light' ? { color: '#1c1c1e' } : undefined}
                  />
                  <input
                    id="search-box-input"
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs py-2 pl-9 pr-4 rounded-full border border-black dark:border-zinc-800 bg-white dark:bg-[#111218] text-black dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all shadow-inner"
                    style={theme === 'light' ? { backgroundColor: '#d2d2d2', color: '#020202' } : undefined}
                  />
                </div>
              </div>

              {/* Quick Instructions & Utility Bar */}
              <div 
                className="mb-6 flex flex-wrap items-center justify-end gap-3 p-3 bg-white dark:bg-[#111218] border border-black dark:border-zinc-800 rounded-lg"
                style={theme === 'light' ? { backgroundColor: '#e5e5e5' } : undefined}
              >
                <div className="flex gap-2">
                  <button
                    id="update-news-btn"
                    onClick={handleUpdateNews}
                    disabled={isLoadingArticles}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-black text-white hover:bg-zinc-900/80 dark:bg-emerald-400 dark:text-[#090a0f] dark:hover:bg-emerald-300 text-[11px] font-mono border border-black dark:border-emerald-400 transition-all disabled:opacity-50 active:scale-95 cursor-pointer shadow-md font-semibold"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingArticles ? 'animate-spin' : ''}`} />
                    <span>{lang === 'en' ? 'REFRESH' : 'รีเฟรช'}</span>
                  </button>
                </div>
              </div>

              {/* Wireframe Separator */}
              <hr className="border-dashed border-zinc-300 dark:border-zinc-800 mb-8" />

              {/* Feed List Section */}
              <div className="space-y-8" id="news-stream">
                <AnimatePresence mode="popLayout">
                  {filteredArticles.length > 0 ? (
                    <>
                      {/* Today's Section */}
                      {todayArticles.length > 0 && (
                        <div className="space-y-4">
                          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-zinc-400 flex items-center gap-2 mb-2 select-none">
                            <Clock className="h-3.5 w-3.5 text-[#0066cc] dark:text-emerald-400" />
                            <span>{lang === 'en' ? "Today's Summaries" : "บทสรุปข่าววันนี้"}</span>
                            <span className="text-[10px] font-normal text-slate-500">({todayArticles.length})</span>
                          </h2>
                          <div className="space-y-6">
                            {todayArticles.map((article) => renderArticle(article))}
                          </div>
                        </div>
                      )}

                      {/* Divider if both exist */}
                      {todayArticles.length > 0 && olderArticles.length > 0 && (
                        <hr className="border-dashed border-zinc-200 dark:border-zinc-800 my-8" />
                      )}

                      {/* Older Section */}
                      {olderArticles.length > 0 && (
                        <div className="space-y-4">
                          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-zinc-400 flex items-center gap-2 mb-2 select-none">
                            <Calendar className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                            <span>{lang === 'en' ? "Older Summaries" : "บทสรุปข่าวที่ผ่านมา"}</span>
                            <span className="text-[10px] font-normal text-slate-500">({olderArticles.length})</span>
                          </h2>
                          <div className="space-y-6">
                            {olderArticles.map((article) => renderArticle(article))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12 border-2 border-dashed border-black dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-[#111218]/50"
                      style={theme === 'light' ? { backgroundColor: '#FFFBFB' } : undefined}
                    >
                      <Info className="h-10 w-10 text-slate-400 dark:text-zinc-600 mx-auto mb-3" />
                      <p 
                        className="text-xs font-mono text-slate-500 dark:text-zinc-400"
                        style={theme === 'light' ? { color: '#000000' } : undefined}
                      >
                        {t.noArticles}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="article-details"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="w-full bg-white dark:bg-[#121319] border-2 border-black dark:border-zinc-200 rounded-lg p-6 md:p-8 relative"
              style={theme === 'light' ? { backgroundColor: '#FFFBFB', color: '#000000' } : undefined}
            >
              {/* Back button top-left */}
              <button
                id="close-back-btn"
                onClick={() => setActiveArticle(null)}
                className="mb-5 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono border border-black dark:border-zinc-700 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shadow-sm active:scale-95 text-black dark:text-zinc-200"
                style={theme === 'light' ? { backgroundColor: '#c3c2c2', color: '#000000', borderColor: '#71717a' } : undefined}
              >
                ← {t.backToFeed}
              </button>

              <div className="h-1" />

              {/* Left indicators category tags */}
              <span 
                className="inline-block text-[10px] font-mono px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-[#121319] text-indigo-700 dark:text-indigo-300 uppercase mb-3"
                style={(() => {
                  if (theme !== 'light') return undefined;
                  const cat = activeArticle.category;
                  if (cat === 'Agent') {
                    return { backgroundColor: '#01acf4', color: '#183c48', borderColor: '#01acf4' };
                  }
                  if (cat === 'Memory') {
                    return { backgroundColor: '#786efb', color: '#10111c', borderColor: '#786efb' };
                  }
                  if (cat === 'MCP') {
                    const bg = activeArticle.id === 'microsoft-semantic-kernel-mcp' ? '#aa44fc' : '#a743f9';
                    const cl = activeArticle.id === 'microsoft-semantic-kernel-mcp' ? '#100d11' : '#171119';
                    return { backgroundColor: bg, color: cl, borderColor: bg };
                  }
                  const bg = '#d6843d';
                  const cl = activeArticle.id === 'autonomous-mcp-agent-market' ? '#110e05' : '#050401';
                  return { backgroundColor: bg, color: cl, borderColor: bg };
                })()}
              >
                {activeArticle.category}
              </span>

              <h3 
                className="font-display text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-black dark:text-white mb-2 leading-snug"
                style={theme === 'light' ? { color: '#000000' } : undefined}
              >
                {lang === 'en' ? activeArticle.titleEn : activeArticle.titleTh}
              </h3>

              {/* Live Modal Translation Switcher */}
              <div className="flex items-center justify-between border-b border-dashed border-black dark:border-zinc-800 pb-3 mb-4">
                <div 
                  className="text-[10px] font-mono text-black/80 dark:text-zinc-500 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4"
                  style={theme === 'light' ? { color: '#000000' } : undefined}
                >
                  <span style={theme === 'light' ? { color: '#000000' } : undefined}>{t.published}: {activeArticle.publishedDate}</span>
                  <span className="hidden sm:inline">-</span>
                  <span style={theme === 'light' ? { color: '#000000' } : undefined}>{t.summarized}: {activeArticle.summarizedTime}</span>
                </div>
              </div>



              {activeArticle.imageUrl && (
                <div className="w-full max-h-[450px] overflow-hidden rounded-lg border border-black dark:border-zinc-800 mb-6 bg-zinc-50 dark:bg-zinc-950/20 flex justify-center items-center">
                  <img 
                    src={activeArticle.imageUrl} 
                    alt={lang === 'en' ? activeArticle.titleEn : activeArticle.titleTh}
                    className="w-full max-h-[450px] object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Executive Summary Section */}
              <div className="p-4 rounded-lg bg-[#0066cc]/5 dark:bg-emerald-500/5 border-2 border-black dark:border-zinc-800/80 mb-6">
                <h4 
                  className="font-mono text-[11px] font-bold text-[#0066cc] dark:text-emerald-400 tracking-wider uppercase mb-2 flex items-center gap-1.5"
                  style={theme === 'light' ? { color: '#0066cc' } : undefined}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {t.execSummary}
                </h4>
                <p 
                  className="text-xs sm:text-sm text-black/90 dark:text-zinc-200 leading-relaxed font-sans font-medium"
                  style={theme === 'light' ? { color: '#000000' } : undefined}
                >
                  {lang === 'en' ? activeArticle.executiveSummaryEn : activeArticle.executiveSummaryTh}
                </p>
              </div>

              {/* Key Highlights & Thailand Relevance Section */}
              <div className="space-y-4 mb-6">
                <h4 
                  className="font-mono text-[11px] font-bold text-[#0066cc] dark:text-emerald-400 tracking-wider uppercase flex items-center gap-1.5"
                  style={theme === 'light' ? { color: '#0066cc' } : undefined}
                >
                  <Layers className="h-3.5 w-3.5" />
                  {t.keyHighlights}
                </h4>

                <div className="grid gap-4">
                  {(lang === 'en' ? activeArticle.keyHighlightsEn : activeArticle.keyHighlightsTh).map((highlight: HighlightBullet, idx: number) => (
                    <div
                      id={`highlight-row-${idx}`}
                      key={idx}
                      className="bg-white dark:bg-zinc-900/30 p-4 rounded-lg border border-black dark:border-zinc-800/80 hover:border-black/50 dark:hover:border-zinc-700/60 transition-all flex flex-col gap-3"
                      style={theme === 'light' ? { backgroundColor: '#FFFBFB', borderColor: '#000000' } : undefined}
                    >
                      <div className="flex gap-3 items-start">
                        <div className="h-5 w-5 rounded-full bg-[#0066cc]/10 dark:bg-emerald-500/10 text-[#0066cc] dark:text-emerald-400 flex items-center justify-center shrink-0 text-xs font-mono font-bold mt-0.5">
                          {idx + 1}
                        </div>
                        <div>
                          <h5 
                            className="text-xs sm:text-sm font-bold text-black dark:text-white leading-tight mb-1.5"
                            style={theme === 'light' ? { color: '#000000' } : undefined}
                          >
                            {highlight.title}
                          </h5>
                          <p 
                            className="text-xs text-black/85 dark:text-zinc-300 leading-relaxed font-sans"
                            style={theme === 'light' ? { color: '#2b2b2f' } : undefined}
                          >
                            {highlight.desc}
                          </p>
                        </div>
                      </div>
                      
                      {/* Thailand Relevance Context Callout */}
                      {highlight.thailandRelevance && (
                        <div className="mt-1 bg-amber-500/5 dark:bg-emerald-500/5 border-l-2 border-[#0066cc] dark:border-emerald-500 p-2.5 rounded-r text-[11px] leading-relaxed">
                          <span className="font-bold text-[#0066cc] dark:text-emerald-400 uppercase tracking-wider block mb-0.5 text-[9px] font-mono">
                            ✦ {t.thaiPerspectiveLabel}
                          </span>
                          <span 
                            className="text-black/80 dark:text-zinc-300 font-medium"
                            style={theme === 'light' ? { color: '#3c3c43' } : undefined}
                          >
                            {highlight.thailandRelevance}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Trends & Overview Section */}
              <div className="space-y-3 mb-6 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/10 border border-black/10 dark:border-zinc-800/40">
                <h4 
                  className="font-mono text-[11px] font-bold text-[#0066cc] dark:text-emerald-400 tracking-wider uppercase flex items-center gap-1.5"
                  style={theme === 'light' ? { color: '#0066cc' } : undefined}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  {t.trendsOverview}
                </h4>

                <ul className="space-y-2 text-xs text-black/90 dark:text-zinc-400" id="trends-list">
                  {(lang === 'en' ? activeArticle.trendsOverviewEn : activeArticle.trendsOverviewTh).map((trend: string, idx: number) => (
                    <li 
                      key={idx} 
                      className="flex items-start gap-2.5"
                      style={theme === 'light' ? { color: '#000000' } : undefined}
                    >
                      <span 
                        className="text-[#0066cc] dark:text-emerald-400 select-none font-bold mt-0.5"
                        style={theme === 'light' ? { color: '#0066cc' } : undefined}
                      >▪</span>
                      <span 
                        className="leading-relaxed font-sans font-medium text-black/90 dark:text-zinc-300"
                        style={theme === 'light' ? { color: '#000000' } : undefined}
                      >{trend}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Back to feed closing actions */}
              <div className="border-t border-black dark:border-zinc-800 pt-4 flex flex-wrap items-center justify-between gap-3">
                {activeArticle.originalSourceUrl ? (
                  <a
                    id="source-redirect-btn"
                    href={activeArticle.originalSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    onMouseEnter={() => setIsRedirectHovered(true)}
                    onMouseLeave={() => setIsRedirectHovered(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-black dark:border-zinc-700 font-mono text-xs text-black dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all"
                    style={theme === 'light' ? { color: isRedirectHovered ? '#ffffff' : '#000000', borderColor: '#000000', backgroundColor: isRedirectHovered ? '#000000' : 'transparent' } : undefined}
                  >
                    <span>{t.readOriginalSource}</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                ) : (
                  <div />
                )}

                <button
                  id="close-modal-bottom-btn"
                  onClick={() => {
                    setSelectedCategory('All');
                    setSearchQuery('');
                    setActiveArticle(null);
                  }}
                  onMouseEnter={() => setIsBottomCloseHovered(true)}
                  onMouseLeave={() => setIsBottomCloseHovered(false)}
                  className="px-4 py-2 rounded bg-black dark:bg-zinc-100 text-white dark:text-[#090a0f] hover:bg-zinc-950 dark:hover:bg-zinc-200 text-xs font-mono tracking-wider uppercase shadow cursor-pointer transition-all active:scale-95"
                  style={theme === 'light' ? { backgroundColor: isBottomCloseHovered ? '#ffffff' : '#c3c2c2', color: '#020202', borderColor: '#71717a', borderWidth: '1px', borderStyle: 'solid' } : undefined}
                >
                  [ {t.backToHome} ]
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer info brand elements */}
      <footer 
        className="mt-16 border-t border-black dark:border-zinc-800 bg-white dark:bg-[#0c0d13]/80 py-8 select-none"
        style={theme === 'light' ? { backgroundColor: '#FFFBFB' } : undefined}
      >
        <div className="max-w-4xl mx-auto px-4 text-center font-mono text-[10px] sm:text-xs text-slate-500 dark:text-[#a1a1aa] space-y-2">
          <p>
            Agentic AI News © 2026. Designed with meticulous responsive layout grids.
          </p>
          <div className="flex justify-center gap-4 text-[10px] opacity-75">
            <span>[ All-Day Dark & Light Comfortable Spectrum ]</span>
            <span>-</span>
            <span>[ Verified by Google AI Studio ]</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
