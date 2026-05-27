# Validation Summary: How to Run ML Inference at the Edge with Google Cloud Vertex AI and Edge TPU

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI custom training
- Vertex AI SDK for Python
- TensorFlow and TensorFlow Lite full integer quantization
- Coral Edge TPU and Edge TPU Compiler
- PyCoral inference API
- Cloud Storage
- Pub/Sub
- BigQuery feedback loop concept

## Sources Consulted
- Vertex AI training code requirements: https://cloud.google.com/vertex-ai/docs/training/code-requirements
- Vertex AI SDK `CustomTrainingJob` reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.CustomTrainingJob
- Vertex AI custom training overview: https://cloud.google.com/vertex-ai/docs/training/overview
- Coral TensorFlow models on the Edge TPU: https://www.coral.ai/docs/edgetpu/models-intro/
- Coral Edge TPU Compiler reference: https://www.coral.ai/docs/edgetpu/compiler
- Coral Edge TPU inferencing overview: https://www.coral.ai/docs/edgetpu/inference/
- Coral PyCoral software installation: https://www.coral.ai/software/
- TensorFlow Lite integer quantization guidance: https://www.tensorflow.org/lite/performance/post_training_integer_quant
- Cloud Storage object metadata with `gsutil`: https://cloud.google.com/storage/docs/gsutil/addlhelp/WorkingWithObjectMetadata

## Issues Found

1. **Incorrect PyCoral installation command.** The post used `pip install ... pycoral`, but the `pycoral` package on the default PyPI index is not Google's Coral PyCoral package. Updated the install instructions to install Google Cloud packages separately and install PyCoral from Coral's official extra package index with `pycoral~=2.0`.

2. **Overbroad Python prerequisite for edge devices.** The post said Python 3.8+, but Coral's PyCoral package is documented for specific older Python versions, including Python 3.8 and 3.9. Updated the prerequisite to state Python 3.8 or 3.9 for the edge device.

3. **Missing Edge TPU runtime/compiler prerequisite.** The post used `edgetpu_compiler` and PyCoral Edge TPU inference but did not explicitly list the Edge TPU runtime and compiler as prerequisites. Added that prerequisite.

4. **Overstated Edge TPU operation compatibility claim.** The training code docstring claimed the model uses only operations supported by the Edge TPU compiler. Coral's docs require confirming the compiler report because unsupported operations may compile only partially and then run on CPU. Changed the wording to tell readers to check the compiled model report before deployment.

5. **Unused Vertex AI training argument.** The job submission passed `args=["--epochs=50"]`, but `train.py` did not parse command-line arguments. Removed the unused argument because the script already hardcodes `epochs=50`.

6. **Representative dataset caveat.** The quantization code used random samples without making clear that calibration data should match the real training/evaluation input range. Updated the comments/docstring to state that real validation-set calibration samples should be used.

7. **Quantized preprocessing could wrap instead of saturating.** The edge preprocessing cast scaled values directly to `np.uint8`; values outside `[0, 255]` would wrap around. Updated it to round and clip before casting.

## Review Notes
- The high-level Vertex AI to TFLite to Edge TPU workflow is technically valid: train in Vertex AI, export a SavedModel, convert to a fully quantized TFLite model, compile with `edgetpu_compiler`, and run inference with PyCoral.
- The `CustomTrainingJob` usage, prebuilt TensorFlow container pattern, `AIP_MODEL_DIR` usage, and `base_output_dir` behavior are consistent with Vertex AI SDK documentation.
- The `gsutil -h "x-goog-meta-..." cp ...` metadata pattern is valid for setting custom Cloud Storage object metadata.
- The edge inference sample still contains placeholder functions (`read_vibration_sensor()` and `trigger_local_alarm()`), which is acceptable for a tutorial but would need real implementations in production.
