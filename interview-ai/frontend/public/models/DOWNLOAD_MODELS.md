# Download face-api.js models here

Run this from inside `frontend/public/models/`:

```bash
BASE="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
curl -O $BASE/tiny_face_detector_model-shard1
curl -O $BASE/tiny_face_detector_model-weights_manifest.json
curl -O $BASE/face_landmark_68_tiny_model-shard1
curl -O $BASE/face_landmark_68_tiny_model-weights_manifest.json
```

Or download manually from:
https://github.com/justadudewhohacks/face-api.js/tree/master/weights

You need exactly these 4 files in this folder. Without them, face/gaze
detection silently disables itself (app still works, just no face checks).
