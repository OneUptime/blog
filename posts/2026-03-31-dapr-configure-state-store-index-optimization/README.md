# How to Configure State Store Index Optimization for Dapr Query API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Query API, Index, Redis

Description: Configure state store indexes in Dapr to enable efficient querying with the Query API, including Redis JSON index setup and schema definitions.

---

## Overview

Dapr's State Query API lets you filter, sort, and paginate over state data. To use it efficiently, you need to configure indexes on your backing state store. Redis Stack (with RedisJSON and RediSearch) is the primary supported backend.

## Enabling the Query API with Redis Stack

Switch from plain Redis to Redis Stack in your Dapr component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-stack:6379"
  - name: queryIndexes
    value: |
      [
        {
          "name": "usersByCity",
          "indexes": [
            {"key": "city", "type": "TEXT"},
            {"key": "age", "type": "NUMERIC"},
            {"key": "active", "type": "TEXT"}
          ]
        }
      ]
```

## Storing Indexed State

When saving state, use the `contentType` metadata to mark data as JSON:

```bash
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{
    "key": "user-001",
    "value": {"name": "Alice", "city": "Seattle", "age": 30, "active": true},
    "metadata": {"contentType": "application/json"}
  }]'
```

## Querying State with Filters and Sorting

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/state/statestore/query \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {
      "AND": [
        {"EQ": {"city": "Seattle"}},
        {"GT": {"age": 25}}
      ]
    },
    "sort": [{"key": "age", "order": "ASC"}],
    "page": {"limit": 10}
  }'
```

## Using the Go SDK for Querying

```go
package main

import (
    dapr "github.com/dapr/go-sdk/client"
    "context"
    "fmt"
)

func main() {
    client, _ := dapr.NewClient()
    defer client.Close()

    query := `{
        "filter": {"EQ": {"active": true}},
        "sort": [{"key": "city", "order": "DESC"}],
        "page": {"limit": 5}
    }`

    result, err := client.QueryStateAlpha1(
        context.Background(), "statestore", query, nil,
    )
    if err != nil {
        panic(err)
    }
    for _, item := range result.Results {
        fmt.Printf("Key: %s, Data: %s\n", item.Key, item.Value)
    }
}
```

## Paginating Through Large Result Sets

```bash
# First page
curl -X POST http://localhost:3500/v1.0-alpha1/state/statestore/query \
  -H "Content-Type: application/json" \
  -d '{"filter": {"EQ": {"active": true}}, "page": {"limit": 20}}'

# Subsequent pages using the token from previous response
curl -X POST http://localhost:3500/v1.0-alpha1/state/statestore/query \
  -H "Content-Type: application/json" \
  -d '{"filter": {"EQ": {"active": true}}, "page": {"limit": 20, "token": "eyJsYXN0S2V5IjoiIn0="}}'
```

## Verifying Index Health

```bash
kubectl exec -it redis-stack-0 -- redis-cli FT.INFO usersByCity
```

## Summary

Dapr's State Query API requires a compatible backing store (Redis Stack) and explicit index configuration in the component YAML. Define field types (TEXT, NUMERIC, TAG) in `queryIndexes`, save state with JSON content type, and use the POST query endpoint for filtered, sorted, and paginated retrieval. Monitor index health with RediSearch commands for production reliability.
