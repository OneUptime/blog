# How to Understand Dapr SDK Serialization Behavior

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, SDK, Serialization, JSON, State

Description: Understand how Dapr SDKs serialize and deserialize data for state, pub/sub, and service invocation to avoid common data type and encoding bugs.

---

Dapr SDKs handle serialization transparently in most cases, but understanding the underlying behavior prevents subtle bugs when crossing language boundaries or working with binary data.

## Default Serialization Format

By default, Dapr SDKs serialize data as JSON when sending to state stores, pub/sub, and service invocation. The HTTP API sends JSON bodies; the gRPC API wraps payloads as `bytes` fields within Protobuf messages, where the bytes typically contain JSON-encoded data.

### Python SDK Example

```python
import json
from dapr.clients import DaprClient

with DaprClient() as client:
    # The value must be a string or bytes — serialize to JSON first
    state_value = {"user_id": 123, "name": "Alice"}
    client.save_state(store_name="statestore", key="user-123", value=json.dumps(state_value))

    # Retrieval returns a StateResponse; call .json() to deserialize
    result = client.get_state(store_name="statestore", key="user-123")
    user = result.json()  # Returns the dict
    print(user["name"])   # Alice
```

### JavaScript SDK Example

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

// Serialized to JSON
await client.state.save("statestore", [
  { key: "user-123", value: { userId: 123, name: "Alice" } }
]);

// Deserialized from JSON
const state = await client.state.get("statestore", "user-123");
console.log(state.name); // Alice
```

## Binary Data Handling

For binary data (images, protobuf payloads), use base64 encoding:

```python
import base64
from dapr.clients import DaprClient

with DaprClient() as client:
    binary_data = b"\x89PNG\r\n\x1a\n..."  # PNG header
    encoded = base64.b64encode(binary_data).decode("utf-8")
    client.save_state("statestore", "image-1", encoded)

    # Retrieve and decode
    result = client.get_state("statestore", "image-1")
    decoded = base64.b64decode(result.data)
```

## Cross-Language Compatibility

When a Go service saves state that a Python service reads, both must agree on the serialized format. Use explicit JSON marshaling to ensure consistency:

```go
// Go service saving state
import (
    "encoding/json"
    dapr "github.com/dapr/go-sdk/client"
)

type User struct {
    UserID int    `json:"user_id"`
    Name   string `json:"name"`
}

data, _ := json.Marshal(User{UserID: 123, Name: "Alice"})
client.SaveState(ctx, "statestore", "user-123", data, nil)
```

```python
# Python service reading the same state
result = client.get_state("statestore", "user-123")
user = result.json()
print(user["user_id"])  # 123
```

The key is that Go uses `json:"user_id"` field tags to match the Python key names.

## Content Type Headers

Dapr passes content type metadata for pub/sub messages. Set it explicitly:

```python
import json

client.publish_event(
    pubsub_name="pubsub",
    topic_name="orders",
    data=json.dumps({"order_id": 42}),
    data_content_type="application/json"
)
```

## Summary

Dapr SDKs default to JSON serialization for all data payloads. Binary data requires explicit base64 encoding before storage or publishing. Cross-language compatibility depends on consistent JSON field naming conventions enforced through struct tags or schema definitions. Always set `data_content_type` explicitly on pub/sub messages to avoid subscriber deserialization errors.
