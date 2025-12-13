from tensorflow.keras.models import load_model

# nama file model yang sekarang kamu pakai di backend
MODEL_IN = "model_cnn_variatif_final2.keras"
MODEL_OUT = "model_cnn_variatif_final2_railway.keras"

print("Loading model from", MODEL_IN)
model = load_model(MODEL_IN, safe_mode=False)
print("Saving model to", MODEL_OUT)
model.save(MODEL_OUT)
print("Done.")