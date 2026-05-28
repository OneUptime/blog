# Validation Summary: How to Deploy Edge AI Models on Google Coral Edge TPU

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Coral Edge TPU
- Coral USB Accelerator and Dev Board
- Edge TPU runtime and compiler
- PyCoral
- TensorFlow Lite integer quantization
- Google Cloud Pub/Sub
- Google Cloud Storage
- Cloud Monitoring
- gsutil

## Sources Consulted
- Coral USB Accelerator get-started guide: https://www.coral.ai/docs/accelerator/get-started/
- Coral Edge TPU compiler documentation: https://www.coral.ai/docs/edgetpu/compiler/
- Coral TensorFlow models on the Edge TPU documentation: https://www.coral.ai/docs/edgetpu/models-intro/
- Coral PyCoral API reference: https://www.coral.ai/docs/reference/py/
- Coral PyCoral utilities reference: https://www.coral.ai/docs/reference/py/pycoral.utils/
- Coral PyCoral adapters reference: https://www.coral.ai/docs/reference/py/pycoral.adapters/
- Coral Edge TPU performance benchmarks: https://www.coral.ai/docs/edgetpu/benchmarks/
- TensorFlow Lite TFLiteConverter API reference: https://www.tensorflow.org/api_docs/python/tf/lite/TFLiteConverter
- TensorFlow Lite post-training integer quantization guide: https://www.tensorflow.org/lite/performance/post_training_integer_quant
- Google Cloud Pub/Sub publisher documentation: https://cloud.google.com/pubsub/docs/publisher
- Google Cloud Storage object metadata documentation: https://cloud.google.com/storage/docs/metadata
- Google Cloud Storage gsutil installation documentation: https://cloud.google.com/storage/docs/gsutil_install
- Cloud Monitoring user-defined metrics overview: https://cloud.google.com/monitoring/custom-metrics/
- Cloud Monitoring dashboards overview: https://cloud.google.com/monitoring/dashboards

## Issues Found
- The prerequisites said Python 3.8+, but Coral's PyCoral prebuilt packages are documented for Python 3.6 through 3.9. Updated the prerequisite to avoid implying Python 3.10+ works with the standard prebuilt packages.
- The setup commands installed `pycoral` and `tflite-runtime` with plain `pip install`, which does not match Coral's documented Debian-based Linux installation path. Replaced this with `sudo apt-get install -y libedgetpu1-std python3-pycoral`.
- The APT repository setup used `apt-key`, which is deprecated on modern Debian/Ubuntu systems. Updated the commands to use a keyring with `signed-by`, consistent with current Google Cloud APT repository guidance.
- The compiler installation did not mention that the Debian package is for x86-64 systems and is no longer available for ARM64 systems such as the Coral Dev Board. Added an x86-64 Debian-based machine prerequisite and clarified the compiler install step.
- The compiler explanation implied each unsupported operation falls back independently. Coral's documentation says the compiler partitions at the first unsupported operation and the rest of the graph runs on CPU. Updated the explanation and command comments.
- The Google Cloud integration snippet used `time.time()` without importing `time` in that snippet and imported unused `os`. Replaced `os` with `time`.
- The Cloud Storage metadata access used `blob.metadata.get(...)`, which can fail when no custom metadata is present because `metadata` can be absent. Updated it to `(blob.metadata or {}).get(...)`.
- The processing loop described model replacement as hot-swapping without stopping the inference loop. Updated the wording to "without restarting the process," which better matches the code.
- The monitoring section implied Pub/Sub messages alone can directly produce Cloud Monitoring dashboards for custom inference fields. Updated it to clarify that messages must be processed into custom metrics or logs, and that accuracy tracking requires ground truth labels.

## Review Notes
- The TensorFlow Lite quantization example is syntactically valid and follows the documented full-integer quantization pattern, but real deployments should use representative samples from the training or validation data distribution rather than random data.
- The inference timing claim is reasonable for common Edge TPU-compatible models, but end-to-end video throughput also depends on camera capture, preprocessing, postprocessing, host CPU, and USB speed.
