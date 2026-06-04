# Validation Summary: How to Run LangFlow in Docker for Visual LLM Pipelines

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- LangFlow
- Docker
- Docker Compose
- PostgreSQL
- SQLite
- Ollama
- ChromaDB
- LangFlow API
- Python
- LangFlow custom components

## Sources Consulted
- LangFlow Docker deployment documentation: https://docs.langflow.org/deployment-docker
- LangFlow environment variables documentation: https://docs.langflow.org/environment-variables
- LangFlow API keys and authentication documentation: https://docs.langflow.org/api-keys-and-authentication
- LangFlow flow trigger endpoints documentation: https://docs.langflow.org/api-flows-run
- LangFlow visual editor and sharing documentation: https://docs.langflow.org/concepts-overview
- LangFlow import and export flows documentation: https://docs.langflow.org/next/concepts-flows-import
- LangFlow custom component documentation: https://docs.langflow.org/components-custom-components
- LangFlow memory and PostgreSQL documentation: https://docs.langflow.org/memory and https://docs.langflow.org/configuration-custom-database
- LangFlow API health-check documentation: https://docs.langflow.org/api-reference-api-examples
- Chroma Docker documentation: https://docs.trychroma.com/deployment/docker
- Chroma Cookbook Docker deployment notes: https://cookbook.chromadb.dev/running/running-chroma/
- Ollama Docker image documentation: https://hub.docker.com/r/ollama/ollama
- Docker Compose volumes documentation: https://docs.docker.com/reference/compose-file/volumes/

## Issues Found
- LangFlow Docker examples mounted `/app/langflow` but did not set `LANGFLOW_CONFIG_DIR`. Added `LANGFLOW_CONFIG_DIR=/app/langflow` so configuration and logs align with the mounted persistent path documented by LangFlow.
- Production LangFlow example did not set a stable `LANGFLOW_SECRET_KEY`. Added a placeholder secret key variable because LangFlow recommends setting one explicitly in production for encryption and JWT signing.
- ChromaDB volume used the legacy `/chroma/chroma` path. Changed it to `/data`, which is the current Chroma Docker persistence path.
- LangFlow API curl and Python examples omitted API-key authentication. Added the `x-api-key` header and Python request timeout/status handling to match current LangFlow API documentation.
- The post claimed LangFlow exports flows as standalone Python code. Updated this to describe the current supported export behavior: flow JSON export and generated Python, JavaScript, and curl API snippets.
- The custom component example used the old `CustomComponent` API. Replaced it with the current `lfx.custom.Component` pattern using `inputs`, `outputs`, and an output method.
- The health check used `/health`, which LangFlow documents as less reliable for service health. Changed it to `/health_check`.

## Review Notes
- The Compose files still use `version: "3.8"`. Modern Docker Compose treats the top-level `version` field as obsolete, but it remains widely accepted and does not make the examples invalid.
- The examples use `latest` image tags for quick starts. For repeatable production deployments, pin LangFlow, Chroma, and Ollama image versions after testing.
