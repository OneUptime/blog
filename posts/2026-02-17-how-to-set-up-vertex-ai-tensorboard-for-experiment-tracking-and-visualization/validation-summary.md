# Validation Summary: How to Set Up Vertex AI TensorBoard for Experiment Tracking and Visualization

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI TensorBoard
- Vertex AI SDK for Python
- Google Cloud CLI
- TensorFlow and Keras
- PyTorch TensorBoard logging
- Cloud Storage-backed custom training logs

## Sources Consulted
- Google Cloud Vertex AI TensorBoard custom training documentation: https://docs.cloud.google.com/vertex-ai/docs/experiments/tensorboard-training
- Google Cloud Vertex AI TensorBoard setup documentation: https://docs.cloud.google.com/vertex-ai/docs/experiments/tensorboard-setup
- Google Cloud Vertex AI TensorBoard view documentation: https://docs.cloud.google.com/vertex-ai/docs/experiments/tensorboard-view
- Vertex AI SDK for Python `Tensorboard` reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Tensorboard
- Vertex AI SDK for Python `CustomTrainingJob` reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.CustomTrainingJob
- Vertex AI SDK for Python `TensorboardExperiment` reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.TensorboardExperiment
- Vertex AI SDK for Python `TensorboardRun` reference: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.TensorboardRun
- Vertex AI SDK for Python package functions, including `upload_tb_log`: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform
- Google Cloud CLI `gcloud ai tensorboards create` reference: https://cloud.google.com/sdk/gcloud/reference/ai/tensorboards/create
- Vertex AI prebuilt training containers: https://cloud.google.com/vertex-ai/docs/training/pre-built-containers
- Vertex AI prebuilt prediction containers: https://docs.cloud.google.com/vertex-ai/docs/predictions/pre-built-containers
- Keras model saving and export documentation: https://keras.io/guides/serialization_and_saving/
- TensorFlow Keras serialization and saving guide: https://www.tensorflow.org/guide/keras/serialization_and_saving
- PyTorch TensorBoard documentation: https://pytorch.org/docs/stable/tensorboard.html

## Issues Found
- The training job used `us-docker.pkg.dev/vertex-ai/training/tf-gpu.2-14.py310:latest`, which is past the documented Vertex AI training container availability date. Updated it to the currently documented GPU TensorFlow 2.16 training image.
- The serving image used TensorFlow 2.14. Updated it to the documented TensorFlow 2.15 prediction image to avoid using an older serving container in the example.
- The TensorFlow training script used `model.save(model_dir)`. With current Keras behavior, exporting a TensorFlow SavedModel for serving should use `model.export(model_dir)`, so the example was updated.
- The `service_account` comment said it was where to write service account info for TensorBoard. In the Vertex AI SDK, this parameter specifies the workload run-as service account and is required when `tensorboard` is set. The comment was corrected.
- The TensorBoard web URL example omitted the experiment resource and used slash-separated resource names. Updated it to build the documented URL format using the experiment resource path with `/` replaced by `+`.

## Review Notes
The Google Cloud documentation now notes that some Vertex AI documentation is no longer being updated and points readers to Gemini Enterprise Agent Platform documentation. The Vertex AI SDK reference and TensorBoard-specific pages still document the APIs used in this post, but future reviews should re-check whether these examples have moved or changed branding.
