# Validation Summary: How to Handle HTTP Errors in Dapr Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (service invocation HTTP API, resiliency specs)
- Python (httpx, json)
- JavaScript (axios)
- Kubernetes (kubectl apply)
- YAML (Dapr Resiliency resource)

## Sources Consulted
- Dapr Resiliency Overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency Policies: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Resiliency Schema Reference: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Service Invocation API Reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr source code (`pkg/messages/predefined.go`, `pkg/api/http/directmessaging.go`) for HTTP status code behavior

## Issues Found

### 1. Incorrect retry backoff comment
- **What was wrong:** The comment `# 1s, 2s, 4s` on the exponential backoff calculation (`wait = 2 ** attempt`) implied three sleep durations. However, with `max_retries=3`, only two sleeps actually occur (after attempt 0 and attempt 1). The third attempt does not sleep because it is the last attempt.
- **What was changed:** Updated the comment to `# 1s, 2s`.
- **Why:** The comment was misleading about the actual retry behavior.

### 2. Incorrect 404 error handling explanation
- **What was wrong:** The section "Handling 404 - Service Not Found" claimed that a 404 from service invocation means the target app is not registered with Dapr. This is incorrect. According to the Dapr source code and API reference, when a target app-id is not found or not registered, Dapr returns HTTP 500 with error code `ERR_DIRECT_INVOKE`. A 404 from service invocation is a passthrough from the target service, indicating the method/endpoint does not exist on that service.
- **What was changed:** Rewrote the section to correctly distinguish between a 404 (method not found on the target service, passthrough) and a 500 with `ERR_DIRECT_INVOKE` (target app not registered with Dapr). Updated the heading, explanation, and code example accordingly.
- **Why:** The original explanation would lead developers to misdiagnose service registration failures (500) as 404 errors, and vice versa.

## Review Notes
- The Resiliency YAML spec is correct and matches the official Dapr documentation, including field names (`policy`, `maxInterval`, `maxRetries`), timeout syntax, target structure, and `scopes` placement.
- The Python code uses `httpx` correctly and the JSON error parsing approach is sound.
- The JavaScript/axios error handling follows the correct axios error pattern.
- The `ServiceNotAvailableError` and `MethodNotFoundError` referenced in the code examples are custom exception classes (not built-in Python exceptions) and are assumed to be defined elsewhere. This is a common pattern in tutorial code and is not an error.
