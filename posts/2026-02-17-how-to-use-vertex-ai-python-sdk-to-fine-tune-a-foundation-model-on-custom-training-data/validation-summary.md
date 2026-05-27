# Validation Summary: How to Use the Vertex AI Python SDK to Fine-Tune a Foundation Model

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI Python SDK
- Gemini supervised fine-tuning
- Python
- JSON Lines training data
- Cloud Storage
- Google Cloud CLI

## Sources Consulted
- Google Cloud Vertex AI tuning API documentation: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/tuning
- Google Cloud supervised fine-tuning data preparation documentation: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini-supervised-tuning-prepare
- Google Cloud supervised tuning usage documentation: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini-use-supervised-tuning
- Google Cloud generative AI deployment overview: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deploy/overview
- Vertex AI Python SDK `GenerativeModel` reference: https://docs.cloud.google.com/python/docs/reference/vertexai/latest/vertexai.generative_models.GenerativeModel

## Issues Found
- The original examples imported model classes from `google.cloud.aiplatform` and used `TextGenerationModel` / `ChatModel` with `text-bison@002` and `chat-bison@002`. Updated the examples to use current Gemini supervised fine-tuning through `vertexai.tuning.sft`.
- The original JSONL examples used `input_text` / `output_text` and `messages`, which do not match the documented Gemini supervised fine-tuning JSONL format. Updated examples to use `contents`, `parts`, `role`, and optional `systemInstruction`.
- The tuning examples used older `tune_model` arguments such as `training_data`, `validation_data`, `train_steps`, `tuning_job_location`, and `tuned_model_location`. Updated them to `sft.train()` with `source_model`, `train_dataset`, `validation_dataset`, and `tuned_model_display_name`.
- The monitoring section listed `PipelineJob` resources with a Bison display-name filter. Updated it to use `sft.SupervisedTuningJob.list()` and `sft.SupervisedTuningJob(...)`.
- The prediction and evaluation examples used deprecated Bison-era prediction APIs. Updated them to use `vertexai.generative_models.GenerativeModel.generate_content()` with `GenerationConfig`.
- The deployment section showed manual endpoint creation and `Model.deploy()` with machine resources. Updated it because tuned Gemini models are automatically uploaded to Model Registry and deployed to a shared public endpoint.
- The setup command installed only `google-cloud-aiplatform` while the post uses the Cloud Storage client. Added `google-cloud-storage`.
- The broad claim that a fine-tuned support model "will outperform a generic model every time" was softened because model quality depends on data quality, evaluation design, and use case.

## Review Notes
The post is now aligned with current Gemini supervised fine-tuning documentation. The examples are syntactically valid Python, but they still require a configured Google Cloud project, a Cloud Storage bucket, Vertex AI permissions, API enablement, and region/model availability to run successfully.
