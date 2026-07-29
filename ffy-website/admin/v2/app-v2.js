/* ════════════════════════════════════════════
   FFY Builder v2 — Třípanelový editor
   Strom bloků (vlevo) · Živé plátno (uprostřed) · Inspektor (vpravo)
   + inline editace textu přímo na plátně (dvojklik)
   Vyžaduje: registry.js, editor-render.js
   ════════════════════════════════════════════ */

const {
  useState,
  useEffect,
  useRef,
  useCallback
} = React;

// ─────────────────────────────────────────────
//  FIELD EDITORY (inspektor)
// ─────────────────────────────────────────────
function Field({
  field,
  value,
  onChange
}) {
  const v = value === undefined ? '' : value;
  if (field.type === 'textarea') {
    return /*#__PURE__*/React.createElement("div", {
      className: "v2-field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "v2-field-label"
    }, field.label), /*#__PURE__*/React.createElement("textarea", {
      className: "v2-input v2-textarea",
      value: v,
      onChange: e => onChange(e.target.value),
      rows: 4
    }), field.hint && /*#__PURE__*/React.createElement("div", {
      className: "v2-hint"
    }, field.hint));
  }
  if (field.type === 'select') {
    return /*#__PURE__*/React.createElement("div", {
      className: "v2-field"
    }, /*#__PURE__*/React.createElement("label", {
      className: "v2-field-label"
    }, field.label), /*#__PURE__*/React.createElement("select", {
      className: "v2-input",
      value: v,
      onChange: e => onChange(e.target.value)
    }, (field.options || []).map(o => /*#__PURE__*/React.createElement("option", {
      key: o.value,
      value: o.value
    }, o.label))));
  }
  if (field.type === 'toggle') {
    return /*#__PURE__*/React.createElement("div", {
      className: "v2-field v2-field-toggle"
    }, /*#__PURE__*/React.createElement("label", {
      className: "v2-field-label"
    }, field.label), /*#__PURE__*/React.createElement("button", {
      className: `v2-toggle ${v ? 'on' : ''}`,
      onClick: () => onChange(!v)
    }, /*#__PURE__*/React.createElement("span", {
      className: "v2-toggle-dot"
    })));
  }
  if (field.type === 'image') {
    return /*#__PURE__*/React.createElement(ImageField, {
      field: field,
      value: v,
      onChange: onChange
    });
  }
  if (field.type === 'array') {
    return /*#__PURE__*/React.createElement(ArrayField, {
      field: field,
      value: value || [],
      onChange: onChange
    });
  }
  // text, url
  return /*#__PURE__*/React.createElement("div", {
    className: "v2-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "v2-field-label"
  }, field.label), /*#__PURE__*/React.createElement("input", {
    className: "v2-input",
    type: "text",
    value: v,
    onChange: e => onChange(e.target.value),
    placeholder: field.placeholder || ''
  }), field.hint && /*#__PURE__*/React.createElement("div", {
    className: "v2-hint"
  }, field.hint));
}
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
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "v2-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "v2-field-label"
  }, field.label), /*#__PURE__*/React.createElement("input", {
    className: "v2-input",
    type: "text",
    value: value,
    onChange: e => onChange(e.target.value),
    placeholder: "URL obrázku nebo nahraj"
  }), /*#__PURE__*/React.createElement("div", {
    className: "v2-img-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "v2-btn v2-btn-sm",
    onClick: () => fileRef.current.click()
  }, "Nahrát soubor"), value && /*#__PURE__*/React.createElement("img", {
    src: value,
    className: "v2-img-preview",
    alt: ""
  })), /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "image/*",
    style: {
      display: 'none'
    },
    onChange: handleFile
  }));
}
function ArrayField({
  field,
  value,
  onChange
}) {
  function updateItem(i, key, val) {
    const next = value.map((it, idx) => idx === i ? {
      ...it,
      [key]: val
    } : it);
    onChange(next);
  }
  function addItem() {
    const empty = {};
    (field.arrayFields || []).forEach(f => empty[f.key] = '');
    onChange([...value, empty]);
  }
  function removeItem(i) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  function moveItem(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "v2-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "v2-field-label"
  }, field.label), /*#__PURE__*/React.createElement("div", {
    className: "v2-array"
  }, value.map((item, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "v2-array-item"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-array-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "v2-array-num"
  }, "#", i + 1), /*#__PURE__*/React.createElement("div", {
    className: "v2-array-ctrl"
  }, /*#__PURE__*/React.createElement("button", {
    className: "v2-icon-btn",
    onClick: () => moveItem(i, -1),
    disabled: i === 0
  }, "↑"), /*#__PURE__*/React.createElement("button", {
    className: "v2-icon-btn",
    onClick: () => moveItem(i, 1),
    disabled: i === value.length - 1
  }, "↓"), /*#__PURE__*/React.createElement("button", {
    className: "v2-icon-btn v2-del",
    onClick: () => removeItem(i)
  }, "✕"))), (field.arrayFields || []).map(f => /*#__PURE__*/React.createElement("div", {
    key: f.key,
    className: "v2-array-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "v2-array-label"
  }, f.label), f.type === 'textarea' ? /*#__PURE__*/React.createElement("textarea", {
    className: "v2-input v2-textarea-sm",
    value: item[f.key] || '',
    onChange: e => updateItem(i, f.key, e.target.value),
    rows: 2
  }) : /*#__PURE__*/React.createElement("input", {
    className: "v2-input",
    type: "text",
    value: item[f.key] || '',
    onChange: e => updateItem(i, f.key, e.target.value)
  }))))), /*#__PURE__*/React.createElement("button", {
    className: "v2-btn v2-btn-sm v2-btn-add",
    onClick: addItem
  }, "+ Přidat položku")));
}

// ─────────────────────────────────────────────
//  STROM BLOKŮ (levý panel)
// ─────────────────────────────────────────────
function BlockTree({
  page,
  selectedId,
  onSelect,
  onMove,
  onDelete,
  onDuplicate,
  locked
}) {
  const [dragIdx, setDragIdx] = useState(null);
  if (!page) return /*#__PURE__*/React.createElement("div", {
    className: "v2-tree-empty"
  }, "Vyber stránku");
  return /*#__PURE__*/React.createElement("div", {
    className: "v2-tree"
  }, page.blocks.map((block, i) => {
    const reg = BLOCK_REGISTRY[block.type];
    const label = reg ? reg.label : block.type;
    const preview = getBlockPreview(block);
    return /*#__PURE__*/React.createElement("div", {
      key: block.id,
      className: `v2-tree-item ${block.id === selectedId ? 'active' : ''} ${dragIdx === i ? 'dragging' : ''}`,
      draggable: !locked,
      onClick: () => onSelect(block.id),
      onDragStart: () => setDragIdx(i),
      onDragEnd: () => setDragIdx(null),
      onDragOver: e => e.preventDefault(),
      onDrop: e => {
        e.preventDefault();
        if (dragIdx !== null && dragIdx !== i) onMove(dragIdx, i);
        setDragIdx(null);
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "v2-tree-grip"
    }, "⋮⋮"), /*#__PURE__*/React.createElement("div", {
      className: "v2-tree-body"
    }, /*#__PURE__*/React.createElement("div", {
      className: "v2-tree-label"
    }, label), preview && /*#__PURE__*/React.createElement("div", {
      className: "v2-tree-preview"
    }, preview)), !locked && /*#__PURE__*/React.createElement("div", {
      className: "v2-tree-actions",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("button", {
      className: "v2-icon-btn",
      onClick: () => onDuplicate(i),
      title: "Duplikovat"
    }, "⧉"), block.type !== 'page_header' && /*#__PURE__*/React.createElement("button", {
      className: "v2-icon-btn v2-del",
      onClick: () => onDelete(i),
      title: "Smazat"
    }, "✕")));
  }));
}
function getBlockPreview(block) {
  const p = block.props || {};
  const text = p.heading || p.label || p.title || p.section_label || p.text || p.content || '';
  if (text) return String(text).replace(/\n/g, ' ').slice(0, 42);
  if (p.items) return p.items.length + ' položek';
  return '';
}

// ─────────────────────────────────────────────
//  INSPEKTOR (pravý panel)
// ─────────────────────────────────────────────
function Inspector({
  block,
  onUpdate,
  locked
}) {
  if (!block) {
    return /*#__PURE__*/React.createElement("div", {
      className: "v2-inspector-empty"
    }, /*#__PURE__*/React.createElement("div", {
      className: "v2-inspector-empty-icon"
    }, "☰"), /*#__PURE__*/React.createElement("div", null, "Vyber blok na plátně", /*#__PURE__*/React.createElement("br", null), "nebo ve stromu vlevo"));
  }
  const reg = BLOCK_REGISTRY[block.type];
  if (!reg) return /*#__PURE__*/React.createElement("div", {
    className: "v2-inspector-empty"
  }, "Neznámý blok");
  function update(key, val) {
    onUpdate(block.id, key, val);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "v2-inspector"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-inspector-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-inspector-title"
  }, reg.label), /*#__PURE__*/React.createElement("div", {
    className: "v2-inspector-desc"
  }, reg.description)), /*#__PURE__*/React.createElement("div", {
    className: "v2-inspector-body"
  }, locked && /*#__PURE__*/React.createElement("div", {
    className: "v2-lock-note"
  }, "🔒 Stránka je zamčená. Odemkni ji nahoře pro editaci."), /*#__PURE__*/React.createElement("fieldset", {
    disabled: locked,
    className: "v2-fieldset"
  }, (reg.schema || []).map(field => /*#__PURE__*/React.createElement(Field, {
    key: field.key,
    field: field,
    value: block.props[field.key],
    onChange: val => update(field.key, val)
  })))));
}

// ─────────────────────────────────────────────
//  PLÁTNO (střední panel)
// ─────────────────────────────────────────────
function Canvas({
  page,
  selectedId,
  onSelect,
  onInlineEdit,
  device
}) {
  const iframeRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Vyrenderuj stránku do iframe
  useEffect(() => {
    if (!iframeRef.current || !page) return;
    // base = ROOT webu (o dvě úrovně výš než admin/v2/), aby styly a embed iframy fungovaly
    const baseHref = new URL('../../', window.location.href).href;
    const html = renderEditorPage(page, selectedId, baseHref);
    iframeRef.current.srcdoc = html;
    setReady(false);
  }, [page && page.id, page && JSON.stringify(page.blocks), page && page.customCss]);

  // Zvýrazni vybraný blok (bez re-renderu iframe)
  useEffect(() => {
    if (!iframeRef.current || !ready) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.querySelectorAll('.ffy-ed-selected').forEach(el => el.classList.remove('ffy-ed-selected'));
    if (selectedId) {
      const el = doc.querySelector(`[data-ffy-block="${selectedId}"]`);
      if (el) el.classList.add('ffy-ed-selected');
    }
  }, [selectedId, ready]);

  // Komunikace s iframe
  useEffect(() => {
    function onMsg(e) {
      const d = e.data;
      if (!d || !d.type) return;
      if (d.type === 'ffy-loaded') {
        // Pošli mapu bloků pro injekci editovatelných polí
        const blocks = page.blocks.map(b => ({
          id: b.id,
          type: b.type
        }));
        iframeRef.current.contentWindow.postMessage({
          type: 'ffy-inject-fields',
          blocks
        }, '*');
      }
      if (d.type === 'ffy-ready') setReady(true);
      if (d.type === 'ffy-select') onSelect(d.id);
      if (d.type === 'ffy-edit') onInlineEdit(d.id, d.field, d.value);
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [page, onSelect, onInlineEdit]);
  const widths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '390px'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "v2-canvas-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-canvas-scroll"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-canvas-frame",
    style: {
      width: widths[device] || '100%'
    }
  }, /*#__PURE__*/React.createElement("iframe", {
    ref: iframeRef,
    className: "v2-canvas-iframe",
    title: "Náhled stránky"
  }))));
}

// ─────────────────────────────────────────────
//  PŘIDAT BLOK (modal)
// ─────────────────────────────────────────────
const BLOCK_CATEGORIES = [{
  name: 'Text a obsah',
  types: ['content_section', 'two_column', 'quote_block', 'info_callout', 'divider']
}, {
  name: 'Struktura',
  types: ['page_header', 'features_grid', 'process_steps', 'rules_block', 'rules_list', 'stat_row']
}, {
  name: 'Média a akce',
  types: ['image_block', 'cta_block', 'button_link', 'embed_widget', 'price_chart']
}, {
  name: 'Data',
  types: ['faq_block', 'reviews_block', 'tariff_cards', 'pricelist_block', 'documents_block', 'tier_cards', 'team_grid', 'blog_cards']
}, {
  name: 'Pokročilé',
  types: ['raw_html']
}];
function AddBlockModal({
  onAdd,
  onClose
}) {
  const [q, setQ] = useState('');
  return /*#__PURE__*/React.createElement("div", {
    className: "v2-modal-backdrop",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-modal",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-modal-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-modal-title"
  }, "Přidat blok"), /*#__PURE__*/React.createElement("button", {
    className: "v2-icon-btn",
    onClick: onClose
  }, "✕")), /*#__PURE__*/React.createElement("input", {
    className: "v2-input v2-modal-search",
    placeholder: "Hledat blok…",
    value: q,
    onChange: e => setQ(e.target.value),
    autoFocus: true
  }), /*#__PURE__*/React.createElement("div", {
    className: "v2-modal-body"
  }, BLOCK_CATEGORIES.map(cat => {
    const types = cat.types.filter(t => BLOCK_REGISTRY[t] && (!q || BLOCK_REGISTRY[t].label.toLowerCase().includes(q.toLowerCase())));
    if (types.length === 0) return null;
    return /*#__PURE__*/React.createElement("div", {
      key: cat.name,
      className: "v2-modal-cat"
    }, /*#__PURE__*/React.createElement("div", {
      className: "v2-modal-cat-name"
    }, cat.name), /*#__PURE__*/React.createElement("div", {
      className: "v2-modal-grid"
    }, types.map(t => /*#__PURE__*/React.createElement("button", {
      key: t,
      className: "v2-block-card",
      onClick: () => onAdd(t)
    }, /*#__PURE__*/React.createElement("div", {
      className: "v2-block-card-name"
    }, BLOCK_REGISTRY[t].label), /*#__PURE__*/React.createElement("div", {
      className: "v2-block-card-desc"
    }, BLOCK_REGISTRY[t].description)))));
  }))));
}

// ─────────────────────────────────────────────
//  MÉDIA / DOKUMENTY / CSS PANELY
// ─────────────────────────────────────────────
function MediaPanel() {
  const [media, setMedia] = useState(() => loadMedia());
  const fileRef = useRef(null);
  function handleFiles(e) {
    const files = Array.from(e.target.files);
    let pending = files.length;
    const added = [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        added.push({
          id: generateId(),
          name: file.name,
          type: file.type,
          data: reader.result,
          date: Date.now()
        });
        if (--pending === 0) {
          const next = [...media, ...added];
          setMedia(next);
          saveMedia(next);
        }
      };
      reader.readAsDataURL(file);
    });
  }
  function remove(id) {
    const next = media.filter(m => m.id !== id);
    setMedia(next);
    saveMedia(next);
  }
  function copyUrl(m) {
    navigator.clipboard && navigator.clipboard.writeText(m.data);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "v2-asset"
  }, /*#__PURE__*/React.createElement("button", {
    className: "v2-btn v2-btn-primary v2-btn-block",
    onClick: () => fileRef.current.click()
  }, "+ Nahrát obrázky"), /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "image/*",
    multiple: true,
    style: {
      display: 'none'
    },
    onChange: handleFiles
  }), /*#__PURE__*/React.createElement("div", {
    className: "v2-asset-note"
  }, "Uloženo lokálně (localStorage). Pro velkou knihovnu bude potřeba backend."), /*#__PURE__*/React.createElement("div", {
    className: "v2-media-grid"
  }, media.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "v2-asset-empty"
  }, "Zatím žádné obrázky"), media.map(m => /*#__PURE__*/React.createElement("div", {
    key: m.id,
    className: "v2-media-item"
  }, /*#__PURE__*/React.createElement("img", {
    src: m.data,
    alt: m.name,
    className: "v2-media-thumb"
  }), /*#__PURE__*/React.createElement("div", {
    className: "v2-media-overlay"
  }, /*#__PURE__*/React.createElement("button", {
    className: "v2-icon-btn",
    onClick: () => copyUrl(m),
    title: "Kopírovat URL"
  }, "📋"), /*#__PURE__*/React.createElement("button", {
    className: "v2-icon-btn v2-del",
    onClick: () => remove(m.id),
    title: "Smazat"
  }, "✕")), /*#__PURE__*/React.createElement("div", {
    className: "v2-media-name"
  }, m.name)))));
}
function DocsPanel() {
  return /*#__PURE__*/React.createElement("div", {
    className: "v2-asset"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-asset-note"
  }, "Dokumenty (PDF, ceníky) se spravují jako soubory ve složce ", /*#__PURE__*/React.createElement("code", null, "docs/"), " na serveru."), /*#__PURE__*/React.createElement("div", {
    className: "v2-docs-info"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-docs-info-title"
  }, "Jak přidat dokument"), /*#__PURE__*/React.createElement("ol", {
    className: "v2-docs-steps"
  }, /*#__PURE__*/React.createElement("li", null, "Nahraj PDF do složky ", /*#__PURE__*/React.createElement("code", null, "docs/"), " na serveru (přes FTP nebo správce souborů)."), /*#__PURE__*/React.createElement("li", null, "V bloku „Dokumenty ke stažení\" nebo „Ceníky\" přidej položku."), /*#__PURE__*/React.createElement("li", null, "Do pole odkazu zadej cestu, např. ", /*#__PURE__*/React.createElement("code", null, "docs/smlouvy/smlouva.pdf"), ".")), /*#__PURE__*/React.createElement("div", {
    className: "v2-asset-note"
  }, "Správa souborů přímo z editoru bude možná až s backendem (upload endpoint).")));
}
function CssPanel({
  page,
  onUpdate,
  locked
}) {
  if (!page) return /*#__PURE__*/React.createElement("div", {
    className: "v2-inspector-empty"
  }, "Vyber stránku");
  return /*#__PURE__*/React.createElement("div", {
    className: "v2-asset"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-asset-note"
  }, "Vlastní CSS pro tuto stránku. Přidá se za globální styly — přepíše je jen pro ", /*#__PURE__*/React.createElement("strong", null, page.meta.slug), "."), locked && /*#__PURE__*/React.createElement("div", {
    className: "v2-lock-note"
  }, "🔒 Odemkni stránku pro editaci."), /*#__PURE__*/React.createElement("textarea", {
    className: "v2-input v2-css-editor",
    value: page.customCss || '',
    onChange: e => onUpdate(e.target.value),
    disabled: locked,
    placeholder: '.sdileni-block {\n  /* vlastní styly */\n}',
    spellCheck: false
  }));
}

// ─────────────────────────────────────────────
//  HLAVNÍ APLIKACE
// ─────────────────────────────────────────────
function AppV2() {
  const [pages, setPages] = useState(() => loadPages());
  const [activeId, setActiveId] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [device, setDevice] = useState('desktop');
  const [showAdd, setShowAdd] = useState(false);
  const [unlocked, setUnlocked] = useState({});
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [leftW, setLeftW] = useState(260);
  const [rightW, setRightW] = useState(320);
  const [assetPanel, setAssetPanel] = useState(null); // 'media' | 'docs' | 'css' | null

  const activePage = pages.find(p => p.id === activeId);
  const selected = activePage ? activePage.blocks.find(b => b.id === selectedBlock) : null;
  useEffect(() => {
    savePages(pages);
  }, [pages]);
  function categorize(page) {
    if (page.source === 'new') return 'new';
    if (page.meta.slug && page.meta.slug.indexOf('blog/') === 0) return 'blog';
    if (page.meta.slug === '_header' || page.meta.slug === '_footer') return 'global';
    return 'html';
  }
  const isLocked = useCallback(page => {
    if (!page) return false;
    if (page.source === 'new') return false;
    return !unlocked[page.id];
  }, [unlocked]);
  function unlockPage(page) {
    const label = page.meta.slug === '_header' ? 'hlavní navigaci' : page.meta.slug === '_footer' ? 'patičku webu' : 'živou stránku „' + page.meta.slug + '.html"';
    if (confirm('Chystáte se upravit ' + label + ', která je na webu.\n\nZměny se po publikaci projeví návštěvníkům. Opravdu odemknout?')) {
      setUnlocked({
        ...unlocked,
        [page.id]: true
      });
    }
  }
  function updateBlockProp(blockId, key, value) {
    if (!activePage || isLocked(activePage)) return;
    setPages(pages.map(p => p.id !== activeId ? p : {
      ...p,
      blocks: p.blocks.map(b => b.id === blockId ? {
        ...b,
        props: {
          ...b.props,
          [key]: value
        }
      } : b)
    }));
  }
  function moveBlock(from, to) {
    if (!activePage || isLocked(activePage)) return;
    const blocks = [...activePage.blocks];
    const [m] = blocks.splice(from, 1);
    blocks.splice(to, 0, m);
    setPages(pages.map(p => p.id === activeId ? {
      ...p,
      blocks
    } : p));
  }
  function deleteBlock(index) {
    if (!activePage || isLocked(activePage)) return;
    const blk = activePage.blocks[index];
    setPages(pages.map(p => p.id === activeId ? {
      ...p,
      blocks: p.blocks.filter((_, i) => i !== index)
    } : p));
    if (blk.id === selectedBlock) setSelectedBlock(null);
  }
  function duplicateBlock(index) {
    if (!activePage || isLocked(activePage)) return;
    const orig = activePage.blocks[index];
    const copy = {
      id: generateId(),
      type: orig.type,
      props: JSON.parse(JSON.stringify(orig.props))
    };
    const blocks = [...activePage.blocks];
    blocks.splice(index + 1, 0, copy);
    setPages(pages.map(p => p.id === activeId ? {
      ...p,
      blocks
    } : p));
    setSelectedBlock(copy.id);
  }
  function addBlock(type) {
    if (!activePage || isLocked(activePage)) {
      setShowAdd(false);
      return;
    }
    const reg = BLOCK_REGISTRY[type];
    const block = {
      id: generateId(),
      type,
      props: JSON.parse(JSON.stringify(reg.defaults || {}))
    };
    setPages(pages.map(p => p.id === activeId ? {
      ...p,
      blocks: [...p.blocks, block]
    } : p));
    setSelectedBlock(block.id);
    setShowAdd(false);
  }

  // Skupiny stránek pro přepínač
  const groups = [{
    key: 'html',
    label: 'HTML stránky'
  }, {
    key: 'blog',
    label: 'Blog'
  }, {
    key: 'global',
    label: 'Globální prvky'
  }, {
    key: 'new',
    label: 'Nové stránky'
  }];
  const locked = isLocked(activePage);

  // Resize panelů
  function startResize(side, e) {
    e.preventDefault();
    const startX = e.clientX;
    const startLeft = leftW,
      startRight = rightW;
    function onMove(ev) {
      if (side === 'left') {
        setLeftW(Math.max(180, Math.min(420, startLeft + (ev.clientX - startX))));
      } else {
        setRightW(Math.max(240, Math.min(500, startRight - (ev.clientX - startX))));
      }
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "v2-app"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-topbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-brand"
  }, "FFY Builder ", /*#__PURE__*/React.createElement("span", {
    className: "v2-brand-tag"
  }, "v2")), /*#__PURE__*/React.createElement("div", {
    className: "v2-page-picker"
  }, /*#__PURE__*/React.createElement("button", {
    className: "v2-page-btn",
    onClick: () => setPageMenuOpen(!pageMenuOpen)
  }, activePage ? activePage.meta.title.split('—')[0].split('|')[0].trim() : 'Vyber stránku', /*#__PURE__*/React.createElement("span", {
    className: "v2-page-btn-arrow"
  }, "▾")), pageMenuOpen && /*#__PURE__*/React.createElement("div", {
    className: "v2-page-menu",
    onMouseLeave: () => setPageMenuOpen(false)
  }, groups.map(g => {
    const gp = pages.filter(p => categorize(p) === g.key);
    if (gp.length === 0) return null;
    return /*#__PURE__*/React.createElement("div", {
      key: g.key,
      className: "v2-page-menu-group"
    }, /*#__PURE__*/React.createElement("div", {
      className: "v2-page-menu-label"
    }, g.label), gp.map(p => /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: `v2-page-menu-item ${p.id === activeId ? 'active' : ''}`,
      onClick: () => {
        setActiveId(p.id);
        setSelectedBlock(null);
        setPageMenuOpen(false);
      }
    }, isLocked(p) && /*#__PURE__*/React.createElement("span", {
      className: "v2-lock-mini"
    }, "🔒"), p.meta.title.split('—')[0].split('|')[0].trim())));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "v2-topbar-spacer"
  }), /*#__PURE__*/React.createElement("div", {
    className: "v2-device-switch"
  }, /*#__PURE__*/React.createElement("button", {
    className: device === 'desktop' ? 'active' : '',
    onClick: () => setDevice('desktop'),
    title: "Desktop"
  }, "▭"), /*#__PURE__*/React.createElement("button", {
    className: device === 'tablet' ? 'active' : '',
    onClick: () => setDevice('tablet'),
    title: "Tablet"
  }, "▯"), /*#__PURE__*/React.createElement("button", {
    className: device === 'mobile' ? 'active' : '',
    onClick: () => setDevice('mobile'),
    title: "Mobil"
  }, "▮")), activePage && locked && /*#__PURE__*/React.createElement("button", {
    className: "v2-btn v2-btn-warn",
    onClick: () => unlockPage(activePage)
  }, "🔓 Odemknout"), activePage && !locked && /*#__PURE__*/React.createElement("button", {
    className: "v2-btn v2-btn-primary",
    onClick: () => setShowAdd(true)
  }, "+ Přidat blok"), /*#__PURE__*/React.createElement("a", {
    className: "v2-btn v2-btn-ghost",
    href: "../index.html"
  }, "← Stará verze")), /*#__PURE__*/React.createElement("div", {
    className: "v2-main",
    style: {
      gridTemplateColumns: `${leftW}px 6px 1fr 6px ${rightW}px`
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-panel v2-panel-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-panel-tabs"
  }, /*#__PURE__*/React.createElement("button", {
    className: `v2-panel-tab ${!assetPanel ? 'active' : ''}`,
    onClick: () => setAssetPanel(null)
  }, "Struktura"), /*#__PURE__*/React.createElement("button", {
    className: `v2-panel-tab ${assetPanel === 'media' ? 'active' : ''}`,
    onClick: () => setAssetPanel(assetPanel === 'media' ? null : 'media')
  }, "Obrázky"), /*#__PURE__*/React.createElement("button", {
    className: `v2-panel-tab ${assetPanel === 'docs' ? 'active' : ''}`,
    onClick: () => setAssetPanel(assetPanel === 'docs' ? null : 'docs')
  }, "Dokumenty")), assetPanel === 'media' ? /*#__PURE__*/React.createElement(MediaPanel, null) : assetPanel === 'docs' ? /*#__PURE__*/React.createElement(DocsPanel, null) : /*#__PURE__*/React.createElement(BlockTree, {
    page: activePage,
    selectedId: selectedBlock,
    onSelect: setSelectedBlock,
    onMove: moveBlock,
    onDelete: deleteBlock,
    onDuplicate: duplicateBlock,
    locked: locked
  })), /*#__PURE__*/React.createElement("div", {
    className: "v2-resizer",
    onMouseDown: e => startResize('left', e)
  }), /*#__PURE__*/React.createElement("div", {
    className: "v2-panel v2-panel-center"
  }, activePage ? /*#__PURE__*/React.createElement(Canvas, {
    page: activePage,
    selectedId: selectedBlock,
    onSelect: setSelectedBlock,
    onInlineEdit: updateBlockProp,
    device: device
  }) : /*#__PURE__*/React.createElement("div", {
    className: "v2-canvas-empty"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-canvas-empty-icon"
  }, "◲"), /*#__PURE__*/React.createElement("div", null, "Vyber stránku nahoře"))), /*#__PURE__*/React.createElement("div", {
    className: "v2-resizer",
    onMouseDown: e => startResize('right', e)
  }), /*#__PURE__*/React.createElement("div", {
    className: "v2-panel v2-panel-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-panel-tabs"
  }, /*#__PURE__*/React.createElement("button", {
    className: `v2-panel-tab ${assetPanel !== 'css' ? 'active' : ''}`,
    onClick: () => setAssetPanel(null)
  }, "Vlastnosti"), /*#__PURE__*/React.createElement("button", {
    className: `v2-panel-tab ${assetPanel === 'css' ? 'active' : ''}`,
    onClick: () => setAssetPanel('css')
  }, "CSS stránky")), assetPanel === 'css' ? /*#__PURE__*/React.createElement(CssPanel, {
    page: activePage,
    onUpdate: css => {
      if (!activePage || isLocked(activePage)) return;
      setPages(pages.map(p => p.id === activeId ? {
        ...p,
        customCss: css
      } : p));
    },
    locked: locked
  }) : /*#__PURE__*/React.createElement(Inspector, {
    block: selected,
    onUpdate: updateBlockProp,
    locked: locked
  }))), showAdd && /*#__PURE__*/React.createElement(AddBlockModal, {
    onAdd: addBlock,
    onClose: () => setShowAdd(false)
  }));
}
ReactDOM.createRoot(document.getElementById('v2-root')).render(/*#__PURE__*/React.createElement(AppV2, null));