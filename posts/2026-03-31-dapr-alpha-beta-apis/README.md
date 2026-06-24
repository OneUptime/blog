# How to Use Dapr Alpha and Beta APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, API, Alpha, Beta, Feature Flag

Description: Learn how to enable and use Dapr alpha and beta APIs, understand their stability guarantees, and safely test preview features in your applications.

---

## Understanding Dapr API Stability Levels

Dapr labels its APIs with stability tiers to communicate expected reliability:

- **Stable** - production-ready, backward-compatible
- **Beta** - feature-complete, may have minor breaking changes
- **Alpha** - experimental, breaking changes expected

## Calling Alpha APIs via HTTP

Alpha APIs typically include a version label in their path:

```bash
# Query state store using alpha query API
  curl -X POST http://localhost:3500/v1.0-alpha1/state/statestore/query \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {
      "EQ": {"person.org": "Dev Ops"}
    },
    "sort": [{"key": "person.id", "order": "ASC"}],
    "page": {"limit": 10}
  }'
```

## Using Beta APIs in the Go SDK

```go
import (
    "bytes"
    "context"
    "io"

    dapr "github.com/dapr/go-sdk/client"
)

func main() {
    client, _ := dapr.NewClient()
    defer client.Close()

    // Crypto API (alpha)
    plaintext := bytes.NewReader([]byte("secret payload"))
    encrypted, _ := client.Encrypt(context.Background(), plaintext, dapr.EncryptOptions{
        ComponentName: "vault",
        KeyName:       "my-rsa-key",
        Algorithm:     "RSA",
    })
    result, _ := io.ReadAll(encrypted)
    _ = result
}
```

## Discovering Available Preview Features

Check the runtime metadata to see which preview features are supported:

```bash
curl http://localhost:3500/v1.0/metadata | jq '.enabledFeatures'
```

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Breaking changes on upgrade | Pin Dapr version in CI |
| Incomplete error handling | Add fallback logic |
| Undocumented behavior | Follow Dapr Discord for updates |

## Summary

Dapr alpha and beta APIs let you test cutting-edge features before they graduate to stable status. Call them using the versioned API paths documented for each feature, validate payloads against the current docs, and be prepared for breaking changes when upgrading Dapr versions.
