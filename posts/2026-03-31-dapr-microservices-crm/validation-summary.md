# Validation Summary: How to Build a Microservices-Based CRM with Dapr

## Status
validated

## Post Type
Tutorial / Architecture Guide

## Technologies Covered
- Dapr (sidecar architecture, building blocks)
- Dapr Python SDK (`dapr-client`, `dapr-ext-fastapi`)
- Dapr JavaScript SDK (`@dapr/dapr` v3)
- Dapr .NET SDK (Actors, DaprClient)
- FastAPI (Python)
- Express.js (Node.js)
- Kubernetes (Deployments with Dapr annotations)
- Pub/Sub messaging
- State management
- Service invocation
- Actor model with reminders

## Sources Consulted
- Dapr Python SDK client documentation: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr .NET SDK DaprClient usage: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-client/dotnet-daprclient-usage/
- Dapr .NET Actors documentation: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/
- Kubernetes Deployment spec: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Dapr Kubernetes annotations: https://docs.dapr.io/reference/arguments-annotations-overview/

## Issues Found
1. **Kubernetes Deployment YAML missing required `spec.selector`**: The `apps/v1` Deployment was missing the required `spec.selector.matchLabels` field and corresponding `spec.template.metadata.labels`. Without these, the Kubernetes API server rejects the manifest. Added `selector.matchLabels` and pod template `labels` with `app: contact-service`.

2. **Python `publish_event()` passed raw dict instead of serialized string**: The `DaprClient.publish_event()` method expects `str` or `bytes` for the `data` parameter, not a Python `dict`. Changed `client.publish_event("pubsub", "contact-created", contact)` to `client.publish_event("pubsub", "contact-created", json.dumps(contact), data_content_type='application/json')`.

3. **JavaScript service invocation used raw string instead of HttpMethod enum**: The `client.invoker.invoke()` method expects an `HttpMethod` enum value, not a raw string. Added `HttpMethod` to the `require('@dapr/dapr')` import and changed `'GET'` to `HttpMethod.GET`.

4. **C# `new DaprClient()` is invalid**: `DaprClient` is an abstract class in the Dapr .NET SDK and cannot be instantiated directly. Changed `new DaprClient()` to `new DaprClientBuilder().Build()`.

## Review Notes
- The `DaprApp` import and instantiation in the Python service (`dapr_app = DaprApp(app)`) is unused — it's created but no subscriptions are registered through it. Not technically wrong, but unnecessary code.
- The `Contact` dataclass and `asdict` import in the Python service are defined but never used by the endpoint handlers (which accept raw `dict`). This is a code quality issue, not a technical error.
- The JavaScript pipeline service runs both a `DaprServer` on port 3001 and an Express app on port 8080. In a real deployment, the `dapr.io/app-port` annotation would need to match the DaprServer port for pub/sub callbacks to work correctly, which could conflict with Express handling HTTP requests on a different port.
- The `server.start()` call in the JavaScript service is not awaited, which could lead to race conditions in a production setup.
