# Validation Summary: How to Configure TPU Training for Custom Models on Vertex AI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI custom training
- Cloud TPU v3 and TPU VMs
- TensorFlow and `tf.distribute.TPUStrategy`
- PyTorch/XLA and TPU training
- `tf.data`, TFRecord, and GCS-based training data

## Sources Consulted
- Vertex AI: Configure compute resources for serverless training - https://cloud.google.com/vertex-ai/docs/training/configure-compute
- Vertex AI: Training with TPU accelerators - https://cloud.google.com/vertex-ai/docs/training/training-with-tpu-vm
- Vertex AI: Prebuilt containers for custom training - https://cloud.google.com/vertex-ai/docs/training/pre-built-containers
- Cloud TPU: TPU system architecture - https://cloud.google.com/tpu/docs/system-architecture-tpu-vm
- Cloud TPU: TPU v3 - https://cloud.google.com/tpu/docs/v3
- Cloud TPU: Improve your model's performance with bfloat16 - https://cloud.google.com/tpu/docs/bfloat16
- TensorFlow API: `tf.distribute.TPUStrategy` - https://www.tensorflow.org/api_docs/python/tf/distribute/TPUStrategy
- TensorFlow Guide: Mixed precision - https://www.tensorflow.org/guide/keras/mixed_precision
- PyTorch/XLA documentation and API guide - https://docs.pytorch.org/xla/release/r2.8/index.html
- PyTorch/XLA API guide - https://docs.pytorch.org/xla/release/r2.8/learn/api-guide.html

## Issues Found
- The post described Vertex AI as submitting to "TPU pods" generally. Updated this to "TPU VMs and TPU Pod slices" to match Vertex AI's current TPU training terminology.
- The TPU v3 architecture description said each chip has two cores, each with a 128x128 MXU, and the diagram showed 16 GB HBM per chip. Updated the wording and diagram to reflect Cloud TPU v3 documentation: a v3 chip has two TensorCores, pre-v6e MXUs use 128x128 arrays, and v3 chips have 32 GiB HBM2.
- The static-shape explanation was too absolute. Updated it to explain that XLA compiles for concrete shapes and dynamic batch or sequence shapes can trigger recompilation.
- The TensorFlow model guidance recommended batch normalization over layer normalization. Replaced that with a more accurate XLA-compatible standard-ops recommendation.
- The Vertex AI submission example used the old `tf-tpu.2-13` prebuilt TPU image. Replaced it with a `container_spec` example that points to a TPU-capable custom image, consistent with current Vertex AI TPU guidance for custom TensorFlow containers and TPU Pod base images.
- The PyTorch/XLA sample referenced an undefined `create_dataset()` function. Added a minimal example dataset function so the snippet is self-contained.
- The PyTorch/XLA sample used `xm.xrt_world_size()` and `xm.get_ordinal()`, and hard-coded `xmp.spawn(..., nprocs=8)`. Updated it to use current `torch_xla.runtime` APIs and let `xmp.spawn` choose the available TPU devices, since current PyTorch/XLA documents `nprocs` as `None` or `1`.

## Review Notes
The Python snippets parse successfully after the edits. The examples still use placeholder project IDs, bucket paths, service accounts, package/module names, and container image names that users must replace for a real Vertex AI job.
