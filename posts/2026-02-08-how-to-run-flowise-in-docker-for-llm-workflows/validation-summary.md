# Validation Summary: How to Run Flowise in Docker for LLM Workflows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Flowise
- PostgreSQL
- Ollama
- Chroma
- Flowise Prediction API
- Python requests

## Sources Consulted
- Flowise official environment variables documentation: https://docs.flowiseai.com/configuration/environment-variables
- Flowise official database documentation: https://docs.flowiseai.com/configuration/databases
- Flowise official application authorization documentation: https://docs.flowiseai.com/configuration/authorization/application
- Flowise official Docker README and compose example: https://github.com/FlowiseAI/Flowise/tree/main/docker
- Flowise official Prediction API documentation: https://docs.flowiseai.com/using-flowise/prediction
- Flowise official Chatflow authorization documentation: https://docs.flowiseai.com/configuration/authorization/chatflow-level
- Flowise official Chatflows API reference: https://docs.flowiseai.com/api-reference/chatflows
- Flowise official memory documentation: https://docs.flowiseai.com/integrations/langchain/memory
- Flowise official Conversational Retrieval QA Chain documentation: https://docs.flowiseai.com/integrations/langchain/chains/conversational-retrieval-qa-chain
- Chroma official Docker deployment documentation: https://docs.trychroma.com/guides/deploy/docker
- Ollama official Docker documentation: https://docs.ollama.com/docker
- Docker official volume documentation: https://docs.docker.com/get-started/docker-concepts/running-containers/persisting-container-data/

## Issues Found
- The Flowise Docker Compose examples used `FLOWISE_USERNAME` and `FLOWISE_PASSWORD` as the main security settings. Flowise v3 introduced email/password account authentication with JWT-based auth, and the username/password method is documented as deprecated. I replaced those settings with current auth-related environment variables such as `APP_URL`, `JWT_AUTH_TOKEN_SECRET`, `JWT_REFRESH_TOKEN_SECRET`, `EXPRESS_SESSION_SECRET`, and `TOKEN_HASH_SECRET`.
- The examples mounted `/root/.flowise` but did not explicitly place Flowise's secret key, logs, and blob storage paths under that mounted volume. I added `SECRETKEY_PATH`, `LOG_PATH`, and `BLOB_STORAGE_PATH` where appropriate so credentials, logs, and uploads persist as described.
- The production Compose example labeled `APIKEY_PATH=/root/.flowise` as API rate limiting. `APIKEY_PATH` is not part of the current official Flowise environment variable set, and it is not a rate-limit setting. I removed it.
- The Chroma service mounted persistent data at `/chroma/chroma`. Current Chroma Docker documentation uses `/data` for persisted server data, so I changed the volume mount to `chroma_data:/data`.

## Review Notes
- The Docker commands, PostgreSQL settings, Ollama container setup, Flowise prediction endpoint, bearer-token API examples, `sessionId` override usage, and listed Flowise RAG nodes were consistent with current official documentation.
- The examples intentionally use placeholder secrets and passwords. Real deployments should generate strong unique values, for example with `openssl rand -hex 32`, before exposing Flowise beyond a local machine.
