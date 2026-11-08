// Kung-Fu Master 3D promo-code giveaway. The codes live in a private Google Sheet behind a
// Google Apps Script web app; this page only asks it for one. No codes are stored in this repo.
(function () {
  const CONFIG = {
    api: '',              // Apps Script web app URL (ends in /exec). Empty: the giveaway shows as not open yet.
    turnstileSiteKey: '', // optional Cloudflare Turnstile site key (bot check)
  };

  // Local testing only: ?api=http://localhost:8787/exec&turnstile=<site key>
  const qs = new URLSearchParams(location.search);
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
    if (qs.get('api')) CONFIG.api = qs.get('api');
    if (qs.has('turnstile')) CONFIG.turnstileSiteKey = qs.get('turnstile');
  }

  const KEY = 'kfm3d-giveaway';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };
  const state = load();
  if (!state.cid) {
    state.cid = (crypto.randomUUID && crypto.randomUUID()) ||
      Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
    save(state);
  }

  const $ = (id) => document.getElementById(id);
  const btn = $('gw-get'), msg = $('gw-msg'), left = $('gw-left'), result = $('gw-result'), bot = $('gw-bot');
  const CODE_RE = /^[A-Z0-9]{6,20}$/;
  let token = '';
  let widget = null;

  const say = (text, kind) => { msg.textContent = text; msg.dataset.kind = kind || ''; };
  const minutes = (s) => { const m = Math.max(1, Math.ceil(s / 60)); return m === 1 ? 'a minute' : m + ' minutes'; };
  const ERRORS = {
    closed: 'The giveaway is closed right now. Please check back soon.',
    bot: 'The quick check didn’t go through. Please try again.',
    bad_request: 'Something went wrong. Please reload the page and try again.',
  };

  function showCode(code, again) {
    $('gw-code').textContent = code;
    $('gw-redeem').href = 'https://apps.apple.com/redeem?code=' + encodeURIComponent(code);
    $('gw-again').hidden = !again;
    result.hidden = false;
    btn.hidden = true;
    bot.hidden = true;
    left.hidden = true;
    say('');
  }

  function closed(text) {
    btn.disabled = true;
    btn.textContent = 'Giveaway not open';
    bot.hidden = true;
    say(text);
  }

  // All codes gone: point people to the App Store instead.
  function soldOut() {
    btn.hidden = true;
    bot.hidden = true;
    left.hidden = true;
    say('');
    $('gw-soldout').hidden = false;
  }

  async function call(body) {
    const res = await fetch(CONFIG.api, { method: 'POST', body: JSON.stringify(body) }); // text/plain: no preflight
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  async function status() {
    try {
      const r = await call({ action: 'status' });
      if (!r.open) return r.error === 'gone' ? soldOut() : closed(ERRORS[r.error] || ERRORS.closed);
      left.textContent = r.left === 1 ? '1 code left' : r.left + ' codes left';
      left.hidden = false;
    } catch (e) { /* the claim will report any real problem */ }
  }

  async function claim() {
    btn.disabled = true;
    btn.textContent = 'Getting your code…';
    say('');
    try {
      const r = await call({ action: 'claim', cid: state.cid, token });
      if (r.ok && CODE_RE.test(r.code)) {
        state.code = r.code;
        save(state);
        return showCode(r.code, r.again);
      }
      if (r.error === 'gone') return soldOut();
      if (r.error === 'closed') return closed(ERRORS.closed);
      say(r.error === 'limit'
        ? 'Lots of people are grabbing codes right now. Please try again in ' + minutes(r.retrySeconds || 60) + '.'
        : ERRORS[r.error] || ERRORS.bad_request, 'warn');
    } catch (e) {
      say('Couldn’t reach the giveaway. Check your connection and try again.', 'warn');
    }
    btn.textContent = 'Get my free code';
    if (widget !== null && window.turnstile) { token = ''; window.turnstile.reset(widget); }
    btn.disabled = !!CONFIG.turnstileSiteKey && !token;
  }

  $('gw-copy').addEventListener('click', async () => {
    const code = $('gw-code').textContent;
    try { await navigator.clipboard.writeText(code); $('gw-copy').textContent = 'Copied'; }
    catch (e) { getSelection().selectAllChildren($('gw-code')); }
    setTimeout(() => { $('gw-copy').textContent = 'Copy'; }, 1800);
  });
  btn.addEventListener('click', claim);

  if (state.code && CODE_RE.test(state.code)) return showCode(state.code, true);
  if (!CONFIG.api) return closed('The giveaway hasn’t started yet. Please check back soon.');

  if (CONFIG.turnstileSiteKey) {
    btn.disabled = true;
    bot.hidden = false;
    window.gwTurnstileReady = () => {
      widget = window.turnstile.render('#gw-bot', {
        sitekey: CONFIG.turnstileSiteKey, theme: 'dark',
        callback: (t) => { token = t; btn.disabled = false; },
        'expired-callback': () => { token = ''; btn.disabled = true; },
      });
    };
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=gwTurnstileReady';
    s.async = true;
    document.head.appendChild(s);
  }
  status();
})();
