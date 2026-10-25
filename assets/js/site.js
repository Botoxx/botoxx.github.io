// Every page: theme toggle and the footer's copy-address button.
import { copyText } from './lib/copy.js';

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const store = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

const toggle = document.getElementById('theme-toggle');
const setTheme = (t, animated) => {
  const apply = () => { root.dataset.theme = t; store.set('theme', t); toggle?.setAttribute('aria-pressed', String(t === 'dark')); };
  if (animated && document.startViewTransition && !reduce.matches) document.startViewTransition(apply);
  else apply();
};
if (toggle) {
  toggle.setAttribute('aria-pressed', String(root.dataset.theme === 'dark'));
  toggle.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true));
}
// Follow OS changes only until the visitor picks a theme.
matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
  if (!store.get('theme')) setTheme(e.matches ? 'light' : 'dark', false);
});

const copyBtn = document.getElementById('copy');
const email = document.getElementById('email');
if (copyBtn && email) copyBtn.addEventListener('click', () => copyText(email.textContent.trim(), email, copyBtn, 'Copy address'));
