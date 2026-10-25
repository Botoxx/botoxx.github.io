// Copy text, falling back to selecting it when the clipboard is refused.
export const copyText = (text, selectEl, btn, idle) => {
  const label = btn.querySelector('span') || btn;
  const done = msg => { label.textContent = msg; setTimeout(() => { label.textContent = idle; }, 2000); };
  const select = () => {
    if (selectEl.select) { selectEl.focus(); selectEl.select(); }
    else { const r = document.createRange(); r.selectNodeContents(selectEl); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    const touch = matchMedia('(pointer: coarse)').matches, mac = /Mac|iPhone|iPad/.test(navigator.platform);
    done(touch ? 'Selected, use Copy' : `Selected, press ${mac ? '⌘C' : 'Ctrl+C'}`);
  };
  try { navigator.clipboard.writeText(text).then(() => done('Copied'), select); } catch { select(); }
};
