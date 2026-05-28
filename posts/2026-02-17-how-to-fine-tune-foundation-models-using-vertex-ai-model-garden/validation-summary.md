# Validation Summary: How to Fine-Tune Foundation Models Using Vertex AI Model Garden

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI Model Garden
- Gemini supervised fine-tuning
- Gemini preference tuning
- Open model managed tuning
- Vertex AI SDK for Python
- Cloud Storage JSONL datasets

## Sources Consulted
- Google Cloud: Overview of Model Garden - https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-garden/explore-models
- Google Cloud: Use models in Model Garden - https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-garden/use-models
- Google Cloud: Prepare supervised fine-tuning data for Gemini models - https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini-supervised-tuning-prepare
- Google Cloud: About supervised fine-tuning for Gemini models - https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini-supervised-tuning
- Google Cloud: Tune Gemini models by using supervised fine-tuning - https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini-use-supervised-tuning
- Google Cloud: Prepare preference tuning data for Gemini models - https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini-preference-tuning-prepare
- Google Cloud: About preference tuning for Gemini models - https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini-preference-tuning
- Google Cloud: Tune an open model - https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/open-model-tuning
- Google Cloud: Deploy generative AI models - https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deploy/overview
- Google Cloud Python API reference: vertexai.tuning.sft - https://docs.cloud.google.com/python/docs/reference/vertexai/latest/vertexai.tuning.sft

## Issues Found
- Replaced the Model Garden listing example. The original used `aiplatform.Model.list(filter='labels.model_garden=true')`, which is not the documented way to list Model Garden deployable models. Updated it to use `vertexai.model_garden.list_deployable_models()`.
- Corrected Gemini supervised tuning JSONL examples. The original `input_text` / `output_text` fields do not match the current Gemini supervised tuning dataset format. Updated examples to use `contents` with user and model turns.
- Fixed a Python syntax error in the training examples list by adding the missing comma before the trailing comment.
- Updated the Gemini tuning example from deprecated `gemini-1.5-flash-002` usage and incorrect job fields to current `sft.train()` usage with `vertexai.init()`, polling via `has_ended` / `refresh()`, and `tuned_model_name` / `tuned_model_endpoint_name`.
- Replaced the open-model tuning example. The original referenced an unsupported `gs://vertex-ai-model-garden/pipelines/gemma-tuning.json` pipeline template and old `google/gemma-2b` identifier. Updated it to use managed open model tuning with `SourceModel` and a supported Gemma 3 Model Garden ID.
- Corrected the RLHF section to Vertex AI preference tuning. The original preference JSONL fields were not valid for Gemini preference tuning. Updated the section title, explanation, and JSONL schema to use `contents` and scored `completions`.
- Replaced the manual `aiplatform.Model.upload()` deployment example for tuned open-model artifacts with the documented `vertexai.preview.model_garden.CustomModel(...).deploy()` pattern.
- Updated best-practice wording that referenced Gemini 1.5 Flash and Pro specifically, because the current supported tuning docs emphasize newer Flash, Flash-Lite, and Pro model families.

## Review Notes
All Python snippets were checked with `python3` AST parsing for syntax. Runtime execution was not attempted because the examples require Google Cloud credentials, enabled APIs, Cloud Storage buckets, quota, and billable Vertex AI tuning/deployment resources.
