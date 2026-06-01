# Validation Summary: How to Implement Streaming Responses with Azure OpenAI API in a Web Application

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure OpenAI API
- OpenAI Python SDK
- FastAPI
- Server-Sent Events
- JavaScript Fetch API
- AbortController
- Uvicorn

## Sources Consulted
- Microsoft Learn: Azure OpenAI supported programming languages and streaming chat completions examples: https://learn.microsoft.com/en-us/azure/foundry/openai/supported-languages
- Microsoft Learn: Azure OpenAI REST API reference, including `stream_options.include_usage`: https://learn.microsoft.com/en-us/azure/foundry/openai/reference
- Microsoft Learn: Azure OpenAI API version lifecycle: https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle
- Microsoft Learn: Azure OpenAI migration guide for OpenAI Python 1.x and `AsyncAzureOpenAI`: https://learn.microsoft.com/en-us/azure/foundry-classic/openai/how-to/migration
- FastAPI documentation for `StreamingResponse`: https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse
- Starlette documentation for `StreamingResponse`: https://www.starlette.io/responses/#streamingresponse
- MDN Web Docs: Using server-sent events and event stream format: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
- MDN Web Docs: AbortSignal and aborting fetch requests: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal

## Issues Found
- The backend used the older `2024-06-01` Azure OpenAI API version. Updated the example to `2024-10-21`, the current GA dated API version referenced by Microsoft documentation.
- The backend sample hard-coded the Azure endpoint and API key. Changed it to read `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_API_KEY` from environment variables, matching Microsoft guidance to avoid embedding API keys in code.
- The FastAPI async endpoint used the synchronous `AzureOpenAI` client and synchronous iteration inside an async generator. Updated the example to `AsyncAzureOpenAI`, `await client.chat.completions.create(...)`, and `async for` streaming iteration.
- The deployment variable used `gpt-4o-mini` as if it were always the Azure deployment name. Updated it to a placeholder deployment name and added a prerequisite note that the reader needs their Azure deployment name.
- The frontend parsed each network chunk independently by splitting on single newlines. Because fetch stream chunks do not necessarily align with SSE message boundaries, this could drop partial JSON events. Updated the example to buffer data and parse complete SSE events separated by blank lines.
- The token-usage example had an unused `total_completion_tokens` variable and used synchronous streaming with the async client pattern. Removed the unused variable and updated the example to use `await` and `async for`.
- The retry guidance said the SSE protocol has built-in reconnection. Updated it to say the `EventSource` API has built-in reconnection behavior; a fetch reader must handle retries manually.

## Review Notes
The code was reviewed against official documentation and checked for whitespace errors. It was not executed against a live Azure OpenAI deployment because no Azure credentials or deployment were available in the review environment.
