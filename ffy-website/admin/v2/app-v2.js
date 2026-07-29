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
    (field.arrayFields || []).forEach(f => empty[f.key] = f.type === 'array' ? [] : '');
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
  }, item.title || item.label || '#' + (i + 1)), /*#__PURE__*/React.createElement("div", {
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
  }, f.label), f.type === 'array' ? /*#__PURE__*/React.createElement(ArrayField, {
    field: f,
    value: item[f.key] || [],
    onChange: val => updateItem(i, f.key, val)
  }) : f.type === 'textarea' ? /*#__PURE__*/React.createElement("textarea", {
    className: "v2-input v2-textarea-sm",
    value: item[f.key] || '',
    onChange: e => updateItem(i, f.key, e.target.value),
    rows: 2
  }) : /*#__PURE__*/React.createElement("input", {
    className: "v2-input",
    type: "text",
    value: item[f.key] || '',
    onChange: e => updateItem(i, f.key, e.target.value),
    placeholder: f.hint || ''
  }))))), /*#__PURE__*/React.createElement("button", {
    className: "v2-btn v2-btn-sm v2-btn-add",
    onClick: addItem
  }, "+ Přidat ", field.itemName || 'položku')));
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
  device,
  locked
}) {
  const iframeRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState('blocks'); // 'live' | 'blocks'
  const [loadErr, setLoadErr] = useState(false);

  // Rozhodnutí: existující stránky webu → načti SKUTEČNÉ HTML (věrné).
  // Nové stránky a globální prvky → renderuj z bloků.
  const isLive = page && page.source !== 'new' && page.meta.slug !== '_header' && page.meta.slug !== '_footer' && page.meta.slug !== 'index';
  useEffect(() => {
    if (!iframeRef.current || !page) return;
    const baseHref = new URL('../../', window.location.href).href;
    setReady(false);
    setLoadErr(false);
    if (isLive) {
      // Načti skutečný živý HTML soubor stránky
      const fileUrl = baseHref + page.meta.slug + '.html';
      fetch(fileUrl).then(r => {
        if (!r.ok) throw new Error('not found');
        return r.text();
      }).then(html => {
        iframeRef.current.srcdoc = injectEditorIntoLiveHTML(html, baseHref);
        setMode('live');
      }).catch(() => {
        // Fallback: když soubor nejde načíst (lokální náhled), renderuj z bloků
        iframeRef.current.srcdoc = renderEditorPage(page, selectedId, baseHref);
        setMode('blocks');
        setLoadErr(true);
      });
    } else {
      iframeRef.current.srcdoc = renderEditorPage(page, selectedId, baseHref);
      setMode('blocks');
    }
  }, [page && page.id]);

  // Re-render z bloků při editaci (jen v block módu)
  useEffect(() => {
    if (!iframeRef.current || !page || mode !== 'blocks') return;
    const baseHref = new URL('../../', window.location.href).href;
    iframeRef.current.srcdoc = renderEditorPage(page, selectedId, baseHref);
    setReady(false);
  }, [page && JSON.stringify(page.blocks), page && page.customCss]);

  // Předej info o zamčení do živého iframe
  useEffect(() => {
    if (!iframeRef.current || mode !== 'live' || !ready) return;
    try {
      iframeRef.current.contentWindow.postMessage({
        type: 'ffy-set-unlocked',
        value: !locked
      }, '*');
    } catch (e) {}
  }, [locked, mode, ready]);

  // Zvýrazni vybraný blok (block mód)
  useEffect(() => {
    if (!iframeRef.current || !ready || mode !== 'blocks') return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.querySelectorAll('.ffy-ed-selected').forEach(el => el.classList.remove('ffy-ed-selected'));
    if (selectedId) {
      const el = doc.querySelector(`[data-ffy-block="${selectedId}"]`);
      if (el) el.classList.add('ffy-ed-selected');
    }
  }, [selectedId, ready, mode]);

  // Komunikace s iframe
  useEffect(() => {
    function onMsg(e) {
      const d = e.data;
      if (!d || !d.type) return;
      if (d.type === 'ffy-loaded') {
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
      if (d.type === 'ffy-live-loaded') {
        setReady(true);
        try {
          iframeRef.current.contentWindow.postMessage({
            type: 'ffy-set-unlocked',
            value: !locked
          }, '*');
        } catch (e) {}
      }
      if (d.type === 'ffy-select') onSelect(d.id);
      if (d.type === 'ffy-edit') onInlineEdit(d.id, d.field, d.value);
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [page, onSelect, onInlineEdit, locked]);
  const widths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '390px'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "v2-canvas-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-canvas-topinfo"
  }, mode === 'live' && /*#__PURE__*/React.createElement("span", {
    className: "v2-canvas-badge live"
  }, "● Živá stránka — přesně jako na webu"), mode === 'blocks' && !isLive && /*#__PURE__*/React.createElement("span", {
    className: "v2-canvas-badge blocks"
  }, "Blokový editor"), loadErr && /*#__PURE__*/React.createElement("span", {
    className: "v2-canvas-badge warn"
  }, "⚠ Živé HTML nešlo načíst (lokální náhled) — zobrazen blokový render")), /*#__PURE__*/React.createElement("div", {
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
function FilePanel({
  dir,
  accept,
  kind
}) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLocal, setIsLocal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  function reload() {
    setLoading(true);
    FFYApi.listFiles(dir).then(list => {
      setFiles(list || []);
      setIsLocal(FFYApi.isLocal());
      setLoading(false);
    });
  }
  useEffect(() => {
    reload();
  }, [dir]);
  function handleFiles(e) {
    const chosen = Array.from(e.target.files);
    if (!chosen.length) return;
    setUploading(true);
    let pending = chosen.length;
    chosen.forEach(file => {
      FFYApi.uploadFile(dir, file).then(() => {
        if (--pending === 0) {
          setUploading(false);
          reload();
        }
      });
    });
  }
  function remove(name) {
    if (!confirm('Smazat „' + name + '"?')) return;
    FFYApi.deleteFile(dir, name).then(reload);
  }
  function copyUrl(url) {
    navigator.clipboard && navigator.clipboard.writeText(url);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "v2-asset"
  }, /*#__PURE__*/React.createElement("button", {
    className: "v2-btn v2-btn-primary v2-btn-block",
    onClick: () => fileRef.current.click(),
    disabled: uploading
  }, uploading ? 'Nahrávám…' : '+ Nahrát ' + (kind === 'img' ? 'obrázky' : 'dokumenty')), /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: accept,
    multiple: true,
    style: {
      display: 'none'
    },
    onChange: handleFiles
  }), isLocal && /*#__PURE__*/React.createElement("div", {
    className: "v2-asset-warn"
  }, "⚠ Backend neběží — soubory se ukládají lokálně do prohlížeče. Na serveru s API se budou ukládat do ", /*#__PURE__*/React.createElement("code", null, dir, "/"), "."), !isLocal && /*#__PURE__*/React.createElement("div", {
    className: "v2-asset-note"
  }, "Načteno ze složky ", /*#__PURE__*/React.createElement("code", null, dir, "/"), " na serveru."), loading ? /*#__PURE__*/React.createElement("div", {
    className: "v2-asset-empty"
  }, "Načítám…") : kind === 'img' ? /*#__PURE__*/React.createElement("div", {
    className: "v2-media-grid"
  }, files.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "v2-asset-empty"
  }, "Zatím žádné obrázky"), files.map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "v2-media-item"
  }, /*#__PURE__*/React.createElement("img", {
    src: f.url,
    alt: f.name,
    className: "v2-media-thumb"
  }), /*#__PURE__*/React.createElement("div", {
    className: "v2-media-overlay"
  }, /*#__PURE__*/React.createElement("button", {
    className: "v2-icon-btn",
    onClick: () => copyUrl(f.url),
    title: "Kopírovat cestu"
  }, "📋"), /*#__PURE__*/React.createElement("button", {
    className: "v2-icon-btn v2-del",
    onClick: () => remove(f.name),
    title: "Smazat"
  }, "✕")), /*#__PURE__*/React.createElement("div", {
    className: "v2-media-name"
  }, f.name)))) : /*#__PURE__*/React.createElement("div", {
    className: "v2-doc-list"
  }, files.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "v2-asset-empty"
  }, "Zatím žádné dokumenty"), files.map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "v2-doc-item"
  }, /*#__PURE__*/React.createElement("span", {
    className: "v2-doc-icon"
  }, "📄"), /*#__PURE__*/React.createElement("div", {
    className: "v2-doc-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-doc-name"
  }, f.name), f.url && /*#__PURE__*/React.createElement("div", {
    className: "v2-doc-url"
  }, f.url)), /*#__PURE__*/React.createElement("button", {
    className: "v2-icon-btn",
    onClick: () => copyUrl(f.url),
    title: "Kopírovat cestu"
  }, "📋"), /*#__PURE__*/React.createElement("button", {
    className: "v2-icon-btn v2-del",
    onClick: () => remove(f.name),
    title: "Smazat"
  }, "✕")))));
}
function MediaPanel() {
  return /*#__PURE__*/React.createElement(FilePanel, {
    dir: "media",
    accept: "image/*",
    kind: "img"
  });
}
function DocsPanel() {
  return /*#__PURE__*/React.createElement(FilePanel, {
    dir: "docs",
    accept: ".pdf,.xlsx,.docx,.zip",
    kind: "doc"
  });
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

// ── Globální nastavení (CSS webu, GA4, metadata) ──
function GlobalCssPanel() {
  const [css, setCss] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isLocal, setIsLocal] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    FFYApi.getGlobalCss().then(c => {
      setCss(c);
      setIsLocal(FFYApi.isLocal());
      setLoading(false);
    });
  }, []);
  function save() {
    setSaving(true);
    FFYApi.saveGlobalCss(css).then(r => {
      setSaving(false);
      setMsg(r.local ? 'Uloženo lokálně (backend neběží)' : 'Uloženo na server ✓');
      setTimeout(() => setMsg(''), 3000);
    });
  }
  function exportFile() {
    const blob = new Blob([css], {
      type: 'text/css'
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'styles.css';
    a.click();
  }
  if (loading) return /*#__PURE__*/React.createElement("div", {
    className: "v2-asset-empty"
  }, "Načítám styles.css…");
  return /*#__PURE__*/React.createElement("div", {
    className: "v2-asset"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-asset-note"
  }, "Globální CSS celého webu (", /*#__PURE__*/React.createElement("code", null, "styles.css"), "). Změny se projeví na ", /*#__PURE__*/React.createElement("strong", null, "všech stránkách"), "."), isLocal && /*#__PURE__*/React.createElement("div", {
    className: "v2-asset-warn"
  }, "⚠ Backend neběží. Uprav a stáhni soubor tlačítkem „Export\", pak ho nahraj na server."), /*#__PURE__*/React.createElement("textarea", {
    className: "v2-input v2-css-editor v2-css-global",
    value: css,
    onChange: e => setCss(e.target.value),
    spellCheck: false
  }), /*#__PURE__*/React.createElement("div", {
    className: "v2-asset-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "v2-btn v2-btn-primary v2-btn-sm",
    onClick: save,
    disabled: saving
  }, saving ? 'Ukládám…' : 'Uložit'), /*#__PURE__*/React.createElement("button", {
    className: "v2-btn v2-btn-ghost v2-btn-sm",
    onClick: exportFile
  }, "Export souboru"), msg && /*#__PURE__*/React.createElement("span", {
    className: "v2-save-msg"
  }, msg)));
}
function GA4Panel() {
  const [gtmId, setGtmId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isLocal, setIsLocal] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    FFYApi.getGA4().then(d => {
      setGtmId(d.gtm_id || '');
      setIsLocal(FFYApi.isLocal());
      setLoading(false);
    });
  }, []);
  function save() {
    setSaving(true);
    FFYApi.saveGA4(gtmId).then(r => {
      setSaving(false);
      setMsg(r.local ? 'Uloženo lokálně (backend neběží)' : 'Uloženo na server ✓');
      setTimeout(() => setMsg(''), 3000);
    });
  }
  if (loading) return /*#__PURE__*/React.createElement("div", {
    className: "v2-asset-empty"
  }, "Načítám…");
  return /*#__PURE__*/React.createElement("div", {
    className: "v2-asset"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-asset-note"
  }, "Google Tag Manager ID pro měření (GA4). Vloží se do ", /*#__PURE__*/React.createElement("code", null, "analytics.js"), "."), isLocal && /*#__PURE__*/React.createElement("div", {
    className: "v2-asset-warn"
  }, "⚠ Backend neběží — ukládá se lokálně. Na serveru přepíše GTM ID v analytics.js."), /*#__PURE__*/React.createElement("div", {
    className: "v2-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "v2-field-label"
  }, "GTM Container ID"), /*#__PURE__*/React.createElement("input", {
    className: "v2-input",
    value: gtmId,
    onChange: e => setGtmId(e.target.value),
    placeholder: "GTM-XXXXXXX"
  }), /*#__PURE__*/React.createElement("div", {
    className: "v2-hint"
  }, "Najdeš v Google Tag Manageru vlevo nahoře (formát GTM-XXXXXXX).")), /*#__PURE__*/React.createElement("div", {
    className: "v2-asset-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "v2-btn v2-btn-primary v2-btn-sm",
    onClick: save,
    disabled: saving
  }, saving ? 'Ukládám…' : 'Uložit'), msg && /*#__PURE__*/React.createElement("span", {
    className: "v2-save-msg"
  }, msg)), /*#__PURE__*/React.createElement("div", {
    className: "v2-ga4-events"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-ga4-events-title"
  }, "Měřené události (automaticky)"), /*#__PURE__*/React.createElement("div", {
    className: "v2-ga4-event"
  }, "cta_klik · stazeni_dokumentu · odeslani_formulare"), /*#__PURE__*/React.createElement("div", {
    className: "v2-ga4-event"
  }, "scroll · kalkulacka_pouzita · kalkulacka_dokoncena"), /*#__PURE__*/React.createElement("div", {
    className: "v2-ga4-event v2-ga4-conv"
  }, "Konverze: kalkulačka start/dokončení, kontakt")));
}
function MetaPanel({
  page,
  onUpdate,
  locked
}) {
  if (!page) return /*#__PURE__*/React.createElement("div", {
    className: "v2-inspector-empty"
  }, "Vyber stránku");
  const m = page.meta;
  function set(key, val) {
    onUpdate({
      ...m,
      [key]: val
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "v2-asset"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-asset-note"
  }, "SEO metadata stránky ", /*#__PURE__*/React.createElement("strong", null, m.slug), ". Zobrazují se ve vyhledávačích a při sdílení."), locked && /*#__PURE__*/React.createElement("div", {
    className: "v2-lock-note"
  }, "🔒 Odemkni stránku pro editaci."), /*#__PURE__*/React.createElement("fieldset", {
    disabled: locked,
    style: {
      border: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "v2-field-label"
  }, "Titulek stránky (title)"), /*#__PURE__*/React.createElement("input", {
    className: "v2-input",
    value: m.title || '',
    onChange: e => set('title', e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    className: "v2-hint"
  }, (m.title || '').length, " znaků (ideál 50–60)")), /*#__PURE__*/React.createElement("div", {
    className: "v2-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "v2-field-label"
  }, "Popis (meta description)"), /*#__PURE__*/React.createElement("textarea", {
    className: "v2-input v2-textarea",
    value: m.description || '',
    onChange: e => set('description', e.target.value),
    rows: 3
  }), /*#__PURE__*/React.createElement("div", {
    className: "v2-hint"
  }, (m.description || '').length, " znaků (ideál 120–160)")), /*#__PURE__*/React.createElement("div", {
    className: "v2-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "v2-field-label"
  }, "URL adresa (slug)"), /*#__PURE__*/React.createElement("input", {
    className: "v2-input",
    value: m.slug || '',
    onChange: e => set('slug', e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    className: "v2-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "v2-field-label"
  }, "Kanonická URL (canonical)"), /*#__PURE__*/React.createElement("input", {
    className: "v2-input",
    value: m.canonical || '',
    onChange: e => set('canonical', e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    className: "v2-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "v2-field-label"
  }, "Indexace (robots)"), /*#__PURE__*/React.createElement("select", {
    className: "v2-input",
    value: m.robots || 'index, follow',
    onChange: e => set('robots', e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "index, follow"
  }, "index, follow (viditelná)"), /*#__PURE__*/React.createElement("option", {
    value: "noindex, follow"
  }, "noindex, follow (skrytá z výsledků)"), /*#__PURE__*/React.createElement("option", {
    value: "noindex, nofollow"
  }, "noindex, nofollow (úplně skrytá)")))));
}

// ─────────────────────────────────────────────
//  ŠABLONY STRÁNEK + TVORBA
// ─────────────────────────────────────────────
var V2_TEMPLATES = [{
  id: 'blank',
  name: 'Prázdná stránka',
  icon: '□',
  desc: 'Jen záhlaví, zbytek postavíš sám.',
  category: 'html',
  blocks: []
}, {
  id: 'content',
  name: 'Obsahová stránka',
  icon: '▤',
  desc: 'Záhlaví, dvě sekce, CTA.',
  category: 'html',
  blocks: [{
    type: 'content_section',
    props: {
      label: 'Sekce 1',
      content: 'Text první sekce…'
    }
  }, {
    type: 'content_section',
    props: {
      label: 'Sekce 2',
      content: 'Text druhé sekce…'
    }
  }, {
    type: 'cta_block',
    props: {
      title: 'Výzva k akci',
      description: '',
      btn1_text: 'Tlačítko →',
      btn1_url: '#',
      btn2_text: '',
      btn2_url: '#'
    }
  }]
}, {
  id: 'landing',
  name: 'Landing page',
  icon: '◆',
  desc: 'Hero, výhody, FAQ, CTA.',
  category: 'html',
  blocks: [{
    type: 'content_section',
    props: {
      label: '',
      content: 'Hlavní sdělení stránky…'
    }
  }, {
    type: 'features_grid',
    props: {
      section_label: 'Výhody',
      columns: '2',
      items: [{
        title: 'Výhoda 1',
        desc: 'Popis'
      }, {
        title: 'Výhoda 2',
        desc: 'Popis'
      }]
    }
  }, {
    type: 'faq_block',
    props: {
      title: 'Časté dotazy',
      items: [{
        q: 'Otázka?',
        a: 'Odpověď.'
      }]
    }
  }, {
    type: 'cta_block',
    props: {
      title: 'Začněte ještě dnes',
      description: '',
      btn1_text: 'Chci to →',
      btn1_url: '#',
      btn2_text: '',
      btn2_url: '#'
    }
  }]
}, {
  id: 'article',
  name: 'Článek / blog',
  icon: '▦',
  desc: 'Text, citát, závěr.',
  category: 'blog',
  blocks: [{
    type: 'content_section',
    props: {
      label: '',
      content: 'Úvodní odstavec článku…'
    }
  }, {
    type: 'quote_block',
    props: {
      text: 'Zajímavý citát z článku.',
      style: 'large'
    }
  }, {
    type: 'content_section',
    props: {
      label: '',
      content: 'Pokračování textu…'
    }
  }]
}];
function NewPageModal({
  onCreate,
  onClose
}) {
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
  }, "Vytvořit novou stránku"), /*#__PURE__*/React.createElement("button", {
    className: "v2-icon-btn",
    onClick: onClose
  }, "✕")), /*#__PURE__*/React.createElement("div", {
    className: "v2-modal-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-asset-note",
    style: {
      margin: '0 0 1rem'
    }
  }, "Vyber šablonu. Stránka se vytvoří jako ", /*#__PURE__*/React.createElement("strong", null, "nová (nepublikovaná)"), " — nezasáhne živý web, dokud ji nepublikuješ přes Staging."), /*#__PURE__*/React.createElement("div", {
    className: "v2-tpl-grid"
  }, V2_TEMPLATES.map(tpl => /*#__PURE__*/React.createElement("button", {
    key: tpl.id,
    className: "v2-tpl-card",
    onClick: () => onCreate(tpl)
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-tpl-icon"
  }, tpl.icon), /*#__PURE__*/React.createElement("div", {
    className: "v2-tpl-name"
  }, tpl.name), /*#__PURE__*/React.createElement("div", {
    className: "v2-tpl-desc"
  }, tpl.desc), /*#__PURE__*/React.createElement("div", {
    className: "v2-tpl-cat"
  }, tpl.category === 'blog' ? 'Blog' : 'HTML stránka')))))));
}

// ─────────────────────────────────────────────
//  STAGING (oddělený náhled + publikace)
// ─────────────────────────────────────────────
function StagingModal({
  pages,
  isChanged,
  onClose,
  onPublished
}) {
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg] = useState('');
  const iframeRef = useRef(null);

  // Rozděl stránky: nové / změněné / beze změny
  const realPages = pages.filter(p => p.meta.slug !== '_header' && p.meta.slug !== '_footer');
  const newPages = realPages.filter(p => p.source === 'new');
  const changedPages = realPages.filter(p => p.source !== 'new' && isChanged(p));
  const unchangedPages = realPages.filter(p => p.source !== 'new' && !isChanged(p));
  const toPublish = newPages.length + changedPages.length;
  const firstSlug = selectedSlug || changedPages[0] && changedPages[0].meta.slug || newPages[0] && newPages[0].meta.slug || unchangedPages[0] && unchangedPages[0].meta.slug;
  const previewPage = pages.find(p => p.meta.slug === firstSlug);
  useEffect(() => {
    if (!iframeRef.current || !previewPage) return;
    const baseHref = new URL('../../', window.location.href).href;
    // Pro věrný náhled: nové stránky z bloků, existující ze živého HTML
    const isLive = previewPage.source !== 'new';
    if (isLive) {
      fetch(baseHref + previewPage.meta.slug + '.html').then(r => {
        if (!r.ok) throw new Error();
        return r.text();
      }).then(html => {
        // Base pro relativní cesty
        let out = html;
        if (out.indexOf('<base') === -1) out = out.replace(/<head[^>]*>/i, m => m + '<base href="' + baseHref + '">');
        iframeRef.current.srcdoc = out;
      }).catch(() => {
        iframeRef.current.srcdoc = renderEditorPage(previewPage, null, baseHref).replace(/class="ffy-ed-block[^"]*"/g, 'class="ffy-ed-static"');
      });
    } else {
      const html = renderEditorPage(previewPage, null, baseHref).replace(/class="ffy-ed-block[^"]*"/g, 'class="ffy-ed-static"');
      iframeRef.current.srcdoc = html;
    }
  }, [firstSlug]);
  function publish() {
    if (toPublish === 0) {
      setMsg('Není co publikovat — žádné změny.');
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    if (!confirm('Publikovat ' + toPublish + ' stránek (' + changedPages.length + ' změněných, ' + newPages.length + ' nových)?\n\nNezměněné stránky zůstanou beze změny.')) return;
    setPublishing(true);
    const payload = [...changedPages, ...newPages].map(p => ({
      slug: p.meta.slug,
      html: renderPageHTML(p, null)
    }));
    FFYApi.publish ? FFYApi.publish(payload).then(handleResult) : FFYApi.checkAvailable().then(ok => handleResult({
      ok,
      local: !ok
    }));
    function handleResult(res) {
      setPublishing(false);
      if (res.local) {
        setMsg('Backend neběží — použij „Export" a nahraj změněné soubory ručně.');
        setTimeout(() => setMsg(''), 5000);
      } else {
        setMsg('Publikováno ' + toPublish + ' stránek ✓');
        setTimeout(() => {
          if (onPublished) onPublished();
        }, 1500);
      }
    }
  }
  function exportChanged() {
    const list = [...changedPages, ...newPages];
    if (list.length === 0) {
      setMsg('Žádné změny k exportu.');
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    let combined = '<!-- FFY export — POUZE změněné a nové stránky. Nahraj tyto soubory na server. -->\n\n';
    list.forEach(p => {
      combined += '========================================\n=== ' + p.meta.slug + '.html ' + (p.source === 'new' ? '(NOVÁ)' : '(ZMĚNĚNÁ)') + '\n========================================\n';
      combined += renderPageHTML(p, null) + '\n\n';
    });
    const blob = new Blob([combined], {
      type: 'text/plain'
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'staging-zmeny.txt';
    a.click();
  }
  function renderList(title, list, cls, badge) {
    if (list.length === 0) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "v2-staging-group"
    }, /*#__PURE__*/React.createElement("div", {
      className: "v2-staging-group-label"
    }, title, " (", list.length, ")"), list.map(p => /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: `v2-staging-item ${cls} ${firstSlug === p.meta.slug ? 'active' : ''}`,
      onClick: () => setSelectedSlug(p.meta.slug)
    }, /*#__PURE__*/React.createElement("span", {
      className: "v2-staging-item-top"
    }, badge && /*#__PURE__*/React.createElement("span", {
      className: `v2-staging-badge ${cls}`
    }, badge), p.meta.title.split('—')[0].trim()), /*#__PURE__*/React.createElement("span", {
      className: "v2-staging-slug"
    }, p.meta.slug, ".html"))));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "v2-modal-backdrop",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-modal v2-modal-full",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-modal-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-modal-title"
  }, "◔ Staging — náhled před publikací"), /*#__PURE__*/React.createElement("button", {
    className: "v2-icon-btn",
    onClick: onClose
  }, "✕")), /*#__PURE__*/React.createElement("div", {
    className: "v2-staging"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-staging-list"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-staging-summary"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-staging-summary-num"
  }, toPublish), /*#__PURE__*/React.createElement("div", {
    className: "v2-staging-summary-txt"
  }, "stránek k publikaci", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", null, changedPages.length, " změněných · ", newPages.length, " nových"))), renderList('✎ Změněné', changedPages, 'changed', 'změna'), renderList('✨ Nové', newPages, 'new', 'nová'), renderList('Beze změny', unchangedPages, 'unchanged', null)), /*#__PURE__*/React.createElement("div", {
    className: "v2-staging-preview"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-staging-bar"
  }, /*#__PURE__*/React.createElement("span", {
    className: "v2-staging-url"
  }, "🔒 náhled: ", firstSlug, ".html"), /*#__PURE__*/React.createElement("div", {
    className: "v2-staging-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "v2-btn v2-btn-ghost v2-btn-sm",
    onClick: exportChanged
  }, "Export změn"), /*#__PURE__*/React.createElement("button", {
    className: "v2-btn v2-btn-primary v2-btn-sm",
    onClick: publish,
    disabled: publishing || toPublish === 0
  }, publishing ? 'Publikuji…' : '⬆ Publikovat změny (' + toPublish + ')'))), msg && /*#__PURE__*/React.createElement("div", {
    className: "v2-staging-msg"
  }, msg), /*#__PURE__*/React.createElement("iframe", {
    ref: iframeRef,
    className: "v2-staging-iframe",
    title: "Staging náhled"
  })))));
}
function GlobalSettingsModal({
  onClose
}) {
  const [tab, setTab] = useState('css');
  return /*#__PURE__*/React.createElement("div", {
    className: "v2-modal-backdrop",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-modal v2-modal-lg",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-modal-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-modal-title"
  }, "⚙ Globální nastavení webu"), /*#__PURE__*/React.createElement("button", {
    className: "v2-icon-btn",
    onClick: onClose
  }, "✕")), /*#__PURE__*/React.createElement("div", {
    className: "v2-modal-tabs"
  }, /*#__PURE__*/React.createElement("button", {
    className: `v2-panel-tab ${tab === 'css' ? 'active' : ''}`,
    onClick: () => setTab('css')
  }, "Globální CSS"), /*#__PURE__*/React.createElement("button", {
    className: `v2-panel-tab ${tab === 'ga4' ? 'active' : ''}`,
    onClick: () => setTab('ga4')
  }, "Google Analytics")), /*#__PURE__*/React.createElement("div", {
    className: "v2-modal-body"
  }, tab === 'css' ? /*#__PURE__*/React.createElement(GlobalCssPanel, null) : /*#__PURE__*/React.createElement(GA4Panel, null))));
}

// ─────────────────────────────────────────────
//  HLAVNÍ APLIKACE
// ─────────────────────────────────────────────
function AppV2({
  onLogout
}) {
  const [pages, setPages] = useState(() => loadPages());
  // Baseline = původní (publikovaný) stav pro detekci změn ve stagingu
  const [baseline] = useState(() => {
    try {
      var saved = localStorage.getItem('ffy-baseline');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    // Poprvé: ulož aktuální stav jako baseline
    var initial = loadPages();
    var snap = {};
    initial.forEach(function (p) {
      snap[p.id] = JSON.stringify({
        blocks: p.blocks,
        meta: p.meta,
        customCss: p.customCss
      });
    });
    try {
      localStorage.setItem('ffy-baseline', JSON.stringify(snap));
    } catch (e) {}
    return snap;
  });
  const [activeId, setActiveId] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [device, setDevice] = useState('desktop');
  const [showAdd, setShowAdd] = useState(false);
  const [unlocked, setUnlocked] = useState({});
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [leftW, setLeftW] = useState(260);
  const [rightW, setRightW] = useState(320);
  const [assetPanel, setAssetPanel] = useState(null); // 'media' | 'docs' | 'css' | null
  const [showGlobal, setShowGlobal] = useState(false);
  const [metaMode, setMetaMode] = useState(false); // pravý panel: metadata místo inspektoru
  const [showNewPage, setShowNewPage] = useState(false);
  const [showStaging, setShowStaging] = useState(false);
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

  // Změnila se stránka oproti publikovanému stavu?
  function isChanged(page) {
    if (page.source === 'new') return false; // nová = zvlášť kategorie
    const base = baseline[page.id];
    if (!base) return true; // není v baseline = nová/změněná
    const current = JSON.stringify({
      blocks: page.blocks,
      meta: page.meta,
      customCss: page.customCss
    });
    return current !== base;
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

  // ── Správa stránek ──
  function createPage(tpl) {
    const blocks = [];
    const isBlog = tpl.category === 'blog';
    if (!isBlog) {
      blocks.push({
        id: generateId(),
        type: 'page_header',
        props: {
          ...BLOCK_REGISTRY.page_header.defaults
        }
      });
    }
    (tpl.blocks || []).forEach(b => {
      blocks.push({
        id: generateId(),
        type: b.type,
        props: JSON.parse(JSON.stringify(b.props))
      });
    });
    const rnd = Math.random().toString(36).substr(2, 4);
    const slug = isBlog ? 'blog/novy-clanek-' + rnd : 'nova-stranka-' + rnd;
    const page = {
      id: generateId(),
      source: 'new',
      wrapper: 'sdileni',
      meta: {
        title: (isBlog ? 'Nový článek' : 'Nová stránka') + ' — FREE for YOU',
        description: '',
        slug: slug,
        canonical: '',
        robots: 'index, follow'
      },
      blocks: blocks
    };
    setPages([...pages, page]);
    setActiveId(page.id);
    setSelectedBlock(null);
    setShowNewPage(false);
  }
  function deletePage(id) {
    const page = pages.find(p => p.id === id);
    if (!page) return;
    if (page.source !== 'new') {
      alert('Živé stránky webu nelze mazat z editoru — jsou chráněné. Smazat jde jen nové (nepublikované) stránky.');
      return;
    }
    if (!confirm('Opravdu smazat stránku „' + page.meta.title.split('—')[0].trim() + '"?')) return;
    setPages(pages.filter(p => p.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setSelectedBlock(null);
    }
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
    }, g.label), gp.map(p => /*#__PURE__*/React.createElement("div", {
      key: p.id,
      className: `v2-page-menu-item ${p.id === activeId ? 'active' : ''}`,
      onClick: () => {
        setActiveId(p.id);
        setSelectedBlock(null);
        setPageMenuOpen(false);
      }
    }, isLocked(p) && /*#__PURE__*/React.createElement("span", {
      className: "v2-lock-mini"
    }, "🔒"), /*#__PURE__*/React.createElement("span", {
      className: "v2-page-menu-name"
    }, p.meta.title.split('—')[0].split('|')[0].trim()), p.source === 'new' && /*#__PURE__*/React.createElement("button", {
      className: "v2-icon-btn v2-del v2-page-del",
      onClick: e => {
        e.stopPropagation();
        deletePage(p.id);
      },
      title: "Smazat stránku"
    }, "✕"))));
  }), /*#__PURE__*/React.createElement("button", {
    className: "v2-page-menu-new",
    onClick: () => {
      setShowNewPage(true);
      setPageMenuOpen(false);
    }
  }, "+ Vytvořit novou stránku"))), /*#__PURE__*/React.createElement("div", {
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
  }, "▮")), /*#__PURE__*/React.createElement("button", {
    className: "v2-btn v2-btn-stage",
    onClick: () => setShowStaging(true),
    title: "Náhled celého webu před publikací"
  }, "◔ Staging"), activePage && locked && /*#__PURE__*/React.createElement("button", {
    className: "v2-btn v2-btn-warn",
    onClick: () => unlockPage(activePage)
  }, "🔓 Odemknout"), activePage && !locked && /*#__PURE__*/React.createElement("button", {
    className: "v2-btn v2-btn-primary",
    onClick: () => setShowAdd(true)
  }, "+ Přidat blok"), /*#__PURE__*/React.createElement("button", {
    className: "v2-btn v2-btn-ghost",
    onClick: () => setShowGlobal(true),
    title: "Globální nastavení"
  }, "⚙ Nastavení"), /*#__PURE__*/React.createElement("a", {
    className: "v2-btn v2-btn-ghost",
    href: "../index.html"
  }, "← Stará verze"), onLogout && /*#__PURE__*/React.createElement("button", {
    className: "v2-btn v2-btn-ghost",
    onClick: onLogout,
    title: "Odhlásit"
  }, "⏻")), /*#__PURE__*/React.createElement("div", {
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
    device: device,
    locked: locked
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
    className: `v2-panel-tab ${!metaMode && assetPanel !== 'css' ? 'active' : ''}`,
    onClick: () => {
      setMetaMode(false);
      setAssetPanel(null);
    }
  }, "Vlastnosti"), /*#__PURE__*/React.createElement("button", {
    className: `v2-panel-tab ${metaMode ? 'active' : ''}`,
    onClick: () => {
      setMetaMode(true);
      setAssetPanel(null);
    }
  }, "Metadata"), /*#__PURE__*/React.createElement("button", {
    className: `v2-panel-tab ${assetPanel === 'css' ? 'active' : ''}`,
    onClick: () => {
      setAssetPanel('css');
      setMetaMode(false);
    }
  }, "CSS")), metaMode ? /*#__PURE__*/React.createElement(MetaPanel, {
    page: activePage,
    locked: locked,
    onUpdate: meta => {
      if (!activePage || isLocked(activePage)) return;
      setPages(pages.map(p => p.id === activeId ? {
        ...p,
        meta
      } : p));
    }
  }) : assetPanel === 'css' ? /*#__PURE__*/React.createElement(CssPanel, {
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
  }), showGlobal && /*#__PURE__*/React.createElement(GlobalSettingsModal, {
    onClose: () => setShowGlobal(false)
  }), showNewPage && /*#__PURE__*/React.createElement(NewPageModal, {
    onCreate: createPage,
    onClose: () => setShowNewPage(false)
  }), showStaging && /*#__PURE__*/React.createElement(StagingModal, {
    pages: pages,
    isChanged: isChanged,
    onClose: () => setShowStaging(false),
    onPublished: () => {
      // Po publikaci: aktualizuj baseline na aktuální stav
      const snap = {};
      pages.forEach(p => {
        snap[p.id] = JSON.stringify({
          blocks: p.blocks,
          meta: p.meta,
          customCss: p.customCss
        });
      });
      try {
        localStorage.setItem('ffy-baseline', JSON.stringify(snap));
      } catch (e) {}
      window.location.reload();
    }
  }));
}

// ─────────────────────────────────────────────
//  LOGIN (klientská vrstva + příprava pro server)
// ─────────────────────────────────────────────
function LoginGate() {
  const [authed, setAuthed] = useState(() => {
    // Session token v sessionStorage (vydrží do zavření karty)
    return sessionStorage.getItem('ffy-auth') === '1';
  });
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [checking, setChecking] = useState(false);
  function submit(e) {
    e.preventDefault();
    setChecking(true);
    setErr('');
    // Zkus server login (IT dodá /api/login), jinak lokální heslo
    FFYApi.login(pwd).then(res => {
      setChecking(false);
      if (res.ok) {
        sessionStorage.setItem('ffy-auth', '1');
        setAuthed(true);
      } else {
        setErr(res.message || 'Nesprávné heslo');
        setPwd('');
      }
    });
  }
  function logout() {
    sessionStorage.removeItem('ffy-auth');
    setAuthed(false);
  }
  if (authed) {
    return /*#__PURE__*/React.createElement(AppV2, {
      onLogout: logout
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "v2-login"
  }, /*#__PURE__*/React.createElement("form", {
    className: "v2-login-box",
    onSubmit: submit
  }, /*#__PURE__*/React.createElement("div", {
    className: "v2-login-brand"
  }, "FFY Builder"), /*#__PURE__*/React.createElement("div", {
    className: "v2-login-sub"
  }, "Editor webu — přihlášení"), /*#__PURE__*/React.createElement("input", {
    className: "v2-login-input",
    type: "password",
    value: pwd,
    onChange: e => setPwd(e.target.value),
    placeholder: "Heslo",
    autoFocus: true
  }), err && /*#__PURE__*/React.createElement("div", {
    className: "v2-login-err"
  }, err), /*#__PURE__*/React.createElement("button", {
    className: "v2-btn v2-btn-primary v2-login-btn",
    type: "submit",
    disabled: checking
  }, checking ? 'Ověřuji…' : 'Přihlásit se'), /*#__PURE__*/React.createElement("div", {
    className: "v2-login-note"
  }, "Přístup je chráněný. Skutečné zabezpečení zajišťuje server — viz poznámky pro IT.")));
}
ReactDOM.createRoot(document.getElementById('v2-root')).render(/*#__PURE__*/React.createElement(LoginGate, null));