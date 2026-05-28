# Validation Summary: How to Configure GPU Accelerators for Vertex AI Custom Training Jobs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI custom training
- Vertex AI SDK for Python
- Google Cloud CLI
- NVIDIA GPU accelerators
- TensorFlow and `tf.distribute.MirroredStrategy`
- Spot VMs for Vertex AI training

## Sources Consulted
- Vertex AI serverless training compute configuration: https://docs.cloud.google.com/vertex-ai/docs/training/configure-compute
- Vertex AI SDK for Python `CustomTrainingJob` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.CustomTrainingJob
- Vertex AI prebuilt training containers: https://docs.cloud.google.com/vertex-ai/docs/training/pre-built-containers
- Vertex AI prebuilt prediction containers: https://docs.cloud.google.com/vertex-ai/docs/predictions/pre-built-containers
- Vertex AI custom job creation guide: https://docs.cloud.google.com/vertex-ai/docs/training/create-custom-job
- Vertex AI Spot VM training guide: https://cloud.google.com/vertex-ai/docs/training/use-spot-vms
- Google Cloud GPU zone discovery guide: https://docs.cloud.google.com/compute/docs/regions-zones/viewing-regions-zones
- `gcloud compute accelerator-types list` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/accelerator-types/list

## Issues Found
- The TensorFlow 2.14 Vertex AI training container was past its listed end-of-availability date. Updated training examples to use `tf-gpu.2-16.py310:latest`.
- The TensorFlow 2.14 serving container had passed its patch/support date. Updated serving examples to use the supported `tf2-gpu.2-15:latest` prediction container.
- The TensorFlow training script used `os.environ` without importing `os`. Added the missing import.
- The `gcloud ai custom-jobs create` GPU example used accelerator fields inside `--worker-pool-spec`, but official docs require GPU configuration through `--config`. Replaced the command with a `config.yaml` based example.
- The `gcloud` example mixed `container-image-uri` with Python package fields. Updated it to use `pythonPackageSpec` with `executorImageUri`, `packageUris`, and `pythonModule`.
- The compatibility table omitted L4 machine types and overstated A100 40GB capacity for `a2-highgpu`. Added L4 `g2-standard` and clarified A100 40GB max GPU counts.
- The regional availability command filtered by an invalid region-style zone expression. Updated it to filter specific zones in `us-central1`.
- The cost example described preemptible VMs but current Vertex AI docs use Spot VMs with `scheduling_strategy=SPOT`. Updated the text and code accordingly.
- The Spot VM Python snippet imported an unused low-level type and referenced `aiplatform` without importing it. Replaced the import and added the documented `job.run(...SPOT)` call.

## Review Notes
- The post is technically valid after edits, but readers should still check Vertex AI regional accelerator availability and container support dates before running these examples because both change over time.
- Vertex AI documentation pages now note that Vertex AI services are part of Gemini Enterprise Agent Platform, but the referenced Vertex AI training APIs and docs remain available.
