import { api, escapeHtml, toast } from './api.js';
import { state } from './state.js';

function installRatings() {
  document.querySelectorAll('.rating').forEach((button) =>
    button.addEventListener('click', () => {
      document.querySelectorAll('.rating').forEach((item) => item.classList.remove('selected'));
      button.classList.add('selected');
      document.querySelector('input[name="rating"]').value = button.dataset.rating;
    }),
  );
}

function installPhotoPicker() {
  document.querySelector('#photo').addEventListener('change', (event) => {
    const file = event.target.files[0];
    document.querySelector('#photoName').textContent = file ? file.name : '';
  });
  document.querySelector('#complaintPhoto').addEventListener('change', (event) => {
    const file = event.target.files[0];
    document.querySelector('#complaintPhotoName').textContent = file ? file.name : '';
  });
}

export function initializeReportForms() {
  installRatings();
  installPhotoPicker();
  document.querySelector('#reportForm').addEventListener('submit', submitPriceReport);
  document.querySelector('#complaintForm').addEventListener('submit', submitComplaint);
  document.querySelector('#reportCity').addEventListener('change', updateReportCurrency);
  document.querySelectorAll('.cities').forEach((select) => {
    select.addEventListener('change', () => {
      if (select.id === 'reportCity') updateReportCurrency({ target: select });
    });
  });
  document.querySelector('#reportCurrency').textContent = state.config.cities[0].currency;
}

function updateReportCurrency(event) {
  const city = state.config.cities.find((item) => item.name === event.target.value);
  document.querySelector('#reportCurrency').textContent = city?.currency || '₹';
}

async function submitPriceReport(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = Object.fromEntries(new FormData(form));
  const photo = document.querySelector('#photo').files[0];
  if (photo && photo.size > 5 * 1024 * 1024) return toast('Choose an image smaller than 5 MB.');
  const report = {
    city: fields.city,
    service_type: fields.service_type,
    price_paid: Number(fields.price_paid),
    distance_km: Number(fields.distance_km),
    location: fields.location,
    notes: fields.notes,
    rating: fields.rating,
    origin: { name: fields.location, ...(state.origin || {}) },
    destination: { name: fields.location, ...(state.destination || {}) },
  };
  if (photo) {
    report.photo_name = photo.name;
    report.photo_data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(photo);
    });
  }
  try {
    await api('/api/reports', { method: 'POST', body: JSON.stringify(report) });
    document.querySelector('#reportSuccess').classList.remove('hidden');
    form.reset();
    document.querySelectorAll('.cities').forEach((select) => {
      select.value = fields.city;
    });
    document.querySelector('.rating').click();
    document.querySelector('#photoName').textContent = '';
    updateReportCurrency({ target: document.querySelector('#reportCity') });
    window.dispatchEvent(new Event('farewise:data-updated'));
    toast('Your price was added to the local fare data.');
  } catch (error) {
    toast(error.message);
  }
}

async function submitComplaint(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = Object.fromEntries(new FormData(form));
  const photo = document.querySelector('#complaintPhoto').files[0];
  if (photo && photo.size > 5 * 1024 * 1024) return toast('Choose an image smaller than 5 MB.');
  const city = state.config.cities.find((item) => item.name === fields.city);
  const complaint = {
    ...fields,
    lat: state.currentPosition?.lat ?? city.lat,
    lng: state.currentPosition?.lng ?? city.lng,
    severity: 4,
  };
  if (photo) {
    complaint.photo_name = photo.name;
    complaint.photo_data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(photo);
    });
  }
  try {
    await api('/api/complaints', {
      method: 'POST',
      body: JSON.stringify(complaint),
    });
    form.reset();
    document.querySelector('#complaintPhotoName').textContent = '';
    window.dispatchEvent(new Event('farewise:data-updated'));
    toast('Your safety tip was added to the community map.');
  } catch (error) {
    toast(error.message);
  }
}

function categoryIcon(category) {
  return category === 'fake_guide'
    ? '🧭'
    : category === 'hidden_charge'
      ? '🧾'
      : category === 'meter_tampering'
        ? '🚕'
        : category === 'fake_closure'
          ? '🚧'
          : '⚑';
}

export async function loadTrapDatabase() {
  const city = document.querySelector('#trapCity').value;
  const type = document.querySelector('#trapType').value;
  const service = document.querySelector('#trapService').value;
  const query = document.querySelector('#trapSearch').value.toLowerCase();
  const grid = document.querySelector('#trapGrid');
  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML =
    '<div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>';
  try {
    const traps = await api(
      '/api/traps?city=' +
        encodeURIComponent(city) +
        '&type=' +
        encodeURIComponent(type) +
        '&service=' +
        encodeURIComponent(service),
    );
    const filtered = traps.filter((trap) =>
      (trap.title + ' ' + trap.location + ' ' + trap.description + ' ' + trap.tips)
        .toLowerCase()
        .includes(query),
    );
    grid.innerHTML =
      filtered
        .map(
          (trap) =>
            '<article class="trap-card"><div class="trap-top"><span class="trap-emoji">' +
            categoryIcon(trap.category) +
            '</span><span class="severity ' +
            (trap.severity < 4 ? 'low' : '') +
            '">' +
            (trap.severity >= 4 ? 'Heads up' : 'Good to know') +
            '</span></div><h3>' +
            escapeHtml(trap.title) +
            '</h3><div class="trap-location">⌖ ' +
            escapeHtml(trap.city) +
            ' · ' +
            escapeHtml(trap.location) +
            '</div><p>' +
            escapeHtml(trap.description) +
            '</p><div class="tip-line"><b>✳ Traveler tip</b><br>' +
            escapeHtml(trap.tips) +
            '</div><div class="report-count">◎ ' +
            escapeHtml(trap.typical_overcharge_pct || 20) +
            '% typical overcharge · ' +
            escapeHtml(trap.report_count) +
            ' traveler reports</div></article>',
        )
        .join('') ||
      '<div class="empty-card"><span>⌖</span><h3>No reports match those filters yet</h3>' +
        '<p>Try a nearby city or clear the search. You can also share a local tip.</p>' +
        '<button class="text-btn" data-nav="report">Share a report ↗</button></div>';
  } catch {
    grid.innerHTML = '<p class="empty-state">The community database is unavailable right now.</p>';
  } finally {
    grid.setAttribute('aria-busy', 'false');
  }
}

export function setupTrapFilters() {
  ['#trapCity', '#trapType', '#trapService'].forEach((selector) => {
    document.querySelector(selector).addEventListener('change', loadTrapDatabase);
  });
  let timer;
  document.querySelector('#trapSearch').addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(loadTrapDatabase, 180);
  });
  window.addEventListener('farewise:data-updated', loadTrapDatabase);
}
