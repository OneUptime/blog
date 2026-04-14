# Validation Summary: How to Build a Multi-Channel Notification System with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub, state management, service invocation, resiliency)
- Python (Dapr Python SDK, FastAPI)
- JavaScript/Node.js (Dapr JS SDK, Express)
- C# / .NET (Dapr .NET SDK, ASP.NET Core)
- Go (Dapr Go SDK)
- YAML (Dapr resiliency configuration)

## Sources Consulted
- Dapr Python SDK source code: https://github.com/dapr/python-sdk — verified `publish_event` accepts only `bytes` or `str` (not `dict`), `DaprClient` import path, `get_state` return type, and `DaprApp.subscribe` decorator signature
- Dapr JavaScript SDK source code: https://github.com/dapr/js-sdk — verified `client.state.get()` returns a single value (not an array), and `client.state.save()` signature
- Dapr .NET SDK source code: https://github.com/dapr/dotnet-sdk — verified `InvokeMethodAsync` overloads and parameter order, `TopicAttribute` constructor signatures and match expression CEL format
- Dapr resiliency documentation: https://docs.dapr.io/operations/resiliency/ — verified resiliency YAML spec structure

## Issues Found

### 1. Python publisher `publish_event` passed a `dict` instead of serialized string (line 48)
**What was wrong:** `self.client.publish_event(self.pubsub, self.topic, notification)` passed a `dict` directly, but the Dapr Python SDK's `publish_event` only accepts `bytes` or `str` and raises `ValueError` otherwise.
**What was changed:** Wrapped the notification in `json.dumps()` and added `data_content_type="application/json"`.

### 2. JavaScript `state.get` incorrectly destructured as array (line 69)
**What was wrong:** `const [prefs] = await client.state.get(...)` used array destructuring, but `state.get` returns a single value (parsed JSON object or string), not an array.
**What was changed:** Changed to `const prefs = await client.state.get(...)`.

### 3. C# `[Topic]` attribute missing priority parameter and incorrect match syntax (line 95)
**What was wrong:** `[Topic("pubsub", "notifications", "type == '...'")]` used 3 string params, but no such constructor exists. Match expressions require a priority (int) as the 4th parameter. Also, CEL match expressions for CloudEvents attributes require the `event.` prefix.
**What was changed:** Changed to `[Topic("pubsub", "notifications", "event.type == 'order_confirmation' || event.type == 'password_reset'", 1)]`.

### 4. C# `InvokeMethodAsync` parameter order was wrong (lines 103-106)
**What was wrong:** Parameters were `(string appId, string methodName, HttpMethod)`, but the Dapr .NET SDK requires `HttpMethod` as the first parameter: `InvokeMethodAsync<TResponse>(HttpMethod, string appId, string methodName)`.
**What was changed:** Moved `HttpMethod.Get` to the first parameter position.

### 5. Python webhook service missing imports (lines 188-192)
**What was wrong:** `json` and `DaprClient` were used in the webhook service code but not imported.
**What was changed:** Added `import json` and `from dapr.clients import DaprClient` to the imports.

## Review Notes
- The C# email service uses `CloudEvent<Notification>` as the parameter type, which is not a standard type in the Dapr .NET SDK. In typical Dapr pub/sub subscribers, the data payload is deserialized directly into the model type (e.g., `[FromBody] Notification notification`). This appears to be a custom wrapper type; readers may need to define it or adjust to use the standard pattern.
- The resiliency YAML for the SMS service omits the `duration` field (initial backoff interval) for the exponential retry policy. While a default may apply, explicitly setting it (e.g., `duration: 1s`) is recommended for clarity.
- The `[Topic]` match expression routes on `event.type` (the CloudEvents `type` attribute), but the publisher doesn't explicitly set the CloudEvents type — Dapr defaults it to `com.dapr.event.sent`. For the routing to work as intended, the publisher would need to set the CloudEvents type when publishing, or the filtering should be done in the handler code (as demonstrated in the SMS service).
- The `InvokeMethodAsync` method used in the C# service is marked as `[Obsolete]` in the current Dapr .NET SDK. The recommended approach is to use a native HTTP or gRPC client for service invocation.
