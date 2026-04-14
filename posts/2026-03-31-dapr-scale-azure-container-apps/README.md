# How to Scale Dapr Applications on Azure Container Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure Container Apps, Scaling, KEDA, Auto-Scaling

Description: Configure auto-scaling for Dapr applications on Azure Container Apps using KEDA-based rules, HTTP triggers, and Azure Service Bus queue depth scaling.

---

## Overview

Azure Container Apps uses KEDA for event-driven auto-scaling. Dapr applications can scale based on HTTP traffic, queue depth, CPU/memory, or custom metrics. This guide covers practical scaling configurations for Dapr microservices.

## Step 1: HTTP-Based Scaling

Scale based on concurrent HTTP requests:

```bash
az containerapp update \
  --name orders-service \
  --resource-group rg-dapr \
  --min-replicas 1 \
  --max-replicas 20 \
  --scale-rule-name http-scaling \
  --scale-rule-type http \
  --scale-rule-http-concurrency 30
```

## Step 2: Azure Service Bus Queue Scaling

Scale consumers based on Service Bus message count:

```bash
az containerapp update \
  --name order-processor \
  --resource-group rg-dapr \
  --min-replicas 0 \
  --max-replicas 15 \
  --scale-rule-name sb-scaling \
  --scale-rule-type azure-servicebus \
  --scale-rule-metadata queueName=orders messageCount=5 \
  --scale-rule-auth connection=sb-connection
```

## Step 3: Define Scaling in Bicep

```bicep
// containerapp-scale.bicep
scale: {
  minReplicas: 1
  maxReplicas: 20
  rules: [
    {
      name: 'http-rule'
      http: {
        metadata: {
          concurrentRequests: '30'
        }
      }
    }
    {
      name: 'queue-rule'
      custom: {
        type: 'azure-servicebus'
        metadata: {
          queueName: 'orders'
          messageCount: '5'
        }
        auth: [
          {
            secretRef: 'sb-connection'
            triggerParameter: 'connection'
          }
        ]
      }
    }
  ]
}
```

## Step 4: Scale to Zero

For background processors, allow scaling to zero replicas:

```bash
az containerapp update \
  --name batch-processor \
  --resource-group rg-dapr \
  --min-replicas 0 \
  --max-replicas 10
```

Note: When scaling to zero, the first message wakes the app. Dapr pub/sub handles this seamlessly since messages are queued in the broker.

## Step 5: Dapr Actor Scaling Considerations

Dapr actors are stateful - when scaling horizontally, actors are redistributed:

```bash
# Check actor count distribution across replicas
az containerapp logs show \
  --name actor-service \
  --resource-group rg-dapr \
  --tail 50 \
  --follow | grep "actor activated"
```

## Step 6: Monitor Scaling Events

```bash
az monitor metrics list \
  --resource /subscriptions/<sub>/resourceGroups/rg-dapr/providers/Microsoft.App/containerApps/orders-service \
  --metric Replicas \
  --interval PT1M \
  --output table
```

## Summary

Azure Container Apps scales Dapr applications automatically using KEDA-based rules. HTTP concurrency rules work well for synchronous services, while Service Bus message count rules drive scaling for Dapr pub/sub consumers. Scaling to zero reduces costs for batch workloads, and Dapr's stateless service invocation model makes horizontal scaling straightforward for most building blocks.
