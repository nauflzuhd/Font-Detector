from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import cv2
import os
import base64

# ================= KONFIGURASI =================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model_cnn_variatif_final2.keras")
DATASET_PATH = os.path.join(BASE_DIR, "dataset_font_variatif")  # opsional, jika ada
IMG_SIZE = (200, 200)

app = Flask(__name__)
CORS(app)

# ================= 1. LOAD MODEL =================
print("Memuat Model Final...")
model = None
class_names = []

try:
    # safe_mode=False diperlukan untuk model yang memiliki Lambda layer
    # Pastikan Anda hanya menggunakannya untuk model yang Anda percayai.
    model = load_model(MODEL_PATH, safe_mode=False)
    print("✅ Model berhasil dimuat dari", MODEL_PATH)
except Exception as e:
    print(f"ERROR load model: {e}")
    print("Pastikan file model .keras sudah ada di folder backend!")

# Load Label
if os.path.exists(DATASET_PATH):
    class_names = sorted([
        d for d in os.listdir(DATASET_PATH)
        if os.path.isdir(os.path.join(DATASET_PATH, d))
    ])
    print(f"Kelas Font dari folder dataset: {class_names}")
else:
    # Fallback jika folder dataset tidak ada
    class_names = ['arial', 'bauhaus93', 'comic', 'impact', 'times']
    print(f"Menggunakan kelas default: {class_names}")


# ================= 2. PREPROCESSING CANGGIH (ANTI-BUTA WARNA) =================
def preprocess_ultimate(image_path):
    # A. Buka Gambar Grayscale
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None

    # B. CONTRAST STRETCHING (SOLUSI MERAH-BIRU)
    img = cv2.normalize(img, None, 0, 255, cv2.NORM_MINMAX)

    # C. DETEKSI BACKGROUND PINTAR (CORNER CHECK)
    h, w = img.shape
    corners = [
        img[0:5, 0:5].mean(),       # Kiri Atas
        img[0:5, w-5:w].mean(),     # Kanan Atas
        img[h-5:h, 0:5].mean(),     # Kiri Bawah
        img[h-5:h, w-5:w].mean()    # Kanan Bawah
    ]
    avg_corner = np.mean(corners)

    # D. ATURAN INPUT MODEL:
    # Model dilatih dengan data: Background Putih, Teks Hitam.
    if avg_corner < 127:
        img = 255 - img

    # E. AUTO-CROP (Cari Teks)
    _, thresh_temp = cv2.threshold(
        img, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
    )
    coords = cv2.findNonZero(thresh_temp)

    if coords is not None:
        x, y, w_rect, h_rect = cv2.boundingRect(coords)
        pad = 10
        img_cropped = img[
            max(0, y - pad):min(img.shape[0], y + h_rect + pad),
            max(0, x - pad):min(img.shape[1], x + w_rect + pad)
        ]
    else:
        img_cropped = img

    # F. SQUARE PADDING (Agar Tidak Gepeng)
    h_c, w_c = img_cropped.shape
    max_dim = max(h_c, w_c)

    square_img = np.full((max_dim, max_dim), 255, dtype=np.uint8)

    cy, cx = (max_dim - h_c) // 2, (max_dim - w_c) // 2
    square_img[cy:cy + h_c, cx:cx + w_c] = img_cropped

    # G. RESIZE FINAL
    img_final = cv2.resize(square_img, IMG_SIZE, interpolation=cv2.INTER_AREA)

    return img_final


# ================= 3. FUNGSI PREDIKSI BACKEND =================
def predict_font(image_path):
    if model is None:
        raise RuntimeError("Model belum berhasil dimuat")

    processed_img = preprocess_ultimate(image_path)
    if processed_img is None:
        raise ValueError("Gagal membaca gambar")

    # Model Anda ternyata mengharapkan input grayscale (channel terakhir = 1).
    # Jadi cukup tambahkan dimensi channel, bukan dikonversi ke RGB.
    if len(processed_img.shape) == 2:
        processed_img_expanded = np.expand_dims(processed_img, axis=-1)
    else:
        processed_img_expanded = processed_img

    img_array = image.img_to_array(processed_img_expanded)
    img_batch = np.expand_dims(img_array, axis=0)

    predictions = model.predict(img_batch)[0]
    idx = int(np.argmax(predictions))
    label = class_names[idx] if 0 <= idx < len(class_names) else str(idx)
    confidence = float(np.max(predictions))

    # Top 3 probabilitas
    top_indices = np.argsort(predictions)[::-1][:3]
    top3 = [
        {
            "label": class_names[i] if 0 <= i < len(class_names) else str(i),
            "probability": float(predictions[i])
        }
        for i in top_indices
    ]

    # Semua probabilitas kelas
    all_probs = [
        {
            "label": class_names[i] if 0 <= i < len(class_names) else str(i),
            "probability": float(predictions[i])
        }
        for i in range(len(predictions))
    ]

    # Encode gambar normalized sebagai PNG base64 untuk ditampilkan di frontend
    try:
        _, buf = cv2.imencode('.png', processed_img)
        normalized_b64 = base64.b64encode(buf).decode('utf-8')
    except Exception:
        normalized_b64 = None

    return {
        "label": label,
        "confidence": confidence,
        "top3": top3,
        "all_probs": all_probs,
        "normalized_image": normalized_b64,
    }


# ================= 4. ENDPOINT FLASK =================
@app.route("/api/predict", methods=["POST"])
def api_predict():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    # Simpan sementara di folder backend/tmp_uploads
    upload_dir = os.path.join(BASE_DIR, "tmp_uploads")
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, file.filename)
    file.save(file_path)

    try:
        result = predict_font(file_path)
        return jsonify({"success": True, "result": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        # Hapus file setelah diproses
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            # kalau gagal hapus tidak masalah, cuma file temp
            pass


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "model_loaded": model is not None,
        "classes": class_names,
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
