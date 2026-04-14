# How to Apply Resiliency Policies to Bindings in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Binding, Retry, Fault Tolerance

Description: Learn how to apply Dapr resiliency policies to input and output bindings to handle transient failures when reading from or writing to external systems.

---

## Overview

Dapr bindings connect your services to external systems like cron schedulers, message queues, file systems, and cloud services. Like state stores and pub/sub, binding operations can experience transient failures. Resiliency policies applied to bindings protect both outbound calls (output bindings) and inbound deliveries (input bindings) automatically.

## Binding Resiliency Configuration

Configure outbound and inbound resiliency for each binding component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: binding-resiliency
  namespace: default
spec:
  policies:
    timeouts:
      bindingTimeout: 10s
      cronTimeout: 60s
    retries:
      outputRetry:
        policy: exponential
        duration: 500ms
        maxInterval: 30s
        maxRetries: 5
      inputRetry:
        policy: constant
        duration: 2s
        maxRetries: 3
    circuitBreakers:
      externalSystemCB:
        maxRequests: 1
        interval: 10s
        timeout: 30s
        trip: consecutiveFailures >= 5
  targets:
    components:
      aws-s3-binding:
        outbound:
          timeout: bindingTimeout
          retry: outputRetry
          circuitBreaker: externalSystemCB
      cron-binding:
        inbound:
          timeout: cronTimeout
          retry: inputRetry
      kafka-output-binding:
        outbound:
          timeout: bindingTimeout
          retry: outputRetry
```

## Output Binding with Resiliency

When your app invokes an output binding (e.g., writing a file to S3), the resiliency policy automatically retries on failure:

```python
from dapr.clients import DaprClient
import json

with DaprClient() as d:
    # If S3 returns 503, this will retry per the outputRetry policy
    d.invoke_binding(
        binding_name='aws-s3-binding',
        operation='create',
        data=json.dumps({"key": "report-2026.csv", "content": csv_data}),
        binding_metadata={"bucket": "my-bucket"}
    )
```

## Input Binding with Resiliency

For input bindings (e.g., a cron trigger), the inbound resiliency policy determines what happens when your handler fails:

```javascript
const express = require('express');
const app = express();

app.post('/cron-job', async (req, res) => {
  try {
    await runDailyReport();
    res.status(200).send('SUCCESS');
  } catch (err) {
    // Return non-200 to trigger retry per inputRetry policy
    console.error('Report generation failed:', err.message);
    res.status(500).send('RETRY');
  }
});

app.listen(3000);
```

## Applying Policies to Multiple Bindings

Apply the same policy to each binding component by referencing the same named policies:

```yaml
targets:
  components:
    aws-s3-binding:
      outbound:
        timeout: bindingTimeout
        retry: outputRetry
    kafka-output-binding:
      outbound:
        timeout: bindingTimeout
        retry: outputRetry
```

## Circuit Breaker for External Systems

When an external system (like an S3-compatible store) is down, a circuit breaker prevents hammering it with retries:

```yaml
circuitBreakers:
  s3CB:
    maxRequests: 1
    interval: 30s
    timeout: 120s
    trip: consecutiveFailures >= 3

targets:
  components:
    aws-s3-binding:
      outbound:
        circuitBreaker: s3CB
        retry: outputRetry
```

After 3 consecutive failures, the circuit opens for 2 minutes before probing again.

## Monitoring Binding Resiliency

```bash
kubectl logs deployment/my-service -c daprd \
  | grep -E "binding|retry|circuit" | tail -30

curl http://localhost:9090/metrics \
  | grep "dapr_component.*binding"
```

## Summary

Dapr resiliency policies for bindings work identically to those for state and pub/sub. Defining outbound policies for output bindings and inbound policies for input bindings provides automatic fault tolerance when connecting to external systems, without changing any binding invocation code in your application.
