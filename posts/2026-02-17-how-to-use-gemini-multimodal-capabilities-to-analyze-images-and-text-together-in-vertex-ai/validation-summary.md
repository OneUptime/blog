# Validation Summary: How to Use Gemini Multimodal Capabilities to Analyze Images and Text Together

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Gemini multimodal models
- Google Gen AI SDK for Python
- Python
- Cloud Storage image inputs
- HTTP image inputs

## Sources Consulted
- Google Cloud Vertex AI SDK migration guide: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations/genai-vertexai-sdk
- Google Cloud Generative AI on Vertex AI deprecations: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations
- Google Cloud image understanding documentation: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/image-understanding
- Google Cloud Gemini model documentation: https://cloud.google.com/vertex-ai/generative-ai/docs/models
- Google Gen AI Python SDK documentation: https://googleapis.github.io/python-genai/
- Google Cloud Python Vertex AI generative models reference, checked for comparison with the deprecated API: https://docs.cloud.google.com/python/docs/reference/vertexai/latest/vertexai.generative_models

## Issues Found
- The post used the deprecated `google-cloud-aiplatform` generative AI module (`vertexai.generative_models`). Google deprecated this module on June 24, 2025 and says it will be removed after June 24, 2026. I migrated the examples to the supported `google-genai` SDK.
- The code examples used legacy `gemini-1.5-pro` and `gemini-1.5-flash` model IDs. I updated the examples to use current Gemini 2.5 model IDs: `gemini-2.5-pro` for higher-quality analysis examples and `gemini-2.5-flash` for batch processing.
- Local image loading used `Image.load_from_file`, which belongs to the deprecated Vertex AI SDK module. I changed local file examples to read bytes and create `Part.from_bytes(...)` values with explicit MIME types.
- GCS and URL image examples used the old `Part.from_uri(uri=...)` signature. I changed these to the Google Gen AI SDK `Part.from_uri(file_uri=..., mime_type=...)` form.
- The generation configuration example used the deprecated `GenerationConfig` class and `generation_config=` argument. I changed it to `types.GenerateContentConfig(...)` and `config=...`.
- The chat example used the deprecated `model.start_chat()` flow. I updated it to `client.chats.create(...)` and retained the multi-turn image workflow.
- The supported image format list incorrectly included GIF and BMP for current Gemini image-understanding models and omitted HEIC/HEIF. I updated the list to PNG, JPEG, WebP, HEIC, and HEIF.
- The image size guidance said images up to 20 MB are generally supported and recommended keeping images under 4 MB. I replaced it with current Gemini 2.5 image-understanding limits: 7 MB for inline images and 30 MB for Cloud Storage images.

## Review Notes
The examples are syntactically valid Python after the edits. They were not executed against Vertex AI because the placeholder project ID and sample image files are not present in the review environment.
