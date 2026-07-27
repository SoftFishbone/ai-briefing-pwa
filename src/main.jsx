import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const fallbackNews = {
  updatedAt: '2026-07-26T08:00:00+08:00',
  items: []
};

const navItems = [
  { id: 'home', label: '今日', icon: '⌂' },
  { id: 'trends', label: '趋势', icon: '↗' },
  { id: 'saved', label: '收藏', icon: '☆' },
  { id: 'settings', label: '我的', icon: '○' }
];

function formatDate(value) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(value));
}

function formatTime(value) {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function IconButton({ label, children, onClick, active = false }) {
  return <button aria-label={label} className={`icon-button ${active ? 'is-active' : ''}`} onClick={onClick}>{children}</button>;
}

function NewsRow({ item, onOpen, onSave, saved }) {
  return (
    <article className="news-row" onClick={() => onOpen(item)}>
      <div className="news-row-top">
        <span className="eyebrow">{item.region} · {item.category}</span>
        <IconButton label={saved ? '取消收藏' : '收藏'} active={saved} onClick={(event) => { event.stopPropagation(); onSave(item.id); }}>
          {saved ? '★' : '☆'}
        </IconButton>
      </div>
      <h3>{item.title}</h3>
      <p className="summary">{item.summary}</p>
      <div className="row-meta"><span>{item.source}</span><span>{formatTime(item.publishedAt)}</span></div>
    </article>
  );
}

function Home({ items, updatedAt, savedIds, onOpen, onSave }) {
  const featured = items[0];
  return (
    <main className="page home-page">
      <header className="masthead">
        <div>
          <p className="kicker">DAILY BRIEFING / 01</p>
          <h1>今日 AI</h1>
        </div>
        <span className="date-stamp">{formatDate(updatedAt)}</span>
      </header>

      <section className="intro-block">
        <p className="section-label">今日简报</p>
        <div className="intro-line"><span>把重要的事读懂。</span><span className="read-time">约 5 分钟</span></div>
        <p className="muted">为正在进入 AI 行业的你，整理今天值得知道的变化。</p>
      </section>

      {featured && <section className="featured-story" onClick={() => onOpen(featured)}>
        <div className="story-index">01</div>
        <div className="story-body">
          <span className="eyebrow">{featured.region} · {featured.category}</span>
          <h2>{featured.title}</h2>
          <p>{featured.whyItMatters}</p>
          <button className="text-action" onClick={(event) => { event.stopPropagation(); onOpen(featured); }}>阅读这条 <span>↗</span></button>
        </div>
      </section>}

      <section className="list-section">
        <div className="section-heading"><h2>其余更新</h2><span>{items.length} 条</span></div>
        <div className="news-list">
          {items.slice(1).map((item) => <NewsRow key={item.id} item={item} onOpen={onOpen} onSave={onSave} saved={savedIds.includes(item.id)} />)}
        </div>
      </section>

      <p className="update-note">最后更新于 {formatTime(updatedAt)} · 自动整理自公开来源</p>
    </main>
  );
}

function Trends({ items, onOpen }) {
  const counts = items.reduce((acc, item) => { acc[item.category] = (acc[item.category] || 0) + 1; return acc; }, {});
  return <main className="page secondary-page">
    <p className="kicker">PATTERNS / 02</p><h1>趋势</h1><p className="page-lede">把零散的消息，放回正在发生的变化里。</p>
    <section className="trend-list">
      {Object.entries(counts).map(([category, count]) => <button className="trend-row" key={category} onClick={() => onOpen(items.find((item) => item.category === category))}><span>{category}</span><strong>{count.toString().padStart(2, '0')}</strong><span className="arrow">↗</span></button>)}
    </section>
    <section className="note-block"><p className="section-label">阅读建议</p><p>先读一条事实，再问自己：它会让哪些岗位、工具或学习路径发生变化？</p></section>
  </main>;
}

function Saved({ items, savedIds, onOpen, onSave }) {
  const saved = items.filter((item) => savedIds.includes(item.id));
  return <main className="page secondary-page"><p className="kicker">YOUR LIBRARY / 03</p><h1>收藏</h1><p className="page-lede">留住那些值得回头再读的内容。</p>{saved.length ? <div className="news-list saved-list">{saved.map((item) => <NewsRow key={item.id} item={item} onOpen={onOpen} onSave={onSave} saved />)}</div> : <div className="empty-state"><span>☆</span><p>还没有收藏内容</p><small>在资讯右上角点一下星标即可保存。</small></div>}</main>;
}

function Settings({ updatedAt }) {
  return <main className="page secondary-page"><p className="kicker">PERSONAL / 04</p><h1>我的</h1><p className="page-lede">为自己保留一个安静、可靠的入口。</p><section className="settings-list"><div><span>更新频率</span><strong>每天一次</strong></div><div><span>内容范围</span><strong>国内外 AI 行业</strong></div><div><span>数据状态</span><strong>已更新 {formatTime(updatedAt)}</strong></div></section><section className="note-block"><p className="section-label">关于</p><p>今日 AI 是一个个人学习工具，帮助你在碎片时间里建立对 AI 行业的连续理解。</p></section></main>;
}

function Detail({ item, onBack, onSave, saved }) {
  if (!item) return null;
  return <main className="page detail-page"><button className="back-button" onClick={onBack}>← 返回</button><div className="detail-meta"><span>{item.region} · {item.category}</span><span>{formatDate(item.publishedAt)} {formatTime(item.publishedAt)}</span></div><h1>{item.title}</h1><p className="detail-summary">{item.summary}</p><div className="detail-rule"/><section className="detail-section"><p className="section-label">为什么重要</p><p>{item.whyItMatters}</p></section><section className="detail-section"><p className="section-label">建议了解</p><div className="keyword-list">{item.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</div></section><div className="detail-actions"><button className="primary-button" onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}>阅读原文 ↗</button><button className={`save-button ${saved ? 'is-saved' : ''}`} onClick={() => onSave(item.id)}>{saved ? '已收藏 ★' : '收藏 ☆'}</button></div><p className="source-note">来源：{item.source} · 内容由公开来源自动整理</p></main>;
}

function App() {
  const [news, setNews] = useState(fallbackNews);
  const [page, setPage] = useState('home');
  const [selected, setSelected] = useState(null);
  const [savedIds, setSavedIds] = useState(() => JSON.parse(localStorage.getItem('ai-briefing-saved') || '[]'));

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}news.json`).then((response) => response.ok ? response.json() : fallbackNews).then(setNews).catch(() => setNews(fallbackNews));
  }, []);

  useEffect(() => localStorage.setItem('ai-briefing-saved', JSON.stringify(savedIds)), [savedIds]);

  const items = useMemo(() => news.items || [], [news]);
  const save = (id) => setSavedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const open = (item) => { setSelected(item); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  let content = <Home items={items} updatedAt={news.updatedAt} savedIds={savedIds} onOpen={open} onSave={save} />;
  if (page === 'trends') content = <Trends items={items} onOpen={open} />;
  if (page === 'saved') content = <Saved items={items} savedIds={savedIds} onOpen={open} onSave={save} />;
  if (page === 'settings') content = <Settings updatedAt={news.updatedAt} />;
  if (selected) content = <Detail item={selected} onBack={() => setSelected(null)} onSave={save} saved={savedIds.includes(selected.id)} />;

  return <div className="app-shell"><div className="app-content">{content}</div>{!selected && <nav className="bottom-nav" aria-label="主导航">{navItems.map((item) => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}><span className="nav-icon">{item.icon}</span><span>{item.label}</span></button>)}</nav>}</div>;
}

createRoot(document.getElementById('root')).render(<App />);
