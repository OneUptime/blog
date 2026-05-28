# Validation Summary: How to Implement Function Calling with the Gemini API in Vertex AI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Gemini API
- Vertex AI SDK for Python
- Python
- Function calling / tool use
- OpenAPI-compatible function schemas

## Sources Consulted
- Google Cloud Vertex AI function calling introduction: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling
- Google Cloud Vertex AI function calling reference: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/function-calling
- Google Cloud Vertex AI model versions and lifecycle: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions
- Vertex AI SDK for Python `FunctionDeclaration` reference: https://docs.cloud.google.com/python/docs/reference/vertexai/latest/vertexai.generative_models.FunctionDeclaration
- Vertex AI SDK for Python `ChatSession.send_message` reference: https://docs.cloud.google.com/python/docs/reference/vertexai/latest/vertexai.generative_models.ChatSession

## Issues Found
- The examples used `gemini-1.5-pro`, but Vertex AI model lifecycle documentation lists Gemini 1.5 Pro model versions as retired. Updated the examples to use `gemini-2.5-flash`, which is listed as a supported Gemini model for function calling.
- The complete function calling example referenced `handle_get_server_status` without defining or importing it. Added the handler implementation to make the example self-contained.
- The complete function calling example inspected only the first content part for a function call. Updated it to use `response.candidates[0].function_calls`, matching the current Vertex AI SDK examples.
- The multiple function calls example did not provide all parallel function responses back to the model together. Updated it to collect all `Part.from_function_response(...)` values and send them in one response turn, as required by the Vertex AI function calling documentation.
- The multiple function calls example referenced `ops_tool` and handlers without showing where they came from. Added imports from the earlier example files and defined the handler map.
- The infrastructure assistant example referenced `function_handlers` without defining it. Added a simple handler map for the declared functions.

## Review Notes
All Python code blocks parse successfully with `python3` syntax checking. The local environment does not have the `vertexai` package installed, so live SDK execution was not performed.
