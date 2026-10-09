const pages = {
  check: 'checkView',
  result: 'resultView',
  map: 'mapView',
  traps: 'trapsView',
  report: 'reportView',
};
export function navigate(page) {
  document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
  document.querySelector('#' + pages[page]).classList.add('active');
  document
    .querySelectorAll('.nav-item')
    .forEach((button) => button.classList.toggle('active', button.dataset.nav === page));
  document
    .querySelectorAll('.desktop-link')
    .forEach((button) => button.classList.toggle('active', button.dataset.nav === page));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.dispatchEvent(new CustomEvent('farewise:page', { detail: page }));
}
export function initializeNavigation() {
  document.addEventListener('click', (event) => {
    const control = event.target.closest('[data-nav]');
    if (!control) return;
    event.preventDefault();
    navigate(control.dataset.nav);
  });
  document.addEventListener('farewise:navigate', (event) => navigate(event.detail));
}
