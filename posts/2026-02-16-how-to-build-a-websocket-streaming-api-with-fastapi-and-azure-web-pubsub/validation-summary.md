# Validation Summary: How to Build a WebSocket Streaming API with FastAPI and Azure Web PubSub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- FastAPI
- Azure Web PubSub
- Azure Web PubSub Python service SDK
- Azure CLI
- Azure Container Apps
- WebSocket
- JavaScript WebSocket API
- Python asyncio

## Sources Consulted
- Microsoft Learn: Azure Web PubSub Python service SDK, `WebPubSubServiceClient` API: https://learn.microsoft.com/uk-ua/python/api/azure-messaging-webpubsubservice/azure.messaging.webpubsubservice.webpubsubserviceclient?view=azure-python
- Microsoft Learn: Azure Web PubSub JSON WebSocket subprotocol: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/reference-json-webpubsub-subprotocol
- Microsoft Learn: Azure Web PubSub client protocols: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/concept-client-protocols
- Microsoft Learn: Azure Web PubSub service limits: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits#azure-web-pubsub-limits
- Microsoft Learn: Azure CLI `az webpubsub` reference: https://learn.microsoft.com/en-us/cli/azure/webpubsub?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az containerapp create` reference: https://learn.microsoft.com/en-gb/cli/azure/containerapp?view=azure-cli-latest
- FastAPI documentation: Lifespan events: https://fastapi.tiangolo.com/advanced/events/
- FastAPI documentation: Request body handling: https://fastapi.tiangolo.com/tutorial/body/

## Issues Found
- The introduction attributed WebSocket scaling problems mainly to Python's GIL and single-threaded nature. This was too broad for an async FastAPI/WebSocket architecture, so it was corrected to focus on the operational complexity Azure Web PubSub actually offloads: connection state, reconnects, fan-out, and horizontal scaling.
- The Azure setup commands used `streaming-rg` without creating it. Added an `az group create` command before creating the Web PubSub resource.
- The Python service wrapper JSON-serialized dictionaries before sending them with `content_type="application/json"`. The current Azure Web PubSub SDK accepts JSON mappings directly, so the examples now pass the dictionaries as `message=data`.
- The JavaScript client parsed `message.data` unconditionally with `JSON.parse()`. The Azure Web PubSub JSON subprotocol delivers `data` as a JSON value for JSON messages, so the client now uses the object directly when `dataType` is `json` and falls back to parsing string payloads.
- The Container Apps deployment command referenced `secretref:pubsub-connection` without creating the secret. Added `--secrets pubsub-connection="$WEBPUBSUB_CONNECTION_STRING"` to the command.
- The scaling section claimed Azure Web PubSub Standard supports 100,000 concurrent connections per unit. Current Microsoft limits list 1,000 concurrent connections per unit for Standard/Premium, with Standard/Premium_P1 instances supporting up to 100 units. Updated the claim accordingly.

## Review Notes
The code snippets are tutorial examples and omit production concerns such as authentication policy, retry/backoff behavior, cancellation handling for background tasks, and restrictive CORS settings. The Python code blocks were syntax-checked after edits.
