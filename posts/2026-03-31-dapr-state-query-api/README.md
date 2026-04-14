# How to Query State Using the Dapr Query API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Query, Filter, Search

Description: Learn how to query Dapr state store using the alpha Query API with filtering, sorting, and pagination to find state records matching specific criteria.

---

## What Is the Dapr Query State API?

The Dapr Query State API (alpha) lets you filter, sort, and paginate state records without knowing specific keys. It is useful when you store structured objects and need to find records matching field conditions.

Not all state stores support the query API. Support depends on the component implementation, so check the state-store documentation for your backend before relying on query support.

## Basic Query

Filter orders by status:

```bash
curl -X POST \
  "http://localhost:3500/v1.0-alpha1/state/statestore/query" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {
      "EQ": {"status": "pending"}
    }
  }'
```

## Using Comparison Operators

```bash
curl -X POST \
  "http://localhost:3500/v1.0-alpha1/state/statestore/query" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {
      "AND": [
        {"EQ": {"status": "pending"}},
        {"GT": {"amount": 100}}
      ]
    }
  }'
```

Supported operators: `EQ`, `NEQ`, `GT`, `GTE`, `LT`, `LTE`, `IN`, `AND`, `OR`

## Sorting Results

```bash
curl -X POST \
  "http://localhost:3500/v1.0-alpha1/state/statestore/query" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {
      "EQ": {"status": "pending"}
    },
    "sort": [
      {"key": "createdAt", "order": "DESC"}
    ]
  }'
```

## Paginating Results

```bash
curl -X POST \
  "http://localhost:3500/v1.0-alpha1/state/statestore/query" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {"EQ": {"status": "pending"}},
    "page": {
      "limit": 10,
      "token": ""
    }
  }'
```

The response includes a `token` for fetching the next page:

```json
{
  "results": [...],
  "token": "eyJwYWdlIjogMn0="
}
```

Pass the token to get the next page:

```bash
-d '{"filter": {...}, "page": {"limit": 10, "token": "eyJwYWdlIjogMn0="}}'
```

## Using the Go SDK

```go
query := `{
  "filter": {"EQ": {"org": "Engineering"}},
  "sort": [{"key": "person.id", "order": "ASC"}],
  "page": {"limit": 5}
}`

result, err := client.QueryStateAlpha1(ctx, "statestore", query, nil)
for _, item := range result.Results {
    fmt.Printf("Key: %s, Data: %s\n", item.Key, item.Value)
}
```

## Summary

The Dapr Query State API (alpha) enables filtering, sorting, and paginating state records using a JSON query language. Send requests to `/v1.0-alpha1/state/{store}/query`, use document field names such as `status`, `amount`, `org`, and `person.id`, and consume the returned pagination token for multi-page results. Because support varies by state-store component, verify query support in the backend-specific component documentation before using it in production.
