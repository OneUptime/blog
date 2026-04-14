# How to Handle gRPC Errors in Dapr Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, gRPC, Error Handling, Status Code, Resilience

Description: Handle gRPC errors in Dapr applications by interpreting gRPC status codes, extracting error details, implementing retry logic, and using Dapr resiliency policies.

---

When using Dapr's gRPC API or invoking gRPC-based services through Dapr, errors arrive as gRPC status codes with detailed error information. Understanding these codes and extracting the details correctly makes your application much easier to debug and operate.

## gRPC Status Codes in Dapr Context

| gRPC Code | Numeric | Dapr Meaning |
|-----------|---------|--------------|
| `OK` | 0 | Success |
| `CANCELLED` | 1 | Request cancelled by caller |
| `UNKNOWN` | 2 | Unknown error from component |
| `INVALID_ARGUMENT` | 3 | Malformed request |
| `NOT_FOUND` | 5 | Service or key not found |
| `ALREADY_EXISTS` | 6 | Duplicate key/resource |
| `PERMISSION_DENIED` | 7 | Access policy rejected |
| `RESOURCE_EXHAUSTED` | 8 | Rate limit or quota exceeded |
| `UNAVAILABLE` | 14 | Service temporarily unavailable |
| `INTERNAL` | 13 | Internal Dapr or component error |

## Python: Catching gRPC Errors

```python
import grpc
from dapr.clients import DaprClient

with DaprClient() as client:
    try:
        result = client.get_state(store_name="statestore", key="user-1")
    except grpc.RpcError as e:
        status_code = e.code()
        details = e.details()

        if status_code == grpc.StatusCode.NOT_FOUND:
            print("Key not found")
        elif status_code == grpc.StatusCode.UNAVAILABLE:
            print(f"State store unavailable, retrying: {details}")
            raise  # Let retry logic handle this
        elif status_code == grpc.StatusCode.INTERNAL:
            print(f"Internal error: {details}")
            raise
        else:
            print(f"Unexpected gRPC error {status_code}: {details}")
            raise
```

## Go: Handling gRPC Status Errors

```go
import (
    "context"
    "fmt"
    dapr "github.com/dapr/go-sdk/client"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

func getState(client dapr.Client, key string) ([]byte, error) {
    result, err := client.GetState(context.Background(), "statestore", key, nil)
    if err != nil {
        st, ok := status.FromError(err)
        if !ok {
            return nil, err
        }
        switch st.Code() {
        case codes.NotFound:
            return nil, nil // Key does not exist
        case codes.Unavailable:
            return nil, fmt.Errorf("state store unavailable: %w", err)
        default:
            return nil, fmt.Errorf("state get failed [%s]: %w", st.Code(), err)
        }
    }
    return result.Value, nil
}
```

## Extracting Rich Error Details

Dapr embeds `google.rpc.ErrorInfo` and `google.rpc.RetryInfo` in gRPC trailers:

```python
import grpc
from google.rpc import error_details_pb2
from grpc_status import rpc_status

try:
    client.save_state("statestore", "key", "value")
except grpc.RpcError as e:
    status = rpc_status.from_call(e)
    if status:
        for detail in status.details:
            if detail.Is(error_details_pb2.ErrorInfo.DESCRIPTOR):
                info = error_details_pb2.ErrorInfo()
                detail.Unpack(info)
                print(f"Error reason: {info.reason}")
                print(f"Error domain: {info.domain}")
```

## Retry Logic for Unavailable Errors

```python
import time
import grpc

def save_state_with_retry(client, key, value, max_retries=3):
    for attempt in range(max_retries):
        try:
            client.save_state("statestore", key, value)
            return
        except grpc.RpcError as e:
            if e.code() == grpc.StatusCode.UNAVAILABLE and attempt < max_retries - 1:
                wait = 2 ** attempt
                print(f"Retrying in {wait}s (attempt {attempt + 1}/{max_retries})")
                time.sleep(wait)
                continue
            raise
```

## Using Dapr Resiliency Instead

Configure retries declaratively to avoid boilerplate in every service:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: grpc-resiliency
spec:
  policies:
    retries:
      grpcRetry:
        policy: exponential
        maxInterval: 5s
        maxRetries: 3
        matching:
          gRPCStatusCodes: "13,14"
  targets:
    components:
      statestore:
        outbound:
          retry: grpcRetry
```

## Summary

gRPC errors in Dapr carry a status code and details that tell you exactly what failed and why. Python and Go SDK users catch `grpc.RpcError` and inspect the status code to decide whether to retry (`UNAVAILABLE`, `INTERNAL`) or fail immediately (`INVALID_ARGUMENT`, `PERMISSION_DENIED`). Using Dapr's Resiliency spec moves retry configuration out of application code and into the infrastructure layer where it can be updated without redeployment.
