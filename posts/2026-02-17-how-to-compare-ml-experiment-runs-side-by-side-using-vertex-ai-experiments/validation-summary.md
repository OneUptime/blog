# Validation Summary: How to Compare ML Experiment Runs Side-by-Side Using Vertex AI Experiments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI Experiments
- Vertex AI SDK for Python (`google-cloud-aiplatform`)
- Vertex AI TensorBoard
- Vertex AI custom training jobs
- scikit-learn
- pandas
- matplotlib

## Sources Consulted
- Google Cloud Vertex AI SDK for Python `aiplatform` package reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform
- Google Cloud Vertex AI SDK for Python `ExperimentRun` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.ExperimentRun
- Google Cloud Vertex AI SDK for Python `Experiment` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Experiment
- Google Cloud Vertex AI SDK for Python `CustomTrainingJob` reference: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.CustomTrainingJob
- Google Cloud Vertex AI Experiments manual logging guide: https://docs.cloud.google.com/vertex-ai/docs/experiments/log-data
- Google Cloud Vertex AI Experiments compare and analyze runs guide: https://docs.cloud.google.com/vertex-ai/docs/experiments/compare-analyze-runs
- Google Cloud Vertex AI prebuilt containers for serverless training: https://docs.cloud.google.com/vertex-ai/docs/training/pre-built-containers
- Google Cloud Vertex AI prebuilt containers for inference and explanation: https://docs.cloud.google.com/vertex-ai/docs/predictions/pre-built-containers

## Issues Found
- The logging-run introduction said the example logs parameters, metrics, and artifacts, but the code only logs parameters, summary metrics, and time-series metrics. Changed the sentence to say the example logs parameters and metrics.
- The training job section said Vertex AI training jobs are automatically logged as experiment runs, but the shown code manually starts an experiment run and logs configuration and final metrics around a `CustomTrainingJob`. Changed the sentence to match the code.
- The training job example used `us-docker.pkg.dev/vertex-ai/training/tf-gpu.2-14.py310:latest`, whose listed end of availability is September 26, 2025. Updated it to the currently listed TensorFlow 2.17 CPU training image, `us-docker.pkg.dev/vertex-ai/training/tf-cpu.2-17.py310:latest`, to match the CPU-only `n1-standard-4` machine type in the example.
- The training job example configured a TensorFlow serving container even though the section is about experiment logging rather than model deployment. Removed the serving-container argument and `model_display_name` from `job.run()` so the example focuses on running the job and logging metrics.

## Review Notes
Time-series metric logging requires a backing Vertex AI TensorBoard resource. The current SDK documentation says `aiplatform.init()` can assign or create a default TensorBoard unless TensorBoard is disabled, but production examples should still mention this setup explicitly.
