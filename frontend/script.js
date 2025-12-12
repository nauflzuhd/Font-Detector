const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const preview = document.getElementById('preview');
const resultDiv = document.getElementById('result-area');
const fontName = document.getElementById('font-name');
const sampleText = document.getElementById('sample-text');
const confidence = document.getElementById('confidence');
const loading = document.getElementById('loading');
const resetBtn = document.getElementById('reset-btn');

// Konfigurasi API backend Flask
const API_BASE_URL = 'http://localhost:5000';

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

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Prediksi gagal');
    }

    const result = data.result;
    const label = result.label || 'Unknown';
    const conf = (result.confidence || 0) * 100;

    fontName.textContent = label;
    sampleText.textContent = 'The quick brown fox jumps over the lazy dog';
    sampleText.style.fontFamily = `"${label}", sans-serif`;
    confidence.innerHTML = `<i class="fas fa-chart-line"></i> Akurasi: ${conf.toFixed(1)}%`;

    resultDiv.style.display = 'block';
  } catch (err) {
    console.error(err);
    alert('Terjadi kesalahan saat memproses gambar: ' + err.message);
    uploadArea.style.display = 'block';
  } finally {
    loading.style.display = 'none';
  }
}