# How to Configure Dapr Network Timeouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Network, Timeout, Resiliency, Configuration

Description: Learn how to configure network-level timeouts in Dapr for service invocation, pub/sub delivery, and binding operations to prevent resource exhaustion.

---

## Network Timeouts in Dapr

Network timeouts prevent slow downstream services or unresponsive brokers from consuming connection pools and goroutines indefinitely. Dapr exposes timeout configuration at multiple levels: per-target resiliency policies, global sidecar settings, and per-request override headers. Understanding which timeout applies where prevents subtle bugs in production.

## Resiliency-Based Timeouts (Per Target)

The most common approach is setting timeouts in a Resiliency policy:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: app-resiliency
  namespace: production
spec:
  policies:
    timeouts:
      fast: 2s
      standard: 10s
      slow: 60s

  targets:
    apps:
      payment-service:
        timeout: fast
      report-generator:
        timeout: slow
      inventory-service:
        timeout: standard
    components:
      orders-pubsub:
        outbound:
          timeout: standard
      file-storage:
        outbound:
          timeout: slow
```

## Sidecar-Level Configuration

Configure sidecar-level network settings via Kubernetes pod annotations:

```yaml
annotations:
  dapr.io/config: "app-config"
  dapr.io/graceful-shutdown-seconds: "30"
  dapr.io/max-body-size: "16Mi"
  dapr.io/read-buffer-size: "16Ki"
```

The `graceful-shutdown-seconds` annotation controls how long the sidecar waits during shutdown for in-flight requests to complete (default is 5 seconds). The `max-body-size` and `read-buffer-size` annotations control request body and header buffer limits respectively. For actual request-level timeout control, use Resiliency policies or per-request SDK timeouts as described in the other sections.

## Per-Request Timeout Override

Pass a timeout for individual calls using the SDK `timeout` parameter:

```python
from dapr.clients import DaprClient
import json

def call_with_custom_timeout(app_id: str, method: str, data: dict, timeout_seconds: int):
    with DaprClient() as client:
        response = client.invoke_method(
            app_id=app_id,
            method_name=method,
            data=json.dumps(data),
            content_type="application/json",
            timeout=timeout_seconds,
        )
        return json.loads(response.data)

# Use a 3-second timeout for this specific call
result = call_with_custom_timeout("slow-service", "process", payload, 3)
```

## Timeout Hierarchy

Dapr applies timeouts at two different points in the call chain:

1. **SDK `timeout` parameter**: Sets a client-side gRPC deadline covering the entire round trip from the application to the local Dapr sidecar and back.
2. **Resiliency policy timeout**: Applies on the sidecar side when making the outbound call to the target service.

The effective timeout is whichever fires first. If the SDK timeout is shorter than the resiliency policy timeout, the client-side deadline cancels the call before the resiliency timeout triggers. If the resiliency policy timeout is shorter, the sidecar returns a timeout error to the application within the SDK deadline.

## Monitoring Timeout Errors

Use Dapr Prometheus metrics to track timeout rates:

```bash
# Count timeout responses (408, 504)
curl -s http://localhost:9090/api/v1/query \
  --data-urlencode 'query=sum(rate(dapr_http_client_completed_count{status=~"408|504"}[5m])) by (app_id)'
```

Alert when timeout rate spikes:

```yaml
groups:
- name: dapr-timeouts
  rules:
  - alert: HighTimeoutRate
    expr: rate(dapr_http_client_completed_count{status="408"}[5m]) > 0.1
    for: 3m
    labels:
      severity: warning
    annotations:
      summary: "High timeout rate on {{ $labels.app_id }}"
```

## Summary

Dapr network timeouts should be configured at the resiliency policy level for per-target control. Per-request SDK timeout overrides handle special cases like user-initiated long-running operations. Prometheus metrics on 408 and 504 status codes provide real-time visibility into timeout rates and trigger alerts before resource exhaustion occurs.
