# Validation Summary: How to Build an Entity Extraction System with Vertex AI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Gemini models
- Google Gen AI SDK for Python
- Gemini function calling
- Python
- JSON Schema-style function declarations

## Sources Consulted
- Google Cloud Vertex AI SDK migration guide: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations/genai-vertexai-sdk
- Google Cloud Generative AI on Vertex AI deprecations: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations
- Google Cloud function calling reference for Vertex AI Gemini models: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/function-calling
- Google Cloud Gemini model versions and lifecycle: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions
- Google Gen AI Python SDK documentation: https://github.com/googleapis/python-genai

## Issues Found
- The original examples used `vertexai.generative_models`, which Google has deprecated as part of the Vertex AI SDK generative AI module and scheduled for removal after June 24, 2026. Updated the code examples to use the Google Gen AI SDK for Python with `genai.Client(vertexai=True, ...)`.
- The original examples used retired Gemini 1.5 model IDs (`gemini-1.5-pro` and `gemini-1.5-flash`). Updated them to current Gemini 2.5 model IDs (`gemini-2.5-pro` and `gemini-2.5-flash`).
- The install command included `google-cloud-aiplatform vertexai`, which is not the recommended dependency for the current Gen AI SDK path. Updated it to `pip install --upgrade google-genai`.
- The post said to use Vertex AI batch prediction, but the provided code performs application-level batch processing with repeated online calls. Updated the wording to match the code and removed the unused `aiplatform` import.
- The response parsing examples used the deprecated SDK's `response.candidates[0].content.parts` shape. Updated parsing to use `response.function_calls` from the Google Gen AI SDK.
- Added `FunctionCallingConfig(mode="ANY", allowed_function_names=[...])` so the examples consistently request a function-call response instead of relying on automatic model choice.
- The description of traditional NER was too absolute. Updated it to say these systems often require task-specific training data or support fixed entity sets.

## Review Notes
The snippets are syntactically valid Python after the edits. They were not executed against Vertex AI because that would require project credentials and billable API access.
