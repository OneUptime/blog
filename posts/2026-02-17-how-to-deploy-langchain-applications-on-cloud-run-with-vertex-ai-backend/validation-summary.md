# Validation Summary: How to Deploy LangChain Applications on Cloud Run with Vertex AI Backend

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- Vertex AI Gemini models
- LangChain
- FastAPI
- Docker
- Google Cloud CLI
- Python

## Sources Consulted
- LangChain ChatGoogleGenerativeAI API reference: https://reference.langchain.com/python/langchain-google-genai/chat_models/ChatGoogleGenerativeAI
- LangChain Google GenAI integration docs: https://docs.langchain.com/oss/python/integrations/chat/google_generative_ai
- LangChain Google provider docs: https://docs.langchain.com/oss/python/integrations/providers/google
- Google Cloud Vertex AI model versions and lifecycle: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions
- Google Cloud Vertex AI Google models: https://cloud.google.com/vertex-ai/generative-ai/docs/models/
- FastAPI lifespan events documentation: https://fastapi.tiangolo.com/advanced/events/
- Google Cloud Run container contract: https://docs.cloud.google.com/run/docs/container-contract
- Google Cloud Run container configuration: https://cloud.google.com/run/docs/configuring/services/containers
- Google Cloud Run deploy CLI reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud Run authentication for developers: https://docs.cloud.google.com/run/docs/authenticating/developers
- Google Cloud Run service-to-service authentication: https://docs.cloud.google.com/run/docs/authenticating/service-to-service
- Google Cloud IAM Vertex AI roles: https://cloud.google.com/iam/docs/roles-permissions/aiplatform
- PyPI package metadata checked with `pip index versions` and `pip download` for FastAPI, Uvicorn, LangChain, langchain-google-genai, and Pydantic.

## Issues Found
- The post used `gemini-1.5-pro` as the default model. Vertex AI Gemini 1.5 models are retired or discontinued, so the default was changed to `gemini-2.5-flash`, a current stable Gemini model.
- The post used `langchain_google_vertexai.ChatVertexAI` and old package pins. LangChain now recommends `ChatGoogleGenerativeAI` from `langchain-google-genai` for Gemini models through Vertex AI, so the code and requirements were updated.
- The FastAPI example used `@app.on_event("startup")`, which is deprecated in current FastAPI. The example now uses the lifespan context manager and stores the chain on `app.state`.
- The `/query` endpoint called synchronous `chain.invoke()` inside an async FastAPI route. It now uses `await chain.ainvoke()` to avoid blocking the event loop during model calls.
- The Dockerfile hardcoded port `8080` in the Uvicorn command. Cloud Run injects the `PORT` environment variable, so the command now reads `${PORT:-8080}`.
- The testing instructions omitted the requirement that the caller must have permission to invoke a private Cloud Run service. A note was added that the identity used for the request needs the Cloud Run Invoker role.
- The streaming snippet referenced the old global `chain` variable and included unused imports from the old Vertex AI integration. It now uses `request.app.state.chain` and the current request payload variable.

## Review Notes
The examples are technically current as of 2026-05-28. The article still uses `gcr.io` image names, which can work, but Artifact Registry is the preferred Google Cloud registry for new projects and would be a good future modernization.
