// ==============================
// MapMyProperty - main.js (Reorganized)
// ==============================

// ========== AUTH & UI ==========
const token = localStorage.getItem('token');
const logoutBtn = document.getElementById('logoutBtn');
const propertiesList = document.getElementById('propertiesList');
const formContainer = document.getElementById('formContainer');
const profileSection = document.getElementById('profileSection');
const profileDropdown = document.getElementById('profileDropdown');
const profileName = document.getElementById('profileName');

if (!token) {
  window.location.href = 'index.html';
} else {
  const savedUsername = localStorage.getItem('username') || 'User';
  profileName.textContent = savedUsername;
}

logoutBtn.onclick = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  window.location.href = 'index.html';
};

profileSection.onclick = () => {
  const isExpanded = profileSection.getAttribute('aria-expanded') === 'true';
  profileSection.setAttribute('aria-expanded', !isExpanded);
  profileDropdown.classList.toggle('show');
};

document.addEventListener('click', (e) => {
  if (!profileSection.contains(e.target)) {
    profileDropdown.classList.remove('show');
    profileSection.setAttribute('aria-expanded', false);
  }
});

// ========== MAP INITIALIZATION ==========
const map = L.map('map').setView([17.385044, 78.486671], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const markerLayer = L.layerGroup().addTo(map);

// ========== LOAD PROPERTIES ==========
function addPropertyToList(p) {
  const div = document.createElement('div');
  div.classList.add('property-card');
  const priceFormatted = !isNaN(parseFloat(p.price)) ? '₹' + parseFloat(p.price).toFixed(2) : 'Price N/A';
  div.innerHTML = `<strong>${p.title}</strong> - ${priceFormatted}<br>Contact: ${p.contact}`;
  propertiesList.appendChild(div);
}

function loadProperties() {
  propertiesList.innerHTML = 'Loading properties...';
  markerLayer.clearLayers();

  fetch('/api/properties', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data)) {
        propertiesList.textContent = 'Error loading properties';
        return;
      }
      propertiesList.innerHTML = '';
      data.forEach(property => {
        const marker = L.marker([property.lat, property.lng]);
        marker.bindPopup(`
          <strong>${property.title}</strong><br>
          ₹${parseFloat(property.price).toFixed(2)}<br>
          Contact: ${property.contact}
        `);
        marker.addTo(markerLayer);
        addPropertyToList(property);
      });
    })
    .catch(err => {
      console.error(err);
      propertiesList.textContent = 'Error loading properties';
    });
}

loadProperties();

// ========== ADD PROPERTY FORM ==========
map.on('click', function(e) {
  const lat = e.latlng.lat.toFixed(6);
  const lng = e.latlng.lng.toFixed(6);

  formContainer.style.display = 'block';
  formContainer.style.left = `${e.originalEvent.pageX}px`;
  formContainer.style.top = `${e.originalEvent.pageY}px`;

  formContainer.innerHTML = `
    <form id="addPropertyForm">
      <input type="text" name="title" placeholder="Title" required />
      <input type="number" name="price" placeholder="Price" required />
      <textarea name="description" placeholder="Description (optional)"></textarea>
      <input type="text" name="contact" placeholder="Contact Info" required />
      <input type="hidden" name="lat" value="${lat}" />
      <input type="hidden" name="lng" value="${lng}" />
      <button type="submit">Add Property</button>
      <button type="button" id="cancelBtn">Cancel</button>
    </form>
  `;

  document.getElementById('cancelBtn').onclick = () => {
    formContainer.style.display = 'none';
  };

  document.getElementById('addPropertyForm').onsubmit = function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());

    fetch('/api/properties', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(data)
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to add property');
      return res.json();
    })
    .then(result => {
      alert('Property added successfully!');
      formContainer.style.display = 'none';
      loadProperties();
    })
    .catch(err => {
      console.error(err);
      alert('Error adding property');
    });
  };
});

// ========== LOCATION SEARCH ==========
const searchBtn = document.getElementById('searchBtn');
const locationSearch = document.getElementById('locationSearch');

searchBtn.addEventListener('click', () => {
  const query = locationSearch.value.trim();
  if (!query) return;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        map.setView([parseFloat(lat), parseFloat(lon)], 14);
        loadProperties();
      } else {
        alert("Location not found!");
      }
    })
    .catch(err => {
      console.error("Search failed:", err);
      alert("Failed to search location.");
    });
});
