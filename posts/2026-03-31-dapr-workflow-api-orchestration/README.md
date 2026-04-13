# How to Use Dapr Workflow for Multi-Step API Orchestration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, API Orchestration, Microservice, Integration, HTTP

Description: Learn how to orchestrate multi-step API calls across microservices using Dapr Workflow, handling retries, parallelism, and error compensation automatically.

---

## Why Orchestrate APIs with Dapr Workflow?

Calling multiple APIs in sequence - or in parallel - is common in microservices architectures. Without a workflow engine, this logic lives in ad-hoc service code with manual error handling and no visibility. Dapr Workflow provides durable orchestration: steps are retried automatically, state is persisted, and you get full observability via the workflow status API.

## Example: Product Enrichment Pipeline

When a product is created, you need to:
1. Validate the product data
2. Fetch pricing from an external pricing API
3. Fetch inventory levels from a warehouse API
4. Generate an SEO description using an AI API
5. Save the enriched product to the catalog

## Workflow Definition in Go

```go
package main

import (
    "github.com/dapr/go-sdk/workflow"
)

func ProductEnrichmentWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var product map[string]any
    if err := ctx.GetInput(&product); err != nil {
        return nil, err
    }

    // Step 1 - validate
    var valid bool
    if err := ctx.CallActivity(ValidateProduct, workflow.ActivityInput(product)).Await(&valid); err != nil {
        return nil, err
    }
    if !valid {
        return map[string]any{"status": "invalid"}, nil
    }

    // Steps 2 and 3 in parallel
    pricingTask := ctx.CallActivity(FetchPricing, workflow.ActivityInput(product["id"]))
    inventoryTask := ctx.CallActivity(FetchInventory, workflow.ActivityInput(product["id"]))

    var pricing map[string]any
    var inventory map[string]any
    if err := pricingTask.Await(&pricing); err != nil {
        return nil, err
    }
    if err := inventoryTask.Await(&inventory); err != nil {
        return nil, err
    }

    // Step 4 - AI description
    enriched := mergeProduct(product, pricing, inventory)
    var description string
    if err := ctx.CallActivity(GenerateDescription, workflow.ActivityInput(enriched)).Await(&description); err != nil {
        return nil, err
    }
    enriched["description"] = description

    // Step 5 - save
    if err := ctx.CallActivity(SaveProduct, workflow.ActivityInput(enriched)).Await(nil); err != nil {
        return nil, err
    }

    return map[string]any{"status": "enriched", "id": product["id"]}, nil
}
```

## Activity Using Dapr Service Invocation

```go
func FetchPricing(ctx workflow.ActivityContext) (any, error) {
    var productID string
    if err := ctx.GetInput(&productID); err != nil {
        return nil, err
    }

    client, _ := dapr.NewClient()
    resp, err := client.InvokeMethod(context.Background(), "pricing-service", "price/"+productID, "GET")
    if err != nil {
        return nil, err
    }

    var result map[string]any
    json.Unmarshal(resp, &result)
    return result, nil
}
```

## Retry Configuration for Unreliable APIs

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: api-retry-policy
spec:
  policies:
    retries:
      externalApiRetry:
        policy: exponential
        maxRetries: 5
        maxInterval: 30s
  targets:
    apps:
      pricing-service:
        retry: externalApiRetry
      ai-service:
        retry: externalApiRetry
```

## Starting the Orchestration

```bash
curl -X POST http://localhost:3500/v1.0/workflows/dapr/ProductEnrichmentWorkflow/start \
  -H "Content-Type: application/json" \
  -d '{"id": "PROD-789", "name": "Wireless Headphones", "category": "electronics"}'
```

## Monitoring API Orchestration Progress

```bash
curl http://localhost:3500/v1.0/workflows/dapr/{instance_id}
```

The `serializedCustomStatus` field shows which API call is currently in progress when you set custom status messages in your workflow.

## Handling Partial Failures

If the AI description service is down, you can skip it rather than fail the whole workflow:

```go
var description string
err := ctx.CallActivity(GenerateDescription, ...).Await(&description)
if err != nil {
    description = product["name"].(string) // fallback
}
```

## Summary

Dapr Workflow turns complex multi-step API orchestration into readable, maintainable code. Built-in retry policies, parallel execution, and durable state persistence mean your API pipelines recover from transient failures automatically, and you get full visibility into each step's progress via the status API.
