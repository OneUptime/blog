# How to Use the dapr invoke Command for Service Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CLI, Service Invocation, Testing, Development

Description: Learn how to use the dapr invoke command to call methods on running Dapr applications directly from the CLI for rapid service testing.

---

## Overview

The `dapr invoke` command lets you call any HTTP endpoint on a running Dapr application from the command line. It routes the call through the Dapr sidecar, so you can test your services using the same service discovery and mTLS that your apps use in production.

## Basic GET Request

The default HTTP method is POST. To make a GET request, use the `--verb` flag:

```bash
dapr invoke --app-id order-service --method orders --verb GET
```

## POST with a JSON Body

Send JSON data to a service endpoint:

```bash
dapr invoke --app-id order-service \
            --method orders \
            --verb POST \
            --data '{"productId": "prod-123", "quantity": 2}'
```

## Sending Data from a File

For larger payloads, read data from a file:

```bash
dapr invoke --app-id order-service \
            --method orders \
            --verb POST \
            --data-file ./order-payload.json
```

Where `order-payload.json` contains:

```json
{
  "customerId": "cust-456",
  "items": [
    { "sku": "ITEM-001", "qty": 3 },
    { "sku": "ITEM-002", "qty": 1 }
  ]
}
```

## Content Type

The `dapr invoke` command automatically sets the `Content-Type` header to `application/json` for all requests. There is no flag to override this. If you need a different content type, use `curl` to call the Dapr HTTP API directly.

## Platform Support

The `dapr invoke` command is supported on self-hosted environments only. It is not available for Kubernetes deployments. To invoke services running in Kubernetes, use `kubectl port-forward` to access the Dapr sidecar, then call the Dapr HTTP API directly with `curl`.

## Testing Multiple Methods in a Script

Automate endpoint testing with a shell script:

```bash
#!/bin/bash
APP_ID="inventory-service"

echo "Testing GET /items..."
dapr invoke --app-id $APP_ID --method items --verb GET

echo "Testing POST /items..."
dapr invoke --app-id $APP_ID \
  --method items \
  --verb POST \
  --data '{"sku":"SKU-001","quantity":100}'

echo "Testing DELETE /items/SKU-001..."
dapr invoke --app-id $APP_ID --method "items/SKU-001" --verb DELETE
```

## Combining with jq for Response Parsing

```bash
dapr invoke --app-id product-service \
            --method "products/prod-001" \
            --verb GET | jq '.price'
```

## Summary

`dapr invoke` is a powerful CLI tool for testing Dapr services without needing a separate HTTP client like curl or Postman. It routes calls through the Dapr sidecar, respecting service discovery and security policies, making it ideal for integration testing and debugging during development.
