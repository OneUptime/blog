# Validation Summary: Set Up a Custom Training Job in Vertex AI Using a Pre-Built TensorFlow Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI custom training
- Vertex AI Python SDK
- Google Cloud CLI
- TensorFlow and Keras
- Cloud Storage staging
- Vertex AI pre-built training and prediction containers

## Sources Consulted
- Vertex AI prebuilt containers for serverless training: https://docs.cloud.google.com/vertex-ai/docs/training/pre-built-containers
- Vertex AI prebuilt containers for inference and explanation: https://docs.cloud.google.com/vertex-ai/docs/predictions/pre-built-containers
- Vertex AI Python SDK `CustomTrainingJob` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.CustomTrainingJob
- Vertex AI Python SDK `CustomJob` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.CustomJob
- `gcloud ai custom-jobs create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/ai/custom-jobs/create
- Vertex AI training code requirements and environment variables: https://docs.cloud.google.com/vertex-ai/docs/training/code-requirements
- Vertex AI managed dataset environment variables: https://docs.cloud.google.com/vertex-ai/docs/training/using-managed-datasets

## Issues Found
- The post said to upload the `trainer/` directory to Cloud Storage with `gsutil cp -r`, but the Python SDK `CustomTrainingJob(script_path=...)` and the `gcloud` local package workflow stage local training code from the specified local path. I changed this section to prepare the package locally instead of manually uploading an unused directory.
- The post showed `gcloud ai custom-jobs list` as a way to list pre-built training containers. That command lists custom job resources, not container image URIs. I replaced it with a reference to the official pre-built training containers documentation.
- The `gcloud ai custom-jobs create` example mixed `container-image-uri` with `local-package-path` and `python-module`, which are mutually exclusive worker-pool modes. I changed it to use `executor-image-uri` with `local-package-path=.` and `python-module=trainer.task`, matching the documented pre-built-container local package workflow.
- The TensorFlow 2.14 and 2.12 training image examples were past their documented end-of-availability dates as of this review. I updated the training examples to currently listed TensorFlow 2.17 and 2.16 container images.
- The training script used `model.save(args.model_dir)`, which is not the right Keras 3 API for exporting a TensorFlow SavedModel from the TensorFlow 2.17 container. I changed it to `model.export(args.model_dir)`.
- The Python SDK example configured model upload with a TensorFlow 2.14 prediction container while moving the training job to a current TensorFlow training image would require a matching supported serving container. I removed the model upload configuration so the example remains focused on running a custom training job and exporting artifacts to `AIP_MODEL_DIR`.
- The programmatic monitoring snippet used `CustomTrainingJob.get()` with a `customJobs/...` resource name. I changed it to `CustomJob.get()` because that resource name refers to a Vertex AI `CustomJob`.

## Review Notes
- The current Vertex AI documentation lists TensorFlow 2.17 and 2.16 training containers with near-term end-of-availability dates in June and July 2026, so this post should be revisited before those dates.
