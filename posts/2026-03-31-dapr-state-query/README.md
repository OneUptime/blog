# How to Query Dapr State Store with Filtering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Query, Filtering, Search

Description: Learn how to use the Dapr state query API to filter, sort, and paginate state items using JSON query syntax across supported state store backends.

---

## What Is the Dapr State Query API?

The Dapr state query API (alpha feature) lets you search state stores using filter expressions, sorting, and pagination without needing direct database access. This is useful for listing and filtering items stored by your application, such as orders by status or users by region.

Currently supported state stores: MongoDB, Azure Cosmos DB, PostgreSQL, CockroachDB.

## Query API Endpoint

```text
POST http://localhost:3500/v1.0-alpha1/state/{storeName}/query
```

## Query Request Structure

A query request supports three optional fields:

```json
{
  "filter": {},
  "sort": [],
  "page": {}
}
```

## Prerequisites

- Dapr initialized with a query-capable state store (MongoDB, Cosmos DB, PostgreSQL, or CockroachDB)
- State items saved with JSON values

## Saving Queryable State

First, save some state items with structured JSON values:

```bash
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[
    {"key": "order:1", "value": {"orderId": "1", "status": "pending", "region": "us-east", "amount": 99.99}},
    {"key": "order:2", "value": {"orderId": "2", "status": "shipped", "region": "us-west", "amount": 149.99}},
    {"key": "order:3", "value": {"orderId": "3", "status": "pending", "region": "eu-central", "amount": 74.99}},
    {"key": "order:4", "value": {"orderId": "4", "status": "delivered", "region": "us-east", "amount": 249.99}},
    {"key": "order:5", "value": {"orderId": "5", "status": "pending", "region": "us-east", "amount": 199.99}}
  ]'
```

## Basic Filter Query

Find all pending orders:

```bash
curl -X POST "http://localhost:3500/v1.0-alpha1/state/statestore/query" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {
      "EQ": { "status": "pending" }
    }
  }'
```

Response:

```json
{
  "results": [
    {"key": "order:1", "data": {"orderId": "1", "status": "pending", "region": "us-east", "amount": 99.99}},
    {"key": "order:3", "data": {"orderId": "3", "status": "pending", "region": "eu-central", "amount": 74.99}},
    {"key": "order:5", "data": {"orderId": "5", "status": "pending", "region": "us-east", "amount": 199.99}}
  ],
  "token": ""
}
```

## Filter Operators

### Equality

```json
{"EQ": {"status": "pending"}}
```

### Not Equal

```json
{"NEQ": {"status": "cancelled"}}
```

### Comparison

```json
{"GT": {"amount": 100}}
{"LT": {"amount": 200}}
{"GTE": {"amount": 100}}
{"LTE": {"amount": 200}}
```

### Membership

```json
{"IN": {"status": ["pending", "shipped"]}}
```

### Logical AND

```json
{
  "AND": [
    {"EQ": {"status": "pending"}},
    {"EQ": {"region": "us-east"}}
  ]
}
```

### Logical OR

```json
{
  "OR": [
    {"EQ": {"status": "pending"}},
    {"EQ": {"status": "processing"}}
  ]
}
```

## Sorting Results

```bash
curl -X POST "http://localhost:3500/v1.0-alpha1/state/statestore/query" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {
      "EQ": {"region": "us-east"}
    },
    "sort": [
      {"key": "amount", "order": "DESC"}
    ]
  }'
```

## Pagination

Use `page.limit` and `page.token` for cursor-based pagination:

```bash
# First page
curl -X POST "http://localhost:3500/v1.0-alpha1/state/statestore/query" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {"EQ": {"status": "pending"}},
    "page": {"limit": 2}
  }'
```

Response includes a `token` for the next page:

```json
{
  "results": [...],
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Fetch the next page:

```bash
curl -X POST "http://localhost:3500/v1.0-alpha1/state/statestore/query" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {"EQ": {"status": "pending"}},
    "page": {"limit": 2, "token": "eyJhbGci..."}
  }'
```

## Python Example

```python
import requests
import os

DAPR_HTTP_PORT = os.environ.get("DAPR_HTTP_PORT", "3500")

def query_orders(status=None, region=None, min_amount=None, limit=10):
    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0-alpha1/state/statestore/query"

    filters = []
    if status:
        filters.append({"EQ": {"status": status}})
    if region:
        filters.append({"EQ": {"region": region}})
    if min_amount:
        filters.append({"GT": {"amount": min_amount}})

    query_body = {"page": {"limit": limit}}
    if len(filters) == 1:
        query_body["filter"] = filters[0]
    elif len(filters) > 1:
        query_body["filter"] = {"AND": filters}

    response = requests.post(url, json=query_body)
    response.raise_for_status()
    result = response.json()

    return result.get("results", []), result.get("token", "")

results, token = query_orders(status="pending", region="us-east")
for r in results:
    print(f"Order {r['key']}: ${r['data']['amount']}")
```

## Go Example

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "log"
)

type QueryRequest struct {
    Filter map[string]interface{} `json:"filter,omitempty"`
    Sort   []SortItem             `json:"sort,omitempty"`
    Page   *PageRequest           `json:"page,omitempty"`
}

type SortItem struct {
    Key   string `json:"key"`
    Order string `json:"order"`
}

type PageRequest struct {
    Limit int    `json:"limit"`
    Token string `json:"token,omitempty"`
}

func main() {
    query := QueryRequest{
        Filter: map[string]interface{}{
            "AND": []map[string]interface{}{
                {"EQ": map[string]interface{}{"status": "pending"}},
                {"GT": map[string]interface{}{"amount": 100}},
            },
        },
        Sort: []SortItem{{Key: "amount", Order: "ASC"}},
        Page: &PageRequest{Limit: 5},
    }

    body, _ := json.Marshal(query)
    resp, err := http.Post(
        "http://localhost:3500/v1.0-alpha1/state/statestore/query",
        "application/json",
        bytes.NewBuffer(body),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer resp.Body.Close()

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    fmt.Printf("Results: %v\n", result)
}
```

## Summary

The Dapr state query API provides a portable, backend-agnostic way to filter, sort, and paginate over state items using a JSON query language. It supports equality, comparison, and logical operators. Supported backends include MongoDB, PostgreSQL, CosmosDB, and CockroachDB.
