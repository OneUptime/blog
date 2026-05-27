# Validation Summary: How to Use Gemini Grounding with Google Maps for Location-Aware AI Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vertex AI
- Gemini models
- Google Gen AI SDK for Python
- Grounding with Google Maps
- Google Maps source metadata
- Gemini function calling
- Python caching patterns

## Sources Consulted
- Google Cloud Vertex AI documentation: Grounding with Google Maps in Vertex AI: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-google-maps
- Google Cloud Vertex AI documentation: Grounding API reference: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/grounding
- Google Cloud Vertex AI documentation: Function calling reference: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/function-calling
- Google Cloud Vertex AI REST reference: FunctionDeclaration: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1beta1/FunctionDeclaration
- Google Gen AI SDK for Python documentation: https://googleapis.github.io/python-genai/index.html

## Issues Found
- The post configured Google Maps grounding through `Tool.from_google_search_retrieval(grounding.GoogleSearchRetrieval())`, which is the Google Search grounding path and not the current documented Maps grounding API. Updated the examples to use the Google Gen AI SDK with `types.Tool(google_maps=types.GoogleMaps(enable_widget=False))`.
- The post used the older `vertexai.generative_models.GenerativeModel` examples. Updated the snippets to the current Google Gen AI SDK pattern with `genai.Client(..., vertexai=True)` and `client.models.generate_content(...)`.
- The examples referenced `gemini-2.0-flash`. Updated them to `gemini-2.5-flash`, which is listed in current Google Maps grounding and function calling documentation.
- The metadata extraction example read `chunk.web`, which is used for web sources, not Maps grounding. Updated it to read `chunk.maps` fields such as title, URI, and place ID.
- The post described directions as a general Maps grounding capability. Current documentation treats routing and search-along-route as restricted preview features, so the text now includes that caveat.
- The custom function declaration example used the old import path and parameter style. Updated it to `types.FunctionDeclaration` with `parameters_json_schema`, and kept it in a `types.Tool(function_declarations=[...])`.
- Added the documented `pip install --upgrade google-genai` installation command before the Python SDK examples.

## Review Notes
The Python code blocks were syntax-checked with `python3` AST parsing. The local environment does not have `google-genai` installed, so live SDK import/runtime execution was not performed.
