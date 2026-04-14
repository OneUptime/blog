# Validation Summary: How to Configure Dapr Pub/Sub Subscriptions in Code vs YAML

## Status
validated

## Post Type
Tutorial / Comparison Guide

## Technologies Covered
- Dapr pub/sub building block
- Dapr Subscription CRD (v1alpha1 and v2alpha1)
- Go standard library `net/http`
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Python SDK with FastAPI extension (`dapr-ext-fastapi`)
- Dapr JavaScript/TypeScript SDK (`@dapr/dapr`)
- Kubernetes (kubectl apply)
- CEL (Common Expression Language) for routing rules

## Sources Consulted
- Dapr Subscription spec reference (v1alpha1 and v2alpha1): https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr Python SDK FastAPI extension docs: https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/python-fastapi/
- Dapr Python SDK gRPC extension docs: https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/python-grpc/
- Dapr Python SDK source (`dapr/ext/fastapi/app.py`): https://github.com/dapr/python-sdk/blob/master/ext/dapr-ext-fastapi/dapr/ext/fastapi/app.py
- Dapr Python SDK source (`dapr/clients/grpc/_response.py`): https://github.com/dapr/python-sdk/blob/main/dapr/clients/grpc/_response.py
- Dapr JS SDK `DaprClientOptions` type definition: https://github.com/dapr/js-sdk (types/DaprClientOptions.ts)
- Dapr JS SDK pub/sub examples: https://github.com/dapr/js-sdk/tree/main/examples
- Dapr Go SDK `common.Subscription` and `common.TopicEvent` structs: https://github.com/dapr/go-sdk/blob/main/service/common/service.go

## Issues Found

### 1. Python (FastAPI): Incorrect use of `TopicEventResponse` from gRPC extension
- **What was wrong:** The example imported `TopicEventResponse` from `dapr.clients.grpc._response` and returned `TopicEventResponse("success")` from FastAPI subscribe handlers. While the import path is technically valid (the class does exist there), `TopicEventResponse` is designed for the gRPC service extension (`dapr.ext.grpc`), not the FastAPI HTTP extension. The official FastAPI extension documentation and source code do not reference `TopicEventResponse` at all. Returning a gRPC response object from a FastAPI handler would not produce the correct HTTP JSON response that the Dapr sidecar expects.
- **What was changed:** Removed the `TopicEventResponse` import. Changed handler return values to `{"status": "SUCCESS"}`, which is the standard HTTP response format for Dapr pub/sub acknowledgement.
- **Why:** The Dapr sidecar communicates with the app via HTTP when using the FastAPI extension. It expects a JSON response with a `status` field (`SUCCESS`, `RETRY`, or `DROP`). The official FastAPI extension docs show handlers returning plain dicts or no explicit return.

### 2. TypeScript: `daprHost` included HTTP protocol prefix
- **What was wrong:** The `DaprServer` constructor used `daprHost: "http://localhost"` with the `http://` protocol prefix.
- **What was changed:** Changed to `daprHost: "localhost"` (hostname only, no protocol).
- **Why:** The `DaprClientOptions` type definition documents `daprHost` as "Host location of the Dapr sidecar" with default `127.0.0.1`. All official SDK examples use bare hostnames (e.g., `"127.0.0.1"`, `"localhost"`) without protocol prefixes. The SDK constructs the full URI internally based on the configured communication protocol.

## Review Notes
- The v1alpha1 Subscription CRD used in several examples is marked as deprecated in the official Dapr docs. The post could note this in a future update, but it remains functional and is still commonly referenced.
- The Go HTTP example correctly implements the `/dapr/subscribe` endpoint JSON contract. The Go SDK example correctly uses `common.Subscription` with `Match` field and `common.TopicEvent.RawData` (`[]byte`).
- The YAML subscription CRDs correctly place `scopes` at the top level (sibling of `spec`), matching the official schema.
- The CEL match expressions (`event.type == "..."`, `event.data.priority == "..."`) follow valid Dapr routing rule syntax.
- The comparison table accurately characterizes the trade-offs between declarative and programmatic subscriptions.
