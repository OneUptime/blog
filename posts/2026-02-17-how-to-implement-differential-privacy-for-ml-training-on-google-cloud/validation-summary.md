# Validation Summary: How to Implement Differential Privacy for ML Training on Google Cloud

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- TensorFlow
- TensorFlow Privacy
- dp-accounting
- Differential privacy and DP-SGD
- Python
- Docker
- Google Cloud CLI

## Sources Consulted
- TensorFlow Privacy DPKerasSGDOptimizer API: https://www.tensorflow.org/responsible_ai/privacy/api_docs/python/tf_privacy/DPKerasSGDOptimizer
- TensorFlow Privacy compute_dp_sgd_privacy API and deprecation guidance: https://www.tensorflow.org/responsible_ai/privacy/api_docs/python/tf_privacy/compute_dp_sgd_privacy
- TensorFlow Privacy 0.9.0 PyPI metadata: https://pypi.org/project/tensorflow-privacy/0.9.0/
- dp-accounting 0.4.3 package source and RDP accountant API: https://pypi.org/project/dp-accounting/0.4.3/
- Vertex AI CustomContainerTrainingJob Python API: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.CustomContainerTrainingJob
- Vertex AI custom training documentation: https://docs.cloud.google.com/vertex-ai/docs/training/create-custom-job
- Google Cloud CLI services enable reference: https://cloud.google.com/sdk/gcloud/reference/services/enable

## Issues Found
- The TensorFlow Privacy optimizer import used `tensorflow_privacy.privacy.optimizers.dp_optimizers_keras`, which is not present in TensorFlow Privacy 0.9.0. Changed it to `tensorflow_privacy.privacy.optimizers.dp_optimizer_keras`, which contains `DPKerasSGDOptimizer`.
- The install command did not pin versions or mention the Python constraint for TensorFlow Privacy 0.9.0. Updated it to use Python 3.9-3.11 and pin TensorFlow Privacy 0.9.0 with TensorFlow 2.15 to match the Docker image.
- The examples used `compute_dp_sgd_privacy`, which the official TensorFlow Privacy documentation marks as deprecated for most reporting. Replaced it with a small `dp_accounting` RDP accountant helper for the numeric epsilon examples.
- The code set `num_microbatches` equal to the configured batch size, which can fail on a final partial batch. Changed it to `None`, the documented default that makes each microbatch contain one example.
- The privacy sweep's typical output no longer matched the updated non-deprecated accountant helper. Recomputed and updated the example epsilon values.
- The Vertex AI example created a managed model but did not save the trained model to `AIP_MODEL_DIR`. Added a conditional `model.save(os.environ["AIP_MODEL_DIR"])`, which Vertex AI requires for uploading the produced model.

## Review Notes
- The Vertex AI container example still assumes the training script parses the listed command-line args and loads data from Cloud Storage. That is reasonable for a blog-sized example, but a production-ready article could include a complete `argparse` entrypoint and data-loading implementation.
