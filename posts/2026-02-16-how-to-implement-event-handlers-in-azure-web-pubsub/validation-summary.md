# Validation Summary: How to Implement Event Handlers in Azure Web PubSub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Web PubSub
- Azure Web PubSub event handlers
- Azure Web PubSub JavaScript server SDK
- @azure/web-pubsub-express middleware
- Azure CLI
- Express.js
- Node.js
- CloudEvents HTTP binding

## Sources Consulted
- Azure Web PubSub CloudEvents handlers for Express: https://learn.microsoft.com/en-us/javascript/api/overview/azure/web-pubsub-express-readme?view=azure-node-latest
- WebPubSubEventHandlerOptions API reference: https://learn.microsoft.com/en-us/javascript/api/%40azure/web-pubsub-express/webpubsubeventhandleroptions?view=azure-node-latest
- UserEventResponseHandler API reference: https://learn.microsoft.com/en-us/javascript/api/%40azure/web-pubsub-express/usereventresponsehandler?view=azure-node-latest
- ConnectResponseHandler API reference: https://learn.microsoft.com/en-us/javascript/api/%40azure/web-pubsub-express/connectresponsehandler?view=azure-node-latest
- Azure Web PubSub service client library for JavaScript: https://learn.microsoft.com/en-us/javascript/api/overview/azure/web-pubsub-readme?view=azure-node-latest
- Generate client access URL for Azure Web PubSub clients: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/howto-generate-client-access-url
- Configure event handler in Azure Web PubSub service: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/howto-develop-eventhandler
- Azure CLI `az webpubsub hub` reference: https://learn.microsoft.com/en-us/cli/azure/webpubsub/hub?view=azure-cli-latest
- Write an upstream server for Azure Web PubSub: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/howto-web-pubsub-write-upstream-server
- Azure Web PubSub CloudEvents reference: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/reference-cloud-events
- Azure Web PubSub service internals: https://learn.microsoft.com/en-us/azure/azure-web-pubsub/concept-service-internals

## Issues Found
- The token endpoint used `serviceClient.getClientAccessUrl`, but current JavaScript server SDK documentation uses `getClientAccessToken`. Updated the code to call `getClientAccessToken` and return `token.url`.
- The "complete server" example said it handled all event types but omitted `handleConnect`, and its `onConnected` comment described the pre-connect phase. Added a simple `handleConnect` callback and corrected the `onConnected` comment.
- The connect handler used `res.fail(403, ...)`, but the Express SDK `ConnectResponseHandler.fail` accepts `400`, `401`, or `500`. Changed the example to use `401`.
- The Azure CLI example passed `system-event="connect,connected,disconnected"` as one value. The CLI reference shows repeated `system-event` key-value pairs for multiple system events. Updated the command to repeat `system-event` for each event.
- The explanation said user event names can be supplied as a comma-separated list. The CLI reference treats `user-event-pattern` as a single key where only the last value is active. Reworded this to use a single event name or separate event handler settings.
- The raw Express example attempted to handle validation inside an `app.post` route, but Web PubSub validation uses `OPTIONS`. Added an `app.options('/api/pubsub', ...)` handler that returns `WebHook-Allowed-Origin`.
- The error-handling section claimed Web PubSub retries thrown errors or 5xx responses and cited a default 5-second connect timeout. I did not find support for that exact retry/timeout statement in the consulted official docs, so I replaced it with the documented blocking-event contract: `2xx` acknowledges user events and failed `connect` responses reject the connection.

## Review Notes
The post is technically relevant and contains implementation details. The examples now align with current official SDK, CLI, and CloudEvents validation documentation. The role strings shown are broad examples; production applications should prefer narrower group-specific or wildcard roles where possible.
