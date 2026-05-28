# Validation Summary: How to Configure System Instructions and Persona Prompts for Gemini on Vertex AI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI
- Gemini models
- Google Gen AI SDK for Python
- System instructions
- Prompt engineering
- JSON response formatting

## Sources Consulted
- Google Cloud Vertex AI documentation: Use system instructions: https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/system-instructions
- Google Cloud Vertex AI documentation: Introduction to system instructions: https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/system-instruction-introduction
- Google Cloud Vertex AI deprecations: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations
- Google Cloud Vertex AI SDK migration guide: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations/genai-vertexai-sdk
- Google Cloud sample: Create a chat session with a Generative Model using Google Gen AI SDK: https://cloud.google.com/vertex-ai/generative-ai/docs/samples/googlegenaisdk-textgen-chat-with-txt
- Google Gen AI Python SDK documentation: https://googleapis.github.io/python-genai/

## Issues Found
- The post used the deprecated `vertexai.generative_models.GenerativeModel` API. Google Cloud documentation states that the Generative AI module in the Vertex AI SDK was deprecated on June 24, 2025 and is scheduled for removal on June 24, 2026. Updated the examples to use the current Google Gen AI SDK with `genai.Client`, `types.GenerateContentConfig`, `client.models.generate_content`, and `client.chats.create`.
- The post described system instructions as "metadata" and claimed they receive special treatment in the model's attention mechanism. The official documentation says system instructions are separate from prompt contents, processed before prompts, apply to the whole request, and are still part of the overall prompt. Updated this explanation to avoid unsupported implementation details.
- The JSON output example relied only on prompting. Updated it to set `response_mime_type="application/json"` in `GenerateContentConfig`, which matches the current SDK's controlled JSON response configuration.
- Updated code references from creating reusable model instances to creating reusable request/chat configs, which matches the current Google Gen AI SDK API shape.

## Review Notes
- The examples are syntactically valid Python when parsed with `python3`.
- System instructions improve consistency but do not fully prevent jailbreaks or information leaks. The post now reflects Google Cloud's caution not to put secrets or sensitive information in system instructions.
