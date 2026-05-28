# Validation Summary: How to Implement Prompt Management and Versioning with Vertex AI Prompt Registry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI
- Vertex AI SDK for Python
- Vertex AI Prompt Management / Prompt Registry
- Gemini models
- Python

## Sources Consulted
- Google Cloud Vertex AI Prompt management documentation: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/prompt-classes
- Vertex AI SDK Python reference for `vertexai.preview.prompts`: https://docs.cloud.google.com/python/docs/reference/vertexai/latest/vertexai.preview.prompts
- Vertex AI SDK Python reference for `Prompt`: https://docs.cloud.google.com/python/docs/reference/vertexai/latest/vertexai.prompts._prompts.Prompt
- Vertex AI SDK Python reference for `Prompts`: https://docs.cloud.google.com/python/docs/reference/vertexai/latest/vertexai._genai.prompts.Prompts
- Google Cloud sample for listing prompts: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/samples/generativeaionvertexai-prompt-template-list-prompt
- Google Cloud sample for listing prompt versions: https://cloud.google.com/vertex-ai/generative-ai/docs/samples/generativeaionvertexai-prompt-list-prompt-version

## Issues Found
- The original post used non-existent class methods such as `Prompt.create`, `Prompt.get`, `Prompt.list`, and `Prompt.list_versions`. Updated the examples to use `Prompt(...)` for local prompt construction and the official `vertexai.preview.prompts` module functions such as `prompts.create_version`, `prompts.get`, `prompts.list`, and `prompts.list_versions`.
- The original post retrieved prompts by `prompt_name`, but the official SDK retrieval APIs use `prompt_id`. Updated retrieval, versioning, testing, A/B routing, and environment promotion examples to use `prompt_id`.
- The original `generate_content` examples passed `variables=` directly. The official `Prompt.generate_content` method expects assembled `contents`, so the examples now call `prompt.assemble_contents(**variables)` and pass the result as `contents=`.
- The listing example printed fields that are not returned by `prompts.list()` metadata, such as `version_id` and `model_name`. Updated it to print `display_name` and `prompt_id`, and adjusted version listing to use available version metadata.
- The versioning text implied that calling `Prompt.create` would automatically create a new version. Updated the wording and code to explain that saving updates with `create_version` creates the version.
- The promotion example used name-based lookup and copied `source.prompt_data` directly. Updated it to retrieve by prompt ID, copy the unassembled prompt data with `get_unassembled_prompt_data()`, and save the target prompt with `prompts.create_version`.

## Review Notes
The post uses the `vertexai.preview.prompts` API, which is still documented, while Google also documents a newer `vertexai.Client(...).prompts` API surface. A future update could migrate the whole article to the newer client-based API for consistency with the latest prompt management guide.
