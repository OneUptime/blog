# Validation Summary: How to Build a Streaming Function Call Application with Gemini on Vertex AI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Gemini API
- Google Gen AI SDK for Python
- Gemini function calling
- Streaming model responses
- Python
- Flask
- Server-sent events
- asyncio

## Sources Consulted
- Google Gen AI SDK documentation: https://googleapis.github.io/python-genai/
- Vertex AI function calling documentation: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling
- Vertex AI SDK migration guide for generative AI modules: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations/genai-vertexai-sdk
- Gemini API in Vertex AI model reference: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference
- Flask streaming pattern documentation: https://flask-docs.readthedocs.io/en/latest/patterns/streaming/

## Issues Found
- The post used the deprecated `vertexai.generative_models` SDK. Updated the examples to use the current `google-genai` SDK with `genai.Client(vertexai=True, ...)`, `types.FunctionDeclaration`, `types.Tool`, and `types.GenerateContentConfig`.
- The setup section described creating a model object, but the updated SDK examples create a client and generation config instead. Updated that wording.
- The streaming function-call examples sent only function response parts back to the model. Updated them to preserve the user turn, the model function-call turn, and the tool response turn before requesting the continuation.
- The Flask example advertised streaming function calling but only streamed text and did not execute or return function responses. Updated it to emit tool-call events, execute tools, append tool responses, and continue streaming.
- The performance snippet referenced an undefined `async_execute_tool` helper and used the old `Part` class. Added a small `asyncio.to_thread` wrapper and updated it to `types.Part.from_function_response`.
- The performance claim that first-token latency is the same as non-streaming was too broad. Updated it to the accurate claim that streaming improves perceived latency by allowing chunks to be displayed before the full response is complete.

## Review Notes
The examples are syntactically valid Python and match the current documented Google Gen AI SDK patterns. The tutorial still uses mock stock data, which is appropriate for an example but should be replaced with a real market data provider in production.
