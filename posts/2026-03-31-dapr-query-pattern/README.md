# How to Implement Query Pattern with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Query Pattern, CQRS, State Management, Microservice

Description: Learn how to implement the Query side of CQRS with Dapr using state store queries and service invocation to provide efficient read models for microservices.

---

## CQRS Query Side with Dapr

In CQRS (Command Query Responsibility Segregation), queries are read-only operations that return data without modifying state. Dapr supports the query side through its state store query API (available for supported stores like MongoDB and Cosmos DB) and through service invocation for inter-service queries.

## Dapr State Store Query API

Dapr's state store query API lets you query state by filter, sort, and pagination without writing custom query logic. First, ensure your state store supports querying:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: querystore
spec:
  type: state.mongodb
  version: v1
  metadata:
  - name: host
    value: mongodb://localhost:27017
  - name: databaseName
    value: orders
  - name: collectionName
    value: orderstate
```

Query state entries by filter:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/state/querystore/query \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {
      "EQ": {"status": "pending"}
    },
    "sort": [
      {"key": "createdAt", "order": "DESC"}
    ],
    "page": {
      "limit": 20
    }
  }'
```

## Building a Query Service

Create a dedicated query service that exposes read endpoints and delegates to the state store:

```python
from fastapi import FastAPI, Query as QueryParam
import httpx

app = FastAPI()
DAPR_HTTP_PORT = 3500

@app.get("/orders")
async def list_orders(
    status: str = None,
    customer_id: str = None,
    limit: int = 20,
    token: str = None
):
    query_filter = {}
    if status and customer_id:
        query_filter = {
            "AND": [
                {"EQ": {"status": status}},
                {"EQ": {"customerId": customer_id}}
            ]
        }
    elif status:
        query_filter = {"EQ": {"status": status}}
    elif customer_id:
        query_filter = {"EQ": {"customerId": customer_id}}

    page = {"limit": limit}
    if token:
        page["token"] = token

    query_body = {
        "filter": query_filter,
        "sort": [{"key": "createdAt", "order": "DESC"}],
        "page": page
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0-alpha1/state/querystore/query",
            json=query_body
        )
        result = resp.json()

    return {
        "orders": [item["data"] for item in result.get("results", [])],
        "nextToken": result.get("token")
    }
```

## Query Routing with Dapr Service Invocation

For cross-service queries, invoke the query service through Dapr:

```python
@app.get("/customers/{customer_id}/dashboard")
async def customer_dashboard(customer_id: str):
    async with httpx.AsyncClient() as client:
        orders_resp = await client.get(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/invoke/order-query-service/method/orders",
            params={"customer_id": customer_id, "limit": 5}
        )
        profile_resp = await client.get(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/invoke/user-service/method/users/{customer_id}"
        )

    return {
        "profile": profile_resp.json(),
        "recentOrders": orders_resp.json()["orders"]
    }
```

## Caching Query Results

Expensive queries can be cached using Dapr state management. Add a caching layer to the query service:

```python
import hashlib, json

async def cached_query(query_body: dict, ttl_seconds: int = 30) -> dict:
    cache_key = "query:" + hashlib.md5(json.dumps(query_body, sort_keys=True).encode()).hexdigest()

    async with httpx.AsyncClient() as client:
        cached = await client.get(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/state/statestore/{cache_key}"
        )
        if cached.status_code == 200 and cached.text:
            return cached.json()

        result = await client.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0-alpha1/state/querystore/query",
            json=query_body
        )
        data = result.json()

        await client.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0/state/statestore",
            json=[{"key": cache_key, "value": data, "metadata": {"ttlInSeconds": str(ttl_seconds)}}]
        )

    return data
```

## Summary

The Query pattern in Dapr leverages the state store query API for filtering and pagination without writing database-specific query code. Dedicated query services expose clean read endpoints and use Dapr service invocation to aggregate data across service boundaries. Adding Dapr state management as a query cache layer reduces repeated expensive reads with minimal additional code.
