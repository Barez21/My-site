/* ══════════════════════════════════════════
   FFY CMS — React Components
   ══════════════════════════════════════════
   Transpiled at runtime by Babel standalone.
   Depends on: registry.js (BLOCK_REGISTRY, renderPageHTML, loadPages, savePages, generateId)
   ══════════════════════════════════════════ */

const {
  useState,
  useEffect,
  useRef
} = React;

// ═══════════════════════════════════
//  FIELD RENDERER
// ═══════════════════════════════════
// Renders a single form field based on schema type.
// To add new field types, add a case here.

function FieldRenderer({
  field,
  value,
  onChange
}) {
  switch (field.type) {
    case 'text':
      return /*#__PURE__*/React.createElement("div", {
        className: "adm-field"
      }, /*#__PURE__*/React.createElement("label", {
        className: "adm-label"
      }, field.label), /*#__PURE__*/React.createElement("input", {
        className: "adm-input",
        value: value || '',
        onChange: e => onChange(e.target.value)
      }), field.hint && /*#__PURE__*/React.createElement("div", {
        className: "adm-hint"
      }, field.hint));
    case 'textarea':
      return /*#__PURE__*/React.createElement("div", {
        className: "adm-field"
      }, /*#__PURE__*/React.createElement("label", {
        className: "adm-label"
      }, field.label), /*#__PURE__*/React.createElement("textarea", {
        className: "adm-textarea",
        value: value || '',
        onChange: e => onChange(e.target.value)
      }), field.hint && /*#__PURE__*/React.createElement("div", {
        className: "adm-hint"
      }, field.hint));
    case 'url':
      return /*#__PURE__*/React.createElement("div", {
        className: "adm-field"
      }, /*#__PURE__*/React.createElement("label", {
        className: "adm-label"
      }, field.label), /*#__PURE__*/React.createElement("input", {
        className: "adm-input",
        type: "url",
        value: value || '',
        placeholder: "https://...",
        onChange: e => onChange(e.target.value)
      }), field.hint && /*#__PURE__*/React.createElement("div", {
        className: "adm-hint"
      }, field.hint));
    case 'select':
      return /*#__PURE__*/React.createElement("div", {
        className: "adm-field"
      }, /*#__PURE__*/React.createElement("label", {
        className: "adm-label"
      }, field.label), /*#__PURE__*/React.createElement("select", {
        className: "adm-select",
        value: value || '',
        onChange: e => onChange(e.target.value)
      }, field.options.map(o => /*#__PURE__*/React.createElement("option", {
        key: o.value,
        value: o.value
      }, o.label))));
    case 'toggle':
      return /*#__PURE__*/React.createElement("div", {
        className: "adm-field"
      }, /*#__PURE__*/React.createElement("label", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer'
        }
      }, /*#__PURE__*/React.createElement("input", {
        type: "checkbox",
        checked: !!value,
        onChange: e => onChange(e.target.checked)
      }), /*#__PURE__*/React.createElement("span", {
        className: "adm-label",
        style: {
          margin: 0
        }
      }, field.label)));
    case 'image':
      return /*#__PURE__*/React.createElement(ImageField, {
        field: field,
        value: value,
        onChange: onChange
      });
    case 'array':
      return /*#__PURE__*/React.createElement(ArrayField, {
        field: field,
        value: value,
        onChange: onChange
      });
    default:
      return null;
  }
}

// ── Image Field ─────────────────────────
function ImageField({
  field,
  value,
  onChange
}) {
  const fileRef = useRef(null);
  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      onChange(ev.target.result);
    };
    reader.readAsDataURL(file);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "adm-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "adm-label"
  }, field.label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '0.5rem',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "adm-input",
    value: value || '',
    placeholder: "URL nebo nahrát soubor...",
    onChange: e => onChange(e.target.value),
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "adm-btn adm-btn-secondary adm-btn-sm",
    onClick: () => fileRef.current && fileRef.current.click()
  }, "📁 Nahrát"), /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "image/*",
    style: {
      display: 'none'
    },
    onChange: handleFile
  })), value && value.length > 10 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '0.5rem',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid var(--adm-border)',
      maxWidth: '200px'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: value,
    alt: "Náhled",
    style: {
      width: '100%',
      display: 'block'
    }
  })), field.hint && /*#__PURE__*/React.createElement("div", {
    className: "adm-hint"
  }, field.hint));
}

// ── Array Field ─────────────────────────
function ArrayField({
  field,
  value,
  onChange
}) {
  const items = Array.isArray(value) ? value : [];
  function addItem() {
    const blank = {};
    field.arrayFields.forEach(f => {
      blank[f.key] = '';
    });
    onChange([...items, blank]);
  }
  function removeItem(idx) {
    onChange(items.filter((_, i) => i !== idx));
  }
  function updateItem(idx, key, val) {
    const updated = items.map((item, i) => i === idx ? {
      ...item,
      [key]: val
    } : item);
    onChange(updated);
  }
  function moveItem(from, to) {
    const arr = [...items];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    onChange(arr);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "adm-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "adm-label"
  }, field.label), items.map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    style: {
      background: 'var(--adm-bg)',
      border: '1px solid var(--adm-border)',
      borderRadius: '6px',
      padding: '0.65rem',
      marginBottom: '0.4rem',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '0.4rem'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.65rem',
      color: 'var(--adm-text3)',
      fontWeight: 700
    }
  }, "#", idx + 1), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '0.2rem'
    }
  }, idx > 0 && /*#__PURE__*/React.createElement("button", {
    className: "adm-btn adm-btn-sm",
    style: {
      padding: '1px 5px',
      fontSize: '0.65rem',
      background: 'none',
      border: 'none',
      color: 'var(--adm-text3)',
      cursor: 'pointer'
    },
    onClick: () => moveItem(idx, idx - 1)
  }, "↑"), idx < items.length - 1 && /*#__PURE__*/React.createElement("button", {
    className: "adm-btn adm-btn-sm",
    style: {
      padding: '1px 5px',
      fontSize: '0.65rem',
      background: 'none',
      border: 'none',
      color: 'var(--adm-text3)',
      cursor: 'pointer'
    },
    onClick: () => moveItem(idx, idx + 1)
  }, "↓"), /*#__PURE__*/React.createElement("button", {
    className: "adm-btn adm-btn-sm",
    style: {
      padding: '1px 5px',
      fontSize: '0.65rem',
      background: 'none',
      border: 'none',
      color: 'var(--adm-danger)',
      cursor: 'pointer'
    },
    onClick: () => removeItem(idx)
  }, "✕"))), field.arrayFields.map(af => /*#__PURE__*/React.createElement("div", {
    key: af.key,
    style: {
      marginBottom: '0.4rem'
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: '0.62rem',
      color: 'var(--adm-text3)',
      display: 'block',
      marginBottom: '0.2rem'
    }
  }, af.label), af.type === 'textarea' ? /*#__PURE__*/React.createElement("textarea", {
    className: "adm-textarea",
    style: {
      minHeight: '60px',
      fontSize: '0.8rem'
    },
    value: item[af.key] || '',
    onChange: e => updateItem(idx, af.key, e.target.value)
  }) : /*#__PURE__*/React.createElement("input", {
    className: "adm-input",
    style: {
      fontSize: '0.8rem'
    },
    value: item[af.key] || '',
    onChange: e => updateItem(idx, af.key, e.target.value)
  }))))), /*#__PURE__*/React.createElement("button", {
    className: "adm-btn adm-btn-secondary adm-btn-sm",
    onClick: addItem,
    style: {
      marginTop: '0.3rem'
    }
  }, "+ Přidat položku"));
}

// ═══════════════════════════════════
//  BLOCK ITEM
// ═══════════════════════════════════

function BlockItem({
  block,
  index,
  total,
  editing,
  onToggle,
  onChange,
  onMove,
  onDelete,
  onDuplicate
}) {
  const reg = BLOCK_REGISTRY[block.type];
  if (!reg) return null;
  const title = block.props.heading || block.props.label || block.props.title || block.props.text && block.props.text.substring(0, 40) || block.props.code && block.props.code.substring(0, 40) || reg.label;
  return /*#__PURE__*/React.createElement("div", {
    className: `adm-block-item ${editing ? 'editing' : ''}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "adm-block-head",
    onClick: onToggle
  }, /*#__PURE__*/React.createElement("span", {
    className: "adm-block-handle"
  }, "⋮⋮"), /*#__PURE__*/React.createElement("span", {
    className: "adm-block-type"
  }, reg.label), /*#__PURE__*/React.createElement("span", {
    className: "adm-block-title"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "adm-block-actions",
    onClick: e => e.stopPropagation()
  }, index > 0 && /*#__PURE__*/React.createElement("button", {
    title: "Nahoru",
    onClick: () => onMove(index, index - 1)
  }, "↑"), index < total - 1 && /*#__PURE__*/React.createElement("button", {
    title: "Dolů",
    onClick: () => onMove(index, index + 1)
  }, "↓"), /*#__PURE__*/React.createElement("button", {
    title: "Duplikovat",
    onClick: () => onDuplicate(index)
  }, "⧉"), /*#__PURE__*/React.createElement("button", {
    title: "Smazat",
    style: {
      color: 'var(--adm-danger)'
    },
    onClick: () => onDelete(index)
  }, "✕"))), /*#__PURE__*/React.createElement("div", {
    className: "adm-block-body"
  }, reg.schema.map(field => /*#__PURE__*/React.createElement(FieldRenderer, {
    key: field.key,
    field: field,
    value: block.props[field.key],
    onChange: val => onChange(index, field.key, val)
  }))));
}

// ═══════════════════════════════════
//  ADD BLOCK MENU
// ═══════════════════════════════════

function AddBlockMenu({
  onAdd
}) {
  const [open, setOpen] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    className: "adm-add-wrap"
  }, open && /*#__PURE__*/React.createElement("div", {
    className: "adm-add-menu"
  }, Object.entries(BLOCK_REGISTRY).map(([type, reg]) => /*#__PURE__*/React.createElement("button", {
    key: type,
    className: "adm-add-option",
    onClick: () => {
      onAdd(type);
      setOpen(false);
    }
  }, reg.label, /*#__PURE__*/React.createElement("span", null, reg.description)))), /*#__PURE__*/React.createElement("button", {
    className: "adm-btn adm-btn-secondary",
    onClick: () => setOpen(!open)
  }, "+ Přidat blok"));
}

// ═══════════════════════════════════
//  META EDITOR
// ═══════════════════════════════════

function MetaEditor({
  meta,
  onChange
}) {
  const set = (key, val) => onChange({
    ...meta,
    [key]: val
  });
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "adm-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "adm-label"
  }, "Title tag"), /*#__PURE__*/React.createElement("input", {
    className: "adm-input",
    value: meta.title || '',
    onChange: e => set('title', e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    className: "adm-hint"
  }, (meta.title || '').length, " / 60 znaků")), /*#__PURE__*/React.createElement("div", {
    className: "adm-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "adm-label"
  }, "Meta description"), /*#__PURE__*/React.createElement("textarea", {
    className: "adm-textarea",
    style: {
      minHeight: '70px'
    },
    value: meta.description || '',
    onChange: e => set('description', e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    className: "adm-hint"
  }, (meta.description || '').length, " / 160 znaků")), /*#__PURE__*/React.createElement("div", {
    className: "adm-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "adm-label"
  }, "Slug (název souboru)"), /*#__PURE__*/React.createElement("input", {
    className: "adm-input",
    value: meta.slug || '',
    onChange: e => set('slug', e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    className: "adm-hint"
  }, "Bez .html, bez diakritiky. Např: jak-energobanking")), /*#__PURE__*/React.createElement("div", {
    className: "adm-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "adm-label"
  }, "Canonical URL"), /*#__PURE__*/React.createElement("input", {
    className: "adm-input",
    value: meta.canonical || '',
    onChange: e => set('canonical', e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    className: "adm-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "adm-label"
  }, "Robots"), /*#__PURE__*/React.createElement("select", {
    className: "adm-select",
    value: meta.robots || 'index, follow',
    onChange: e => set('robots', e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "index, follow"
  }, "index, follow"), /*#__PURE__*/React.createElement("option", {
    value: "noindex, nofollow"
  }, "noindex, nofollow"), /*#__PURE__*/React.createElement("option", {
    value: "noindex, follow"
  }, "noindex, follow"))));
}

// ═══════════════════════════════════
//  PREVIEW PANEL
// ═══════════════════════════════════

function PreviewPanel({
  page,
  siteCSS
}) {
  const iframeRef = useRef(null);
  useEffect(() => {
    if (!iframeRef.current || !page) return;
    const html = renderPageHTML(page, siteCSS);
    const blob = new Blob([html], {
      type: 'text/html'
    });
    iframeRef.current.src = URL.createObjectURL(blob);
  }, [page, siteCSS, page && JSON.stringify(page.blocks), page && JSON.stringify(page.meta), page && page.customCss]);
  if (!page) {
    return /*#__PURE__*/React.createElement("div", {
      className: "adm-empty"
    }, /*#__PURE__*/React.createElement("div", {
      className: "adm-empty-icon"
    }, "👁"), /*#__PURE__*/React.createElement("div", {
      className: "adm-empty-text"
    }, "Vyber stránku pro náhled"));
  }
  return /*#__PURE__*/React.createElement("iframe", {
    ref: iframeRef,
    className: "adm-preview-frame"
  });
}

// ═══════════════════════════════════
//  EXPORT
// ═══════════════════════════════════

function exportPage(page) {
  const html = renderPageHTML(page, ''); // Export uses <link> not inline CSS
  const blob = new Blob([html], {
    type: 'text/html;charset=utf-8'
  });
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
  const [siteCSS, setSiteCSS] = useState('');
  const activePage = pages.find(p => p.id === activePageId);

  // Fetch main site CSS on mount
  useEffect(() => {
    fetch('../styles.css').then(r => r.ok ? r.text() : '').then(css => setSiteCSS(css)).catch(() => setSiteCSS(''));
  }, []);

  // Auto-save on every change
  useEffect(() => {
    savePages(pages);
  }, [pages]);

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
      blocks: [{
        id: generateId(),
        type: 'page_header',
        props: {
          ...BLOCK_REGISTRY.page_header.defaults
        }
      }]
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
    const block = {
      id: generateId(),
      type,
      props: {
        ...reg.defaults
      }
    };
    updatePage({
      ...activePage,
      blocks: [...activePage.blocks, block]
    });
    setEditingBlock(block.id);
  }
  function updateBlockProp(blockIndex, key, value) {
    if (!activePage) return;
    const blocks = [...activePage.blocks];
    blocks[blockIndex] = {
      ...blocks[blockIndex],
      props: {
        ...blocks[blockIndex].props,
        [key]: value
      }
    };
    updatePage({
      ...activePage,
      blocks
    });
  }
  function moveBlock(from, to) {
    if (!activePage) return;
    const blocks = [...activePage.blocks];
    const [moved] = blocks.splice(from, 1);
    blocks.splice(to, 0, moved);
    updatePage({
      ...activePage,
      blocks
    });
  }
  function deleteBlock(index) {
    if (!activePage) return;
    updatePage({
      ...activePage,
      blocks: activePage.blocks.filter((_, i) => i !== index)
    });
    setEditingBlock(null);
  }
  function duplicateBlock(index) {
    if (!activePage) return;
    const original = activePage.blocks[index];
    const copy = {
      id: generateId(),
      type: original.type,
      props: JSON.parse(JSON.stringify(original.props))
    };
    const blocks = [...activePage.blocks];
    blocks.splice(index + 1, 0, copy);
    updatePage({
      ...activePage,
      blocks
    });
    setEditingBlock(copy.id);
  }
  function duplicatePage(id) {
    const original = pages.find(p => p.id === id);
    if (!original) return;
    const copy = JSON.parse(JSON.stringify(original));
    copy.id = generateId();
    copy.meta.title = copy.meta.title + ' (kopie)';
    copy.meta.slug = copy.meta.slug + '-kopie';
    copy.source = undefined;
    copy.blocks.forEach(b => {
      b.id = generateId();
    });
    setPages([...pages, copy]);
    setActivePageId(copy.id);
  }

  // ── Render ──

  return /*#__PURE__*/React.createElement("div", {
    className: `adm-layout ${showPreview ? '' : 'preview-hidden'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "adm-sidebar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "adm-sidebar-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "adm-sidebar-title"
  }, "FFY Builder"), /*#__PURE__*/React.createElement("button", {
    className: "adm-btn adm-btn-primary adm-btn-sm",
    onClick: createPage
  }, "+ Nová")), /*#__PURE__*/React.createElement("div", {
    className: "adm-sidebar-list"
  }, pages.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '2rem 1rem',
      textAlign: 'center',
      color: 'var(--adm-text3)',
      fontSize: '0.82rem'
    }
  }, "Zatím žádné stránky.", /*#__PURE__*/React.createElement("br", null), "Klikni „+ Nová\" pro začátek."), pages.map(page => /*#__PURE__*/React.createElement("div", {
    key: page.id,
    className: `adm-page-item ${page.id === activePageId ? 'active' : ''}`,
    onClick: () => {
      setActivePageId(page.id);
      setActiveTab('blocks');
      setEditingBlock(null);
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "adm-page-name"
  }, (page.meta.title || 'Bez názvu').split('—')[0].split('|')[0].trim()), /*#__PURE__*/React.createElement("div", {
    className: "adm-page-slug"
  }, page.meta.slug || '—', ".html", page.source === 'existing' && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: '0.4rem',
      color: 'var(--adm-text3)',
      fontSize: '0.58rem',
      fontWeight: 600,
      letterSpacing: '0.05em'
    }
  }, "WEB"))), /*#__PURE__*/React.createElement("button", {
    className: "adm-page-del",
    onClick: e => {
      e.stopPropagation();
      deletePage(page.id);
    }
  }, "✕")))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0.75rem',
      borderTop: '1px solid var(--adm-border)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "adm-btn adm-btn-sm",
    style: {
      width: '100%',
      justifyContent: 'center',
      fontSize: '0.68rem',
      color: 'var(--adm-text3)'
    },
    onClick: () => {
      if (confirm('Resetovat na výchozí stav? Všechny změny budou ztraceny.')) {
        localStorage.removeItem('ffy-cms-pages');
        setPages(loadPages());
        setActivePageId(null);
      }
    }
  }, "↻ Reset na výchozí"))), /*#__PURE__*/React.createElement("div", {
    className: "adm-editor"
  }, activePage ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "adm-editor-head"
  }, /*#__PURE__*/React.createElement("button", {
    className: `adm-tab ${activeTab === 'blocks' ? 'active' : ''}`,
    onClick: () => setActiveTab('blocks')
  }, "Bloky"), /*#__PURE__*/React.createElement("button", {
    className: `adm-tab ${activeTab === 'meta' ? 'active' : ''}`,
    onClick: () => setActiveTab('meta')
  }, "Meta / SEO"), /*#__PURE__*/React.createElement("button", {
    className: `adm-tab ${activeTab === 'css' ? 'active' : ''}`,
    onClick: () => setActiveTab('css')
  }, "CSS"), /*#__PURE__*/React.createElement("div", {
    className: "adm-tab-spacer"
  }), /*#__PURE__*/React.createElement("button", {
    className: "adm-btn adm-btn-secondary adm-btn-sm",
    onClick: () => setShowPreview(!showPreview)
  }, showPreview ? 'Skrýt náhled' : 'Náhled'), /*#__PURE__*/React.createElement("button", {
    className: "adm-btn adm-btn-secondary adm-btn-sm",
    onClick: () => duplicatePage(activePage.id),
    title: "Duplikovat stránku"
  }, "⧉ Kopie"), /*#__PURE__*/React.createElement("button", {
    className: "adm-btn adm-btn-primary adm-btn-sm",
    onClick: () => exportPage(activePage)
  }, "↓ Export HTML")), /*#__PURE__*/React.createElement("div", {
    className: "adm-editor-body"
  }, activeTab === 'blocks' && /*#__PURE__*/React.createElement(React.Fragment, null, activePage.blocks.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "adm-blocks-empty"
  }, "Stránka je prázdná. Přidejte první blok."), activePage.blocks.map((block, i) => /*#__PURE__*/React.createElement(BlockItem, {
    key: block.id,
    block: block,
    index: i,
    total: activePage.blocks.length,
    editing: editingBlock === block.id,
    onToggle: () => setEditingBlock(editingBlock === block.id ? null : block.id),
    onChange: updateBlockProp,
    onMove: moveBlock,
    onDelete: deleteBlock,
    onDuplicate: duplicateBlock
  })), /*#__PURE__*/React.createElement(AddBlockMenu, {
    onAdd: addBlock
  })), activeTab === 'meta' && /*#__PURE__*/React.createElement(MetaEditor, {
    meta: activePage.meta,
    onChange: meta => updatePage({
      ...activePage,
      meta
    })
  }), activeTab === 'css' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "adm-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "adm-label"
  }, "Vlastní CSS pro tuto stránku"), /*#__PURE__*/React.createElement("textarea", {
    className: "adm-textarea",
    style: {
      minHeight: '300px',
      fontFamily: 'monospace',
      fontSize: '0.82rem',
      lineHeight: '1.5',
      tabSize: 2
    },
    value: activePage.customCss || '',
    onChange: e => updatePage({
      ...activePage,
      customCss: e.target.value
    }),
    placeholder: "/* Vlastní CSS pravidla */\n.moje-trida { color: red;\n}",
    spellCheck: false
  }), /*#__PURE__*/React.createElement("div", {
    className: "adm-hint"
  }, "CSS se vloží jako <style> na konec <head> — přebíjí hlavní stylesheet. Aplikuje se pouze na tuto stránku.")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '1rem',
      padding: '0.75rem',
      background: 'var(--adm-bg)',
      borderRadius: '6px',
      border: '1px solid var(--adm-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "adm-label",
    style: {
      marginBottom: '0.4rem'
    }
  }, "Hlavní stylesheet"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '0.75rem',
      color: 'var(--adm-text3)'
    }
  }, siteCSS ? `styles.css načten (${Math.round(siteCSS.length / 1024)} KB) — náhled používá aktuální styly z webu` : 'styles.css se nepodařilo načíst — náhled bez stylů'))))) : /*#__PURE__*/React.createElement("div", {
    className: "adm-empty"
  }, /*#__PURE__*/React.createElement("div", {
    className: "adm-empty-icon"
  }, "📄"), /*#__PURE__*/React.createElement("div", {
    className: "adm-empty-text"
  }, "Vyber stránku nebo vytvoř novou"))), showPreview && /*#__PURE__*/React.createElement("div", {
    className: "adm-preview"
  }, /*#__PURE__*/React.createElement("div", {
    className: "adm-preview-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "adm-preview-label"
  }, "Náhled")), /*#__PURE__*/React.createElement(PreviewPanel, {
    page: activePage,
    siteCSS: siteCSS
  })));
}

// Mount
ReactDOM.createRoot(document.getElementById('admin-root')).render(/*#__PURE__*/React.createElement(App, null));