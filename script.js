const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const preview = document.getElementById('preview');
const resultDiv = document.getElementById('result-area');
const fontName = document.getElementById('font-name');
const sampleText = document.getElementById('sample-text');
const confidence = document.getElementById('confidence');
const loading = document.getElementById('loading');
const resetBtn = document.getElementById('reset-btn');

// Mock font database
const mockFonts = [
  { name: "Helvetica", sample: "The quick brown fox jumps over the lazy dog" },
  { name: "Times New Roman", sample: "Sphinx of black quartz, judge my vow." },
  { name: "Arial", sample: "Pack my box with five dozen liquor jugs." },
  { name: "Georgia", sample: "How vexingly quick daft zebras jump!" },
  { name: "Courier New", sample: "Bright vixens jump; dozy fowl quack." },
  { name: "Verdana", sample: "Jived fox nymph grabs quick waltz." },
  { name: "Comic Sans MS", sample: "Quirky spud boys jam fox whiz!" },
  { name: "Roboto", sample: "Waltz, bad nymph, for quick jigs!" },
  { name: "Open Sans", sample: "Glib jocks quiz nymph to vex dwarf." }
];

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

  simulateDetection();
}

function simulateDetection() {
  loading.style.display = 'block';
  resultDiv.style.display = 'none';
  uploadArea.style.display = 'none'; 

  setTimeout(() => {
    const randomFont = mockFonts[Math.floor(Math.random() * mockFonts.length)];
    const conf = (0.80 + Math.random() * 0.19).toFixed(3);

    fontName.textContent = randomFont.name;
    sampleText.textContent = randomFont.sample;
    sampleText.style.fontFamily = `"${randomFont.name}", sans-serif`;
    confidence.innerHTML = `<i class="fas fa-chart-line"></i> Akurasi: ${(conf * 100).toFixed(1)}%`;

    resultDiv.style.display = 'block';
    loading.style.display = 'none';
  }, 1800);
}