/* MW Design — shared behaviour: lightbox, scroll rails, reveal-on-scroll, apps menu, home filters. */
(function () {
  // Lightbox for any screenshot in a gallery, rail or device row.
  const zoomable = document.querySelectorAll('.shot img, .rail img, .device img, img[data-zoom]');
  if (zoomable.length) {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-label', 'Enlarged screenshot');
    lb.innerHTML = '<img alt="">';
    document.body.appendChild(lb);
    const big = lb.querySelector('img');
    const close = () => lb.classList.remove('open');
    zoomable.forEach(img => img.addEventListener('click', () => {
      big.src = img.dataset.full || img.currentSrc || img.src;
      big.alt = img.alt;
      lb.classList.add('open');
    }));
    lb.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  // Previous / next buttons for horizontal rails.
  document.querySelectorAll('[data-rail]').forEach(nav => {
    const rail = document.getElementById(nav.dataset.rail);
    if (!rail) return;
    const step = dir => rail.scrollBy({ left: dir * rail.clientWidth * 0.8, behavior: 'smooth' });
    nav.querySelector('[data-dir="-1"]').addEventListener('click', () => step(-1));
    nav.querySelector('[data-dir="1"]').addEventListener('click', () => step(1));
  });

  // Close the Apps menu when clicking elsewhere.
  document.addEventListener('click', e => {
    document.querySelectorAll('details.menu[open]').forEach(d => { if (!d.contains(e.target)) d.removeAttribute('open'); });
  });

  // Home page platform filters.
  const filters = document.querySelectorAll('.filters button');
  filters.forEach(btn => btn.addEventListener('click', () => {
    filters.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    const f = btn.dataset.filter;
    document.querySelectorAll('.app-card').forEach(card => {
      card.hidden = f !== 'all' && !card.dataset.tags.split(' ').includes(f);
    });
  }));

  // Gentle reveal as sections scroll into view.
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }
})();
