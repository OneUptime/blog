# How to Understand Dapr Error Codes and Error Handling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Error, Error Handling, HTTP, gRPC

Description: Understand Dapr error codes, their causes, and how to handle them correctly in your application code for both HTTP and gRPC API calls.

---

Dapr returns structured error responses for all API failures. Understanding the error code taxonomy helps you write correct retry logic, surface meaningful error messages to users, and diagnose problems quickly.

## Dapr Error Response Structure

For HTTP, Dapr returns a JSON error body:

```json
{
  "errorCode": "ERR_STATE_STORE_NOT_FOUND",
  "message": "state store statestore not found",
  "details": [
    {
      "@type": "type.googleapis.com/google.rpc.ErrorInfo",
      "reason": "DAPR_STATE_NOT_CONFIGURED",
      "domain": "dapr.io"
    }
  ]
}
```

## Common Error Codes

| Error Code | HTTP Status | Cause |
|-----------|-------------|-------|
| `ERR_STATE_STORE_NOT_FOUND` | 400 | State store component not configured |
| `ERR_STATE_GET` | 500 | State store read failure |
| `ERR_STATE_SAVE` | 500 | State store write failure |
| `ERR_PUBSUB_NOT_FOUND` | 404 | Pub/sub component not configured |
| `ERR_PUBSUB_PUBLISH_MESSAGE` | 500 | Publish failed |
| `ERR_INVOKE_OUTPUT_BINDING` | 500 | Output binding invocation failed |
| `ERR_DIRECT_INVOKE` | 403 | Access policy rejected invocation |
| `ERR_APP_CHANNEL_NIL` | 500 | App channel not initialized |

## Handling Errors in Python

```python
from dapr.clients import DaprClient
from dapr.clients.exceptions import DaprInternalError

with DaprClient() as client:
    try:
        result = client.get_state(store_name="statestore", key="user-1")
        if result.data:
            user = result.json()
        else:
            user = None  # Key not found is not an error - data is empty
    except DaprInternalError as e:
        # Parse the error code
        if "ERR_STATE_STORE_NOT_FOUND" in str(e):
            raise RuntimeError("State store is not configured") from e
        raise
```

## Handling Errors in JavaScript

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

try {
  const state = await client.state.get("statestore", "user-1");
} catch (error) {
  if (error.message.includes("ERR_STATE_STORE_NOT_FOUND")) {
    console.error("State store component is not configured:", error.message);
    process.exit(1);
  }
  // For transient errors, retry
  if (error.message.includes("ERR_STATE_GET")) {
    console.warn("Transient state read error, will retry:", error.message);
    throw error; // Let the caller handle retry
  }
  throw error;
}
```

## Retry Logic for Transient Errors

Not all errors are permanent. State store and pub/sub errors may be transient:

```python
import time
from dapr.clients import DaprClient
from dapr.clients.exceptions import DaprInternalError

def save_state_with_retry(key, value, max_retries=3, delay=1.0):
    with DaprClient() as client:
        for attempt in range(max_retries):
            try:
                client.save_state("statestore", key, value)
                return
            except DaprInternalError as e:
                if attempt < max_retries - 1 and "ERR_STATE_SAVE" in str(e):
                    time.sleep(delay * (2 ** attempt))  # Exponential backoff
                    continue
                raise
```

## Distinguishing "Not Found" from Errors

For state store GET, an empty response means the key does not exist - it is not an error:

```python
result = client.get_state("statestore", "user-1")
if not result.data:
    print("Key not found")  # Normal - key was never set
else:
    print("Found:", result.json())
```

## Summary

Dapr error codes are structured strings like `ERR_STATE_STORE_NOT_FOUND` that identify the category and cause of a failure. Distinguish between configuration errors (not retryable) and transient errors (worth retrying with backoff). An empty state GET response indicates a missing key, not an error. Always check the `errorCode` field in the response body rather than relying solely on HTTP status codes for Dapr error handling.
