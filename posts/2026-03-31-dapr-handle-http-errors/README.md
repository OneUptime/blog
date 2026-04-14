# How to Handle HTTP Errors in Dapr Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, HTTP, Error Handling, Resilience, Middleware

Description: Handle HTTP errors in Dapr applications by parsing error responses, implementing retry policies, using resiliency specs, and surfacing meaningful errors to callers.

---

Dapr's HTTP API follows standard HTTP status codes but adds Dapr-specific error codes in the response body. Correct HTTP error handling in your application makes it resilient to transient failures and easier to debug when things go wrong.

## Dapr HTTP Status Code Mapping

| HTTP Status | Meaning in Dapr Context |
|-------------|------------------------|
| 200 | Success |
| 204 | Success, no content (e.g., state save) |
| 400 | Bad request - malformed input |
| 401 | Unauthorized - authentication failure |
| 403 | Forbidden - access policy denied |
| 404 | Not found - service or method not found |
| 500 | Internal error - component failure |

## Parsing the Error Response

When Dapr returns a non-2xx response, parse the JSON body:

```python
import httpx
import json

DAPR_PORT = 3500

def invoke_method(app_id: str, method: str, data: dict) -> dict:
    url = f"http://localhost:{DAPR_PORT}/v1.0/invoke/{app_id}/method/{method}"
    response = httpx.post(url, json=data, timeout=10.0)

    if response.status_code == 200:
        return response.json()

    # Parse Dapr error body
    try:
        error_body = response.json()
        error_code = error_body.get("errorCode", "UNKNOWN")
        message = error_body.get("message", "No message")
    except json.JSONDecodeError:
        error_code = "PARSE_ERROR"
        message = response.text

    raise RuntimeError(f"Dapr error {response.status_code} [{error_code}]: {message}")
```

## Retry Logic for Service Invocation

503 (service unavailable) and 500 (transient component errors) are worth retrying:

```python
import time
import httpx

def invoke_with_retry(app_id: str, method: str, data: dict, max_retries: int = 3) -> dict:
    retryable_statuses = {500, 502, 503, 504}
    url = f"http://localhost:3500/v1.0/invoke/{app_id}/method/{method}"

    for attempt in range(max_retries):
        response = httpx.post(url, json=data, timeout=10.0)
        if response.status_code not in retryable_statuses:
            response.raise_for_status()
            return response.json()
        if attempt < max_retries - 1:
            wait = 2 ** attempt  # 1s, 2s
            time.sleep(wait)

    response.raise_for_status()
    return response.json()
```

## Using Dapr Resiliency Specs (Recommended)

Instead of hand-coding retry logic, use Dapr's built-in resiliency:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: myresiliency
scopes:
  - myapp
spec:
  policies:
    retries:
      DefaultRetryPolicy:
        policy: exponential
        maxInterval: 10s
        maxRetries: 3
    timeouts:
      DefaultTimeoutPolicy: 30s
  targets:
    apps:
      target-service:
        retry: DefaultRetryPolicy
        timeout: DefaultTimeoutPolicy
    components:
      statestore:
        outbound:
          retry: DefaultRetryPolicy
          timeout: DefaultTimeoutPolicy
```

```bash
kubectl apply -f resiliency.yaml
```

## Handling 404 and 500 - Service or Method Not Found

A 404 from service invocation is a passthrough from the target service, meaning the method or endpoint does not exist on that service. When the target app itself is not registered with Dapr, Dapr returns a 500 with error code `ERR_DIRECT_INVOKE`:

```python
response = httpx.post(f"http://localhost:3500/v1.0/invoke/target-service/method/nonexistent")
if response.status_code == 404:
    # The target service exists but the method was not found
    raise MethodNotFoundError("Method does not exist on the target service")

if response.status_code == 500:
    error_body = response.json()
    if error_body.get("errorCode") == "ERR_DIRECT_INVOKE":
        # The target app is not registered - check app-id spelling and that sidecar is running
        raise ServiceNotAvailableError("Target service not found in Dapr registry")
```

## JavaScript Example with Axios

```javascript
const axios = require("axios");

async function invokeService(appId, method, data) {
  try {
    const response = await axios.post(
      `http://localhost:3500/v1.0/invoke/${appId}/method/${method}`,
      data,
      { timeout: 10000 }
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      const { status, data: errData } = error.response;
      throw new Error(`Dapr HTTP ${status} [${errData.errorCode}]: ${errData.message}`);
    }
    throw error; // Network error
  }
}
```

## Summary

HTTP error handling in Dapr applications requires parsing the JSON error body for the `errorCode` field, implementing retry logic for 500/503 responses, and using Dapr's built-in Resiliency specs to avoid duplicating retry configuration across services. Non-retryable errors like 400, 403, and 404 should surface immediately with the `errorCode` included in the logged message for easier debugging.
