# How to Use Dapr with Alibaba Cloud Log Storage (SLS)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Alibaba, Logging, SLS, Binding

Description: Configure Dapr's Alibaba Cloud Simple Log Service binding to stream structured logs and events from microservices to SLS for centralized log management.

---

## Overview

Alibaba Cloud Simple Log Service (SLS, also known as Log Service) is a fully managed log management platform. The Dapr SLS output binding lets microservices write structured log entries and audit events to SLS without embedding the SLS SDK.

## Prerequisites

- Alibaba Cloud account with Log Service enabled
- SLS project and logstore created
- RAM user with `AliyunLogWriteOnlyAccess` policy
- Dapr installed

## Setting Up SLS Resources

From the Alibaba Cloud Console:

```bash
# Using aliyun CLI
aliyun log CreateProject \
  --project_name=dapr-logs \
  --description="Dapr microservice logs"

aliyun log CreateLogStore \
  --project_name=dapr-logs \
  --logstore_name=app-events \
  --ttl=30 \
  --shard_count=2
```

## Configuring the Dapr Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: alibaba-sls
  namespace: default
spec:
  type: bindings.alicloud.sls
  version: v1
  metadata:
  - name: AccessKeyID
    secretKeyRef:
      name: alibaba-credentials
      key: accessKeyID
  - name: AccessKeySecret
    secretKeyRef:
      name: alibaba-credentials
      key: accessKey
  - name: Endpoint
    value: "cn-hangzhou.log.aliyuncs.com"
```

## Writing Log Entries

```bash
curl -X POST http://localhost:3500/v1.0/bindings/alibaba-sls \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "orderId": "1001",
      "userId": "user-42",
      "action": "order_created",
      "amount": 99.99
    },
    "metadata": {
      "project": "dapr-logs",
      "logstore": "app-events",
      "topic": "order-service",
      "source": "kubernetes"
    },
    "operation": "create"
  }'
```

From a Java microservice:

```java
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import java.util.Map;

public class OrderService {
    private DaprClient client = new DaprClientBuilder().build();

    public void logOrderEvent(String orderId, String action) {
        Map<String, Object> logData = Map.of(
            "orderId", orderId,
            "action", action,
            "timestamp", System.currentTimeMillis(),
            "service", "order-service"
        );

        Map<String, String> metadata = Map.of(
            "project", "dapr-logs",
            "logstore", "app-events",
            "topic", "order-service",
            "source", "kubernetes"
        );

        client.invokeBinding("alibaba-sls", "create", logData, metadata).block();
    }
}
```

## Audit Event Logging Pattern

Create an audit middleware that automatically logs all service invocations:

```javascript
const express = require("express");
const { DaprClient } = require("@dapr/dapr");

const app = express();
const daprClient = new DaprClient();

const slsMetadata = {
    project: "dapr-logs",
    logstore: "app-events",
    topic: "audit-service",
    source: "kubernetes"
};

app.use(async (req, res, next) => {
    const start = Date.now();
    res.on("finish", async () => {
        await daprClient.binding.send("alibaba-sls", "create", {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: Date.now() - start,
            appId: process.env.APP_ID
        }, slsMetadata);
    });
    next();
});
```

## Querying Logs in SLS

Use SLS query syntax to analyze Dapr service logs:

```sql
action: "order_created" |
SELECT COUNT(*) as order_count,
       AVG(amount) as avg_amount
GROUP BY date_trunc('hour', __time__)
```

## Summary

Dapr's Alibaba Cloud SLS binding provides a simple way to stream structured application events and audit logs to Simple Log Service. Centralizing log writes through a Dapr binding keeps services portable and allows log destinations to be changed by updating component configuration rather than application code.
