const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const preview = document.getElementById('preview');
const resultDiv = document.getElementById('result-area');
const fontName = document.getElementById('font-name');
const confidence = document.getElementById('confidence');
const allProbsDiv = document.getElementById('all-probs');
const originalView = document.getElementById('original-view');
const normalizedView = document.getElementById('normalized-view');

const loading = document.getElementById('loading');
const resetBtn = document.getElementById('reset-btn');

// Konfigurasi API backend Flask
// Saat development: localhost
// Saat production (Vercel): ganti base URL ke backend Railway
const API_BASE_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://font-detector-production.up.railway.app';

// Klik area upload
uploadArea.addEventListener('click', () => fileInput.click());

// Drag & drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  uploadArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
  uploadArea.addEventListener(eventName, () => {
    uploadArea.style.background = 'linear-gradient(to bottom, #ffecec, #fff5f5)';
  }, false);
});

['dragleave', 'drop'].forEach(eventName => {
  uploadArea.addEventListener(eventName, () => {
    uploadArea.style.background = 'linear-gradient(to bottom, #fff9f9, #ffffff)';
  }, false);
});

uploadArea.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  if (files.length) processFile(files[0]);
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) processFile(e.target.files[0]);
});

resetBtn.addEventListener('click', () => {
  preview.style.display = 'none';
  resultDiv.style.display = 'none';
  uploadArea.style.display = 'block';
  if (allProbsDiv) allProbsDiv.innerHTML = '';
  if (originalView) originalView.src = '';
  if (normalizedView) normalizedView.src = '';
  fileInput.value = '';
});

function processFile(file) {
  if (!file.type.match('image.*')) {
    alert('❌ Harap unggah file gambar (JPG, PNG, atau WEBP).');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    preview.src = e.target.result;
    preview.style.display = 'block';

    // Simpan juga ke tampilan "Gambar Asli" di hasil
    if (originalView) {
      originalView.src = e.target.result;
    }
  };

  reader.readAsDataURL(file);

  sendToBackend(file);
}

async function sendToBackend(file) {
  loading.style.display = 'block';
  resultDiv.style.display = 'none';
  uploadArea.style.display = 'none';

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/api/predict`, {
      method: 'POST',
      body: formData
    });
    
    let data;
    try {
      data = await response.json();
    } catch (e) {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      throw e;
    }

    if (!response.ok || !data.success) {
      const backendError = data && data.error ? data.error : null;
      const message = backendError || `HTTP error! status: ${response.status}`;
      throw new Error(message);
    }

    const result = data.result;
    const label = result.label || 'Unknown';
    const conf = (result.confidence || 0) * 100;

    fontName.textContent = label;

    confidence.innerHTML = `<i class="fas fa-chart-line"></i> Akurasi: ${conf.toFixed(1)}%`;

    // Tampilkan gambar hasil preprocessing (normalized)
    if (normalizedView && result.normalized_image) {
      normalizedView.src = `data:image/png;base64,${result.normalized_image}`;
    }

    // Tampilkan semua probabilitas font
    if (allProbsDiv && Array.isArray(result.all_probs)) {
      const rows = result.all_probs
        .sort((a, b) => b.probability - a.probability)
        .map(item => {
          const p = (item.probability * 100).toFixed(1);
          return `<li><span class="font-label">${item.label}</span><span class="font-prob">${p}%</span></li>`;
        })
        .join('');

      allProbsDiv.innerHTML = `
        <h3><i class="fas fa-list"></i> Akurasi Semua Font</h3>
        <ul class="prob-list">${rows}</ul>
      `;
    }

    resultDiv.style.display = 'block';
  } catch (err) {
    console.error(err);
    alert('Terjadi kesalahan saat memproses gambar: ' + err.message);
    uploadArea.style.display = 'block';
  } finally {
    loading.style.display = 'none';
  }
}