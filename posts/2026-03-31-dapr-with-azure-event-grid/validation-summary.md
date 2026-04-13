# Validation Summary: How to Use Dapr with Azure Event Grid

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (bindings.azure.eventgrid component)
- Azure Event Grid (custom topics, event subscriptions)
- Azure CLI (az eventgrid)
- Python (requests, Flask)
- Kubernetes (secrets)

## Sources Consulted
- Dapr Azure Event Grid binding reference: https://docs.dapr.io/reference/components-reference/supported-bindings/eventgrid/
- Dapr bindings API specification: https://docs.dapr.io/reference/api/bindings_api/
- Azure Event Grid CLI reference: https://learn.microsoft.com/en-us/cli/azure/eventgrid
- Azure Event Grid event schema: https://learn.microsoft.com/en-us/azure/event-grid/event-schema

## Issues Found
1. **Incorrect metadata field name `topic` in Dapr component** (line 49): The Dapr Event Grid binding uses the metadata field name `topicEndpoint`, not `topic`. Changed `topic` to `topicEndpoint` to match the Dapr component specification.

## Review Notes
- The "Receive Events" section states that "Dapr handles the Event Grid subscription handshake automatically" but then the Flask code manually handles `SubscriptionValidationEvent`. When using Dapr's input binding, the handshake is handled by Dapr on the `handshakePort`, so the manual validation code in the Flask handler is redundant. However, the code is not incorrect — it would simply never be reached in a Dapr-managed scenario and serves as a defensive fallback.
- The Dapr input binding delivers events individually to the app, but the Flask handler iterates over `request.json` as if it were an array (raw Event Grid webhook format). With Dapr's input binding, each event arrives as a separate invocation. This inconsistency would not cause a runtime error but reflects a conceptual mix between direct Event Grid webhooks and Dapr-mediated delivery.
- For the Dapr input binding to automatically create and manage event subscriptions, the component would additionally need Azure AD service principal credentials (`tenantId`, `subscriptionId`, `clientId`, `clientSecret`) and a `scope` field. The blog works around this by creating subscriptions manually via CLI, which is a valid alternative approach.
- `datetime.utcnow()` is deprecated as of Python 3.12 in favor of `datetime.now(datetime.UTC)`. The code still functions correctly but may trigger deprecation warnings on newer Python versions.
