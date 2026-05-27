# Validation Summary: How to Run Distributed Training Jobs with Multiple GPUs on Vertex AI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI Custom Jobs
- Vertex AI prebuilt training containers
- TensorFlow `tf.distribute.MirroredStrategy`
- TensorFlow `tf.distribute.MultiWorkerMirroredStrategy`
- TensorFlow `tf.data`
- PyTorch `DistributedDataParallel`
- NVIDIA GPU accelerators and NCCL

## Sources Consulted
- Vertex AI distributed training documentation: https://docs.cloud.google.com/vertex-ai/docs/training/distributed-training
- Vertex AI prebuilt containers for custom training: https://docs.cloud.google.com/vertex-ai/docs/training/pre-built-containers
- Vertex AI Python SDK `CustomJob` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.CustomJob
- TensorFlow `MultiWorkerMirroredStrategy` API reference: https://www.tensorflow.org/api_docs/python/tf/distribute/MultiWorkerMirroredStrategy
- TensorFlow `CommunicationOptions` API reference: https://www.tensorflow.org/api_docs/python/tf/distribute/experimental/CommunicationOptions
- TensorFlow multi-worker Keras training guide: https://www.tensorflow.org/tutorials/distribute/multi_worker_with_keras
- PyTorch `DistributedDataParallel` reference: https://docs.pytorch.org/docs/stable/generated/torch.nn.parallel.DistributedDataParallel.html

## Issues Found
- The Vertex AI TensorFlow image URI used `tf-gpu.2-13:latest`, which is not the current Python 3.10 URI and is past its support/availability window. Updated examples to `us-docker.pkg.dev/vertex-ai/training/tf-gpu.2-17.py310:latest`, which is listed in the official Vertex AI prebuilt container table.
- The TensorFlow examples used `model.save()` with directory-style paths. With current Keras/TensorFlow guidance, exporting a SavedModel directory should use `model.export()`. Updated the single-worker and multi-worker examples accordingly.
- The multi-worker TensorFlow example relied on undefined `load_data()` and `build_model()` helpers and did not call `main()`. Added the model and MNIST dataset setup directly in the snippet and added the `if __name__ == "__main__": main()` guard.
- The multi-worker TensorFlow example saved only from the chief worker. TensorFlow's multi-worker guidance requires all workers to participate in full-model saving/export to avoid possible collective deadlocks, with non-chief workers writing to temporary paths. Updated the example to export from all workers and clean up non-chief temporary exports.
- The PyTorch example claimed Vertex AI sets `MASTER_ADDR`, `MASTER_PORT`, `WORLD_SIZE`, `RANK`, and `LOCAL_RANK`. Vertex AI documents `CLUSTER_SPEC` for non-TensorFlow frameworks, not automatic PyTorch rank variables. Reworked the example to derive node rank and master address from `CLUSTER_SPEC`, then spawn one PyTorch process per GPU.
- The PyTorch example used an undefined `load_dataset()` helper. Added a small synthetic `TensorDataset` so the snippet is syntactically complete and demonstrates DDP data sharding with `DistributedSampler`.
- The PyTorch example attempted to save directly to `AIP_MODEL_DIR`, which may be a `gs://` path. `torch.save()` does not write to Cloud Storage URIs directly. Added a helper that saves locally or uploads to Cloud Storage with `google-cloud-storage` when the output path starts with `gs://`.

## Review Notes
- The post is technically relevant and remains a useful distributed training tutorial after the corrections.
- The TensorFlow 2.17 Vertex AI image is valid on the validation date, but its official availability ends July 11, 2026, so this should be revisited before or shortly after that date.
