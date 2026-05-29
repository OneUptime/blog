# Validation Summary: How to Build a Code Execution Pipeline with Gemini Built-In Code Interpreter

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Vertex AI
- Gemini API
- Google Gen AI SDK for Python
- Gemini code execution tool
- Python
- NumPy, Pandas, and Matplotlib

## Sources Consulted
- Google Cloud documentation: Code execution, https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/code-execution
- Google Cloud documentation: Execute code with the Gemini API, https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/code-execution-api
- Google Cloud documentation: Generative AI on Vertex AI deprecations, https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations
- Google Cloud documentation: Vertex AI SDK migration guide, https://docs.cloud.google.com/vertex-ai/generative-ai/docs/deprecations/genai-vertexai-sdk
- Google Cloud sample: Create a chat session with a Generative Model, https://docs.cloud.google.com/vertex-ai/generative-ai/docs/samples/googlegenaisdk-textgen-chat-with-txt
- Google Gen AI SDK for Python documentation, https://googleapis.github.io/python-genai/

## Issues Found
- The original code used the deprecated `vertexai.generative_models` module and `Tool.from_code_execution()`. Google deprecated the Generative AI module in the Vertex AI SDK on June 24, 2025, with removal planned for June 24, 2026. I updated the examples to use the current `google-genai` package, `genai.Client`, `Tool(code_execution=ToolCodeExecution())`, and `GenerateContentConfig`.
- The original examples used `GenerativeModel(..., tools=[...])` and `model.generate_content(...)`. I changed those calls to `client.models.generate_content(..., config=code_execution_config)`, which matches the current Google Gen AI SDK examples for Vertex AI.
- The original chat examples used `model.start_chat()`. I updated them to `client.chats.create(model=model_id, config=code_execution_config)`, which matches the current Google Gen AI SDK chat API and keeps code execution enabled for the chat session.
- The original error validation inferred execution failure by searching for `"Error"` or `"Traceback"` in output text. The API exposes `code_execution_result.outcome`, so I updated the validation to check for `OUTCOME_OK` directly.
- The original model ID was `gemini-2.0-flash`. I updated the setup snippet to use `gemini-2.5-flash`, which is listed in current Google documentation as supporting code execution.

## Review Notes
The remaining technical claims are consistent with the official documentation: code execution runs Python in an isolated API backend environment, the model decides when to use the tool, execution can return executable code and `CodeExecutionResult` parts, supported outputs can include inline graph/image bytes, and the environment includes common data analysis libraries such as NumPy, Pandas, and Matplotlib. The snippets were syntax-checked with Python `ast.parse`, but they were not executed against Vertex AI because credentials and a Google Cloud project were not available in this review environment.
