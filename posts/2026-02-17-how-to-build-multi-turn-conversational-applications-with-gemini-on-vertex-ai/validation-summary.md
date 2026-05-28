# Validation Summary: How to Build Multi-Turn Conversational Applications with Gemini on Vertex AI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Gemini
- Gemini API on Vertex AI
- Google Gen AI SDK for Python
- Python
- Cloud Firestore
- Mermaid
- OneUptime monitoring

## Sources Consulted
- Google Cloud Generative AI on Vertex AI deprecations: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations
- Google Cloud Vertex AI SDK migration guide: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations/genai-vertexai-sdk
- Google Gen AI Python SDK documentation: https://googleapis.github.io/python-genai/
- Google Gen AI Python SDK chat implementation: https://github.com/googleapis/python-genai/blob/main/google/genai/chats.py
- Google Gen AI Python SDK error classes: https://github.com/googleapis/python-genai/blob/main/google/genai/errors.py
- Gemini 2.0 Flash model documentation: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-0-flash
- Cloud Firestore Python client documentation: https://cloud.google.com/python/docs/reference/firestore/latest

## Issues Found
- The post used the deprecated `vertexai.generative_models` module from the Vertex AI SDK. Google deprecated this module on June 24, 2025 and schedules it for removal after June 24, 2026. Updated examples to use the supported `google-genai` SDK.
- Updated Vertex AI initialization from `vertexai.init(...)` and `GenerativeModel(...)` to `genai.Client(vertexai=True, project=..., location=...)`.
- Updated chat creation from `model.start_chat(...)` to `client.chats.create(...)`.
- Updated history objects from `vertexai.generative_models.Content` and `Part` to `google.genai.types.Content` and `types.Part.from_text(text=...)`.
- Updated history retrieval from the old `chat.history` property to `chat.get_history(curated=True)`.
- Updated serialized history shape so persisted history can be passed back to `client.chats.create(..., history=history)`.
- Updated system instruction handling to pass `types.GenerateContentConfig(system_instruction=...)` when creating the chat.
- Updated streaming from `chat.send_message(..., stream=True)` to `chat.send_message_stream(...)`.
- Updated streaming wording from tokens to response chunks, matching the SDK's streaming response behavior.
- Updated retry handling from `google.api_core.exceptions` to `google.genai.errors.APIError` and HTTP status-code checks used by the Google Gen AI SDK.

## Review Notes
- Gemini 2.0 Flash's 1,048,576-token input limit is accurate in current Google Cloud documentation.
- The examples are syntactically valid Python. Runtime calls require Google Cloud authentication, a valid project, Vertex AI access, and the `google-genai` package.
