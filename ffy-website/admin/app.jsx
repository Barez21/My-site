/* ══════════════════════════════════════════
   FFY CMS — React Components
   ══════════════════════════════════════════
   Transpiled at runtime by Babel standalone.
   Depends on: registry.js (BLOCK_REGISTRY, renderPageHTML, loadPages, savePages, generateId)
   ══════════════════════════════════════════ */

const { useState, useEffect, useRef } = React;


// ═══════════════════════════════════
//  FIELD RENDERER
// ═══════════════════════════════════
// Renders a single form field based on schema type.
// To add new field types, add a case here.

function FieldRenderer({ field, value, onChange }) {
  switch (field.type) {
    case 'text':
      return <div className="adm-field">
        <label className="adm-label">{field.label}</label>
        <input className="adm-input" value={value || ''} onChange={e => onChange(e.target.value)} />
        {field.hint && <div className="adm-hint">{field.hint}</div>}
      </div>;

    case 'textarea':
      return <div className="adm-field">
        <label className="adm-label">{field.label}</label>
        <textarea className="adm-textarea" value={value || ''} onChange={e => onChange(e.target.value)} />
        {field.hint && <div className="adm-hint">{field.hint}</div>}
      </div>;

    case 'url':
      return <div className="adm-field">
        <label className="adm-label">{field.label}</label>
        <input className="adm-input" type="url" value={value || ''} placeholder="https://..." onChange={e => onChange(e.target.value)} />
        {field.hint && <div className="adm-hint">{field.hint}</div>}
      </div>;

    case 'select':
      return <div className="adm-field">
        <label className="adm-label">{field.label}</label>
        <select className="adm-select" value={value || ''} onChange={e => onChange(e.target.value)}>
          {field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>;

    case 'toggle':
      return <div className="adm-field">
        <label style={{display:'flex',alignItems:'center',gap:'0.5rem',cursor:'pointer'}}>
          <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />
          <span className="adm-label" style={{margin:0}}>{field.label}</span>
        </label>
      </div>;

    default:
      return null;
  }
}


// ═══════════════════════════════════
//  BLOCK ITEM
// ═══════════════════════════════════

function BlockItem({ block, index, total, editing, onToggle, onChange, onMove, onDelete }) {
  const reg = BLOCK_REGISTRY[block.type];
  if (!reg) return null;

  const title = block.props.heading
    || block.props.label
    || block.props.title
    || (block.props.text && block.props.text.substring(0, 40))
    || (block.props.code && block.props.code.substring(0, 40))
    || reg.label;

  return (
    <div className={`adm-block-item ${editing ? 'editing' : ''}`}>
      <div className="adm-block-head" onClick={onToggle}>
        <span className="adm-block-handle">⋮⋮</span>
        <span className="adm-block-type">{reg.label}</span>
        <span className="adm-block-title">{title}</span>
        <div className="adm-block-actions" onClick={e => e.stopPropagation()}>
          {index > 0 && <button title="Nahoru" onClick={() => onMove(index, index - 1)}>↑</button>}
          {index < total - 1 && <button title="Dolů" onClick={() => onMove(index, index + 1)}>↓</button>}
          <button title="Smazat" style={{color:'var(--adm-danger)'}} onClick={() => onDelete(index)}>✕</button>
        </div>
      </div>
      <div className="adm-block-body">
        {reg.schema.map(field => (
          <FieldRenderer
            key={field.key}
            field={field}
            value={block.props[field.key]}
            onChange={val => onChange(index, field.key, val)}
          />
        ))}
      </div>
    </div>
  );
}


// ═══════════════════════════════════
//  ADD BLOCK MENU
// ═══════════════════════════════════

function AddBlockMenu({ onAdd }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="adm-add-wrap">
      {open && (
        <div className="adm-add-menu">
          {Object.entries(BLOCK_REGISTRY).map(([type, reg]) => (
            <button key={type} className="adm-add-option" onClick={() => { onAdd(type); setOpen(false); }}>
              {reg.label}
              <span>{reg.description}</span>
            </button>
          ))}
        </div>
      )}
      <button className="adm-btn adm-btn-secondary" onClick={() => setOpen(!open)}>
        + Přidat blok
      </button>
    </div>
  );
}


// ═══════════════════════════════════
//  META EDITOR
// ═══════════════════════════════════

function MetaEditor({ meta, onChange }) {
  const set = (key, val) => onChange({ ...meta, [key]: val });

  return (
    <div>
      <div className="adm-field">
        <label className="adm-label">Title tag</label>
        <input className="adm-input" value={meta.title || ''} onChange={e => set('title', e.target.value)} />
        <div className="adm-hint">{(meta.title || '').length} / 60 znaků</div>
      </div>
      <div className="adm-field">
        <label className="adm-label">Meta description</label>
        <textarea className="adm-textarea" style={{minHeight:'70px'}} value={meta.description || ''} onChange={e => set('description', e.target.value)} />
        <div className="adm-hint">{(meta.description || '').length} / 160 znaků</div>
      </div>
      <div className="adm-field">
        <label className="adm-label">Slug (název souboru)</label>
        <input className="adm-input" value={meta.slug || ''} onChange={e => set('slug', e.target.value)} />
        <div className="adm-hint">Bez .html, bez diakritiky. Např: jak-energobanking</div>
      </div>
      <div className="adm-field">
        <label className="adm-label">Canonical URL</label>
        <input className="adm-input" value={meta.canonical || ''} onChange={e => set('canonical', e.target.value)} />
      </div>
      <div className="adm-field">
        <label className="adm-label">Robots</label>
        <select className="adm-select" value={meta.robots || 'index, follow'} onChange={e => set('robots', e.target.value)}>
          <option value="index, follow">index, follow</option>
          <option value="noindex, nofollow">noindex, nofollow</option>
          <option value="noindex, follow">noindex, follow</option>
        </select>
      </div>
    </div>
  );
}


// ═══════════════════════════════════
//  PREVIEW PANEL
// ═══════════════════════════════════

function PreviewPanel({ page }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!iframeRef.current || !page) return;
    const html = renderPageHTML(page);
    const blob = new Blob([html], { type: 'text/html' });
    iframeRef.current.src = URL.createObjectURL(blob);
  }, [page, page && JSON.stringify(page.blocks), page && JSON.stringify(page.meta)]);

  if (!page) {
    return (
      <div className="adm-empty">
        <div className="adm-empty-icon">👁</div>
        <div className="adm-empty-text">Vyber stránku pro náhled</div>
      </div>
    );
  }

  return <iframe ref={iframeRef} className="adm-preview-frame" />;
}


// ═══════════════════════════════════
//  EXPORT
// ═══════════════════════════════════

function exportPage(page) {
  const html = renderPageHTML(page);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (page.meta.slug || 'stranka') + '.html';
  a.click();
  URL.revokeObjectURL(url);
}


// ═══════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════

function App() {
  const [pages, setPages] = useState(loadPages);
  const [activePageId, setActivePageId] = useState(null);
  const [activeTab, setActiveTab] = useState('blocks');
  const [editingBlock, setEditingBlock] = useState(null);
  const [showPreview, setShowPreview] = useState(true);

  const activePage = pages.find(p => p.id === activePageId);

  // Auto-save on every change
  useEffect(() => { savePages(pages); }, [pages]);

  // ── Page CRUD ──

  function createPage() {
    const page = {
      id: generateId(),
      meta: {
        title: 'Nová stránka — FREE for YOU',
        description: '',
        slug: 'nova-stranka',
        canonical: '',
        robots: 'index, follow'
      },
      blocks: [
        { id: generateId(), type: 'page_header', props: { ...BLOCK_REGISTRY.page_header.defaults } },
      ]
    };
    setPages([...pages, page]);
    setActivePageId(page.id);
    setActiveTab('blocks');
  }

  function deletePage(id) {
    if (!confirm('Opravdu smazat tuto stránku? Tato akce je nevratná.')) return;
    setPages(pages.filter(p => p.id !== id));
    if (activePageId === id) setActivePageId(null);
  }

  function updatePage(updated) {
    setPages(pages.map(p => p.id === updated.id ? updated : p));
  }

  // ── Block operations ──

  function addBlock(type) {
    if (!activePage) return;
    const reg = BLOCK_REGISTRY[type];
    const block = { id: generateId(), type, props: { ...reg.defaults } };
    updatePage({ ...activePage, blocks: [...activePage.blocks, block] });
    setEditingBlock(block.id);
  }

  function updateBlockProp(blockIndex, key, value) {
    if (!activePage) return;
    const blocks = [...activePage.blocks];
    blocks[blockIndex] = {
      ...blocks[blockIndex],
      props: { ...blocks[blockIndex].props, [key]: value }
    };
    updatePage({ ...activePage, blocks });
  }

  function moveBlock(from, to) {
    if (!activePage) return;
    const blocks = [...activePage.blocks];
    const [moved] = blocks.splice(from, 1);
    blocks.splice(to, 0, moved);
    updatePage({ ...activePage, blocks });
  }

  function deleteBlock(index) {
    if (!activePage) return;
    updatePage({
      ...activePage,
      blocks: activePage.blocks.filter((_, i) => i !== index)
    });
    setEditingBlock(null);
  }

  // ── Render ──

  return (
    <div className={`adm-layout ${showPreview ? '' : 'preview-hidden'}`}>

      {/* ── Sidebar ── */}
      <div className="adm-sidebar">
        <div className="adm-sidebar-head">
          <div className="adm-sidebar-title">FFY Builder</div>
          <button className="adm-btn adm-btn-primary adm-btn-sm" onClick={createPage}>+ Nová</button>
        </div>
        <div className="adm-sidebar-list">
          {pages.length === 0 && (
            <div style={{padding:'2rem 1rem',textAlign:'center',color:'var(--adm-text3)',fontSize:'0.82rem'}}>
              Zatím žádné stránky.<br/>Klikni „+ Nová" pro začátek.
            </div>
          )}
          {pages.map(page => (
            <div
              key={page.id}
              className={`adm-page-item ${page.id === activePageId ? 'active' : ''}`}
              onClick={() => { setActivePageId(page.id); setActiveTab('blocks'); setEditingBlock(null); }}
            >
              <div>
                <div className="adm-page-name">
                  {(page.meta.title || 'Bez názvu').split('—')[0].split('|')[0].trim()}
                </div>
                <div className="adm-page-slug">
                  {page.meta.slug || '—'}.html
                  {page.source === 'existing' && <span style={{marginLeft:'0.4rem',color:'var(--adm-accent)',fontSize:'0.58rem',fontWeight:700,letterSpacing:'0.05em'}}>EDITOVATELNÁ</span>}
                  {page.source === 'managed' && <span style={{marginLeft:'0.4rem',color:'var(--adm-text3)',fontSize:'0.58rem',fontWeight:700,letterSpacing:'0.05em'}}>POUZE META</span>}
                </div>
              </div>
              <button
                className="adm-page-del"
                onClick={e => { e.stopPropagation(); deletePage(page.id); }}
              >✕</button>
            </div>
          ))}
        </div>
        <div style={{padding:'0.75rem',borderTop:'1px solid var(--adm-border)',flexShrink:0}}>
          <button className="adm-btn adm-btn-sm" style={{width:'100%',justifyContent:'center',fontSize:'0.68rem',color:'var(--adm-text3)'}} onClick={() => {
            if (confirm('Resetovat na výchozí stav? Všechny změny budou ztraceny.')) {
              localStorage.removeItem('ffy-cms-pages');
              setPages(loadPages());
              setActivePageId(null);
            }
          }}>↻ Reset na výchozí</button>
        </div>
      </div>

      {/* ── Editor ── */}
      <div className="adm-editor">
        {activePage ? (
          <>
            <div className="adm-editor-head">
              <button className={`adm-tab ${activeTab === 'blocks' ? 'active' : ''}`} onClick={() => setActiveTab('blocks')}>
                Bloky
              </button>
              <button className={`adm-tab ${activeTab === 'meta' ? 'active' : ''}`} onClick={() => setActiveTab('meta')}>
                Meta / SEO
              </button>
              <div className="adm-tab-spacer" />
              <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={() => setShowPreview(!showPreview)}>
                {showPreview ? 'Skrýt náhled' : 'Náhled'}
              </button>
              <button className="adm-btn adm-btn-primary adm-btn-sm" onClick={() => exportPage(activePage)}>
                ↓ Export HTML
              </button>
            </div>

            <div className="adm-editor-body">
              {activeTab === 'blocks' && (
                <>
                  {activePage.blocks.length === 0 && (
                    <div className="adm-blocks-empty">Stránka je prázdná. Přidejte první blok.</div>
                  )}
                  {activePage.blocks.map((block, i) => (
                    <BlockItem
                      key={block.id}
                      block={block}
                      index={i}
                      total={activePage.blocks.length}
                      editing={editingBlock === block.id}
                      onToggle={() => setEditingBlock(editingBlock === block.id ? null : block.id)}
                      onChange={updateBlockProp}
                      onMove={moveBlock}
                      onDelete={deleteBlock}
                    />
                  ))}
                  <AddBlockMenu onAdd={addBlock} />
                </>
              )}
              {activeTab === 'meta' && (
                <MetaEditor
                  meta={activePage.meta}
                  onChange={meta => updatePage({ ...activePage, meta })}
                />
              )}
            </div>
          </>
        ) : (
          <div className="adm-empty">
            <div className="adm-empty-icon">📄</div>
            <div className="adm-empty-text">Vyber stránku nebo vytvoř novou</div>
          </div>
        )}
      </div>

      {/* ── Preview ── */}
      {showPreview && (
        <div className="adm-preview">
          <div className="adm-preview-head">
            <span className="adm-preview-label">Náhled</span>
          </div>
          <PreviewPanel page={activePage} />
        </div>
      )}
    </div>
  );
}

// Mount
ReactDOM.createRoot(document.getElementById('admin-root')).render(<App />);
