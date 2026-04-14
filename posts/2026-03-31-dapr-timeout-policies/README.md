# How to Set Up Timeout Policies in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Timeout, Policy, Microservice

Description: Learn how to configure Dapr timeout policies in Resiliency resources to prevent slow dependencies from blocking your services and consuming thread pools.

---

## Overview

Timeouts are the first line of defense against slow dependencies. Without timeouts, a hung downstream service can exhaust connection pools and cause cascading failures. Dapr Resiliency resources let you define named timeout policies and apply them to service invocations, component operations, and actors declaratively.

## Defining Timeout Policies

Timeouts are defined in the `policies.timeouts` section of a `Resiliency` resource. Each entry is a named duration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: service-resiliency
  namespace: default
spec:
  policies:
    timeouts:
      quickTimeout: 1s
      standardTimeout: 5s
      longRunningTimeout: 30s
```

Timeout values use Go duration syntax: `1s`, `500ms`, `2m`, etc.

## Applying Timeouts to Service Invocation

Target a timeout at a specific downstream service:

```yaml
targets:
  apps:
    payment-service:
      timeout: quickTimeout
    report-service:
      timeout: longRunningTimeout
```

Now any call from your application to `payment-service` via Dapr service invocation will time out after 1 second. Calls to `report-service` (which generates reports) get 30 seconds.

## Applying Timeouts to Component Operations

Target timeouts at Dapr components (state stores, bindings, pub/sub):

```yaml
targets:
  components:
    redis-state-store:
      outbound:
        timeout: standardTimeout
    kafka-pubsub:
      outbound:
        timeout: standardTimeout
      inbound:
        timeout: quickTimeout
```

`outbound` applies when your app calls the component. `inbound` applies when the component delivers messages to your app (e.g., pub/sub subscriptions).

## Timeout Behavior

When a timeout fires, Dapr cancels the request and returns an error to the caller. If a retry policy is also configured, Dapr attempts the next retry after the specified backoff duration (up to `maxRetries`):

```yaml
policies:
  timeouts:
    shortOp: 2s
  retries:
    withTimeout:
      policy: constant
      duration: 500ms
      maxRetries: 3
targets:
  apps:
    slow-service:
      timeout: shortOp
      retry: withTimeout
```

With this configuration, Dapr tries the call, waits up to 2 seconds, and if it times out, waits 500ms then tries again up to 3 more times.

## Testing Timeout Behavior

Simulate a slow response with a delay endpoint and observe the timeout:

```bash
# Start a slow mock service
python3 -c "
import time, http.server
class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        time.sleep(10)
        self.send_response(200)
        self.end_headers()
http.server.HTTPServer(('', 8080), Handler).serve_forever()
" &

# Call it via Dapr - should timeout after the configured duration
curl http://localhost:3500/v1.0/invoke/slow-service/method/data
```

Check sidecar logs for the timeout event:

```bash
kubectl logs deployment/my-app -c daprd | grep "timeout"
```

## Summary

Dapr timeout policies are named duration values defined in a `Resiliency` resource and targeted at specific services or components. Assigning short timeouts to latency-sensitive paths and longer timeouts to batch operations gives you fine-grained control over how long your application waits before treating a call as failed.
