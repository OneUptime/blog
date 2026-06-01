# Validation Summary: How to Fine-Tune a GPT Model in Azure OpenAI Service with Custom Training Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure OpenAI in Microsoft Foundry
- OpenAI Python SDK
- Fine-tuning
- JSONL training data
- Chat Completions API

## Sources Consulted
- Microsoft Learn: Customize a model with fine-tuning - https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/fine-tuning
- Microsoft Learn: Deploy a fine-tuned model - https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/fine-tuning-deploy
- Microsoft Learn: Cost management for fine-tuning - https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/fine-tuning-cost-management
- Microsoft Learn: Retired Azure OpenAI models in Microsoft Foundry - https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/legacy-models
- Microsoft Learn REST API reference: Fine Tuning - Create, API version 2024-10-21 - https://learn.microsoft.com/en-us/rest/api/azureopenai/fine-tuning/create?view=rest-azureopenai-2024-10-21
- OpenAI API reference: Create fine-tuning job - https://developers.openai.com/api/reference/resources/fine_tuning/subresources/jobs/methods/create

## Issues Found
- The upload and job-creation examples used `openai.AzureOpenAI` with `api_version="2024-02-01"` for the fine-tuning workflow. Current Microsoft documentation shows the OpenAI SDK client with the Azure `/openai/v1/` base URL for file upload and fine-tuning job creation, so the examples were updated.
- The post used `gpt-35-turbo-0613` as the base model and model-name example. That Azure model version is retired, so the examples now use `gpt-4.1-2025-04-14`, a currently documented fine-tuning model.
- The job creation example passed `hyperparameters` at the top level. Current OpenAI Python SDK guidance for custom supervised fine-tuning hyperparameters uses the nested `method.supervised.hyperparameters` shape, so the example was corrected.
- The learning-rate examples of `0.5` and `2.0` did not match current Azure guidance, which recommends experimenting in the `0.02` to `0.2` range. The text now reflects that guidance.
- The `list_events` example used positional job ID syntax. Current Azure documentation uses `fine_tuning_job_id=job_id` with a `limit`, so the example was updated.
- The pricing section stated outdated GPT-3.5-specific rates and said fine-tuned inference is roughly twice the base model rate. Current Azure documentation says supervised fine-tuning cost depends on training tokens, epochs, and model-specific pricing, and that Standard/Global Standard fine-tuned deployments use the same token rate as the corresponding base model deployment type plus hosting. The pricing text was corrected.
- The post omitted Azure's documented training-file constraints. A sentence was added noting UTF-8 with BOM and the 512 MB file limit.
- The deployment instructions referenced Azure OpenAI Studio. Current documentation uses the Foundry portal, so that wording was updated.

## Review Notes
The post remains a high-level walkthrough. Azure fine-tuning model availability, deployment tiers, and prices are region- and model-dependent, so readers should still check the current Microsoft Learn model availability and Azure pricing pages before running a production fine-tune.
