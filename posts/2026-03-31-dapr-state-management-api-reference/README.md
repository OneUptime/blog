# How to Use the Dapr State Management API Reference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, API, REST, Key-Value

Description: A practical reference for the Dapr State Management API covering save, get, delete, bulk operations, transactions, and query endpoints.

---

## Overview

The Dapr State Management API provides a uniform interface for storing and retrieving key-value data across any compatible state store backend. Applications interact with the API through the Dapr sidecar's HTTP or gRPC interface, and the sidecar handles the backend-specific communication.

## Base URL

All state management API calls go through the Dapr sidecar:

```yaml
http://localhost:{daprPort}/v1.0/state/{storeName}
```

## Saving State

**POST** `/v1.0/state/{storeName}`

```bash
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[
    {
      "key": "user-profile-123",
      "value": {"name": "Alice", "email": "alice@example.com"},
      "options": {
        "consistency": "strong",
        "concurrency": "first-write"
      }
    }
  ]'
```

## Getting State

**GET** `/v1.0/state/{storeName}/{key}`

```bash
curl http://localhost:3500/v1.0/state/statestore/user-profile-123
```

Response:

```json
{"name": "Alice", "email": "alice@example.com"}
```

With ETag for optimistic concurrency:

```bash
curl -v http://localhost:3500/v1.0/state/statestore/user-profile-123
# Returns ETag in response header: ETag: "v1"
```

## Deleting State

**DELETE** `/v1.0/state/{storeName}/{key}`

```bash
curl -X DELETE http://localhost:3500/v1.0/state/statestore/user-profile-123
```

## Bulk Get

**POST** `/v1.0/state/{storeName}/bulk`

```bash
curl -X POST http://localhost:3500/v1.0/state/statestore/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "keys": ["user-profile-123", "user-profile-456", "user-profile-789"],
    "parallelism": 3
  }'
```

## Transactions

**POST** `/v1.0/state/{storeName}/transaction`

```bash
curl -X POST http://localhost:3500/v1.0/state/statestore/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [
      {
        "operation": "upsert",
        "request": {
          "key": "cart-user-123",
          "value": {"items": ["item-1", "item-2"]}
        }
      },
      {
        "operation": "delete",
        "request": {"key": "cart-session-old"}
      }
    ]
  }'
```

## State Query API

**POST** `/v1.0-alpha1/state/{storeName}/query`

```bash
curl -X POST \
  "http://localhost:3500/v1.0-alpha1/state/statestore/query" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {
      "EQ": {"status": "active"}
    },
    "sort": [{"key": "createdAt", "order": "DESC"}],
    "page": {"limit": 10}
  }'
```

## Concurrency Options

| Option | Description |
|---|---|
| `first-write` | First writer wins, reject concurrent writes via ETag |
| `last-write` | Last writer wins (default) |

## Consistency Options

| Option | Description |
|---|---|
| `eventual` | Eventual consistency (default) |
| `strong` | Strong consistency (supported stores only) |

## Summary

The Dapr State Management API abstracts key-value operations across backends like Redis, Cosmos DB, DynamoDB, and PostgreSQL. Bulk operations reduce latency for multi-key reads, transactions enable atomic multi-key writes, and the optional query API provides filtering and sorting for stores that support it.
