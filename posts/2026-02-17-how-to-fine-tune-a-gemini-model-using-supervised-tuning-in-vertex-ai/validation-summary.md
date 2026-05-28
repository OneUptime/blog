# Validation Summary: How to Fine-Tune a Gemini Model Using Supervised Tuning in Vertex AI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud
- Vertex AI
- Gemini supervised fine-tuning
- Vertex AI SDK for Python
- Cloud Storage
- REST API

## Sources Consulted
- Google Cloud: About supervised fine-tuning for Gemini models: https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini-supervised-tuning
- Google Cloud: Tune Gemini models by using supervised fine-tuning: https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini-use-supervised-tuning
- Google Cloud: Text tuning dataset format: https://cloud.google.com/vertex-ai/generative-ai/docs/models/tune_gemini/text_tune
- Google Cloud: Tuning API reference: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/tuning
- Google Cloud: Vertex AI supervised fine-tuning Python sample: https://cloud.google.com/vertex-ai/generative-ai/docs/samples/generativeaionvertexai-tuning-basic
- Google Cloud CLI: gcloud storage cp reference: https://cloud.google.com/sdk/gcloud/reference/storage/cp

## Issues Found
- The training and system-instruction examples used an OpenAI-style `messages` and `content` schema. Updated them to Vertex AI Gemini supervised tuning JSONL format with `contents`, `parts`, and `systemInstruction`.
- The tuning examples used `GenerativeModel.tune_model`, `training_data`, and `validation_data`, which do not match the current documented Vertex AI SDK workflow. Updated them to use `vertexai.tuning.sft.train` with `train_dataset` and `validation_dataset`.
- The examples used `gemini-1.5-flash-002`, which is no longer listed in the current supervised tuning supported-model documentation. Updated examples to `gemini-2.0-flash-001`, matching Google Cloud's current SDK sample.
- The monitoring example used `GenerativeModel.get_tuning_job`, which is not the documented current interface. Updated it to instantiate `sft.SupervisedTuningJob`, poll with `has_ended`, and refresh the job.
- The post listed `gcloud ai tuning-jobs` commands, but the official docs document REST and SDK methods for Gemini tuning jobs. Replaced those commands with documented REST API calls.
- The Cloud Storage upload examples used `gsutil cp`. Updated them to `gcloud storage cp`, which Google Cloud recommends for current CLI usage.
- Corrected a typo in the hyperparameter section from "undertains" to "undertrains".
- Updated the cost wording to match the official pricing note that inference requests to the tuned model still apply and inference pricing is the same for each stable Gemini version.

## Review Notes
The local environment did not have `gcloud` or the `vertexai` Python package installed, so CLI/API verification was performed against current official Google Cloud documentation. Python code blocks were parsed locally for syntax.
