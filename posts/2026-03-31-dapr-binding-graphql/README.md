# How to Use Dapr GraphQL Output Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, GraphQL, Output, Integration

Description: Learn how to configure the Dapr GraphQL output binding to execute queries and mutations against a GraphQL API from any microservice.

---

## Overview of the Dapr GraphQL Binding

The Dapr GraphQL output binding allows microservices to execute GraphQL operations against any GraphQL endpoint without managing HTTP clients or authentication headers. This is useful for integrating with headless CMS platforms, third-party APIs, or internal services that expose a GraphQL interface.

## Configure the GraphQL Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: graphql-api
spec:
  type: bindings.graphql
  version: v1
  metadata:
  - name: endpoint
    value: https://api.example.com/graphql
  - name: header:Authorization
    secretKeyRef:
      name: graphql-secret
      key: authToken
  - name: header:Content-Type
    value: application/json
```

## Create the Secret

```bash
kubectl create secret generic graphql-secret \
  --from-literal=authToken="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Execute a GraphQL Query

```bash
curl -X POST http://localhost:3500/v1.0/bindings/graphql-api \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "query",
    "metadata": {
      "query": "query GetUser($id: ID!) { user(id: $id) { id name email } }",
      "variable:id": "user-123"
    }
  }'
```

## Execute a GraphQL Mutation

```bash
curl -X POST http://localhost:3500/v1.0/bindings/graphql-api \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "mutation",
    "metadata": {
      "query": "mutation CreateOrder($input: OrderInput!) { createOrder(input: $input) { id status } }",
      "variable:input": "{\"productId\": \"prod-456\", \"quantity\": 2, \"customerId\": \"cust-789\"}"
    }
  }'
```

## Using the Binding in Application Code

```typescript
interface GraphQLRequest {
  query: string;
  variables?: Record<string, string>;
}

interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

async function executeGraphQL<T>(request: GraphQLRequest): Promise<T> {
  const metadata: Record<string, string> = {
    query: request.query,
  };

  if (request.variables) {
    for (const [key, value] of Object.entries(request.variables)) {
      metadata[`variable:${key}`] = value;
    }
  }

  const response = await fetch(
    "http://localhost:3500/v1.0/bindings/graphql-api",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operation: "query",
        metadata,
      }),
    }
  );

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors?.length) {
    throw new Error(`GraphQL error: ${result.errors[0].message}`);
  }

  return result.data;
}

// Usage
const user = await executeGraphQL<{ user: { id: string; name: string } }>({
  query: "query GetUser($id: ID!) { user(id: $id) { id name } }",
  variables: { id: "user-123" },
});
```

## Connecting to a Local GraphQL Service

For internal services, use the Dapr DNS name or local address:

```yaml
metadata:
- name: endpoint
  value: http://content-service:4000/graphql
```

No authentication header needed if the service trusts internal traffic.

## Error Handling

GraphQL returns HTTP 200 even for operation errors. Check the `errors` field:

```python
import requests

def query_graphql(query: str, variables: dict = None):
    metadata = {"query": query}
    if variables:
        for key, value in variables.items():
            metadata[f"variable:{key}"] = str(value)

    response = requests.post(
        "http://localhost:3500/v1.0/bindings/graphql-api",
        json={"operation": "query", "metadata": metadata},
    )
    result = response.json()
    if "errors" in result:
        raise ValueError(f"GraphQL error: {result['errors']}")
    return result.get("data")
```

## Summary

The Dapr GraphQL output binding provides a clean API for executing queries and mutations against any GraphQL endpoint. Configure the endpoint URL and authentication headers in the component YAML, then invoke it with the operation type and pass the query and variables in the `metadata` field from any service in your platform.
