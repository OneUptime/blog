# How to Fix Dapr Connection Timeout Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Networking, Timeout, Troubleshooting, Service Invocation

Description: Diagnose and fix Dapr connection timeout errors in service invocation, state stores, and pub/sub components across local and Kubernetes environments.

---

Connection timeout errors in Dapr can surface in multiple places: service-to-service calls, component initialization, and API requests. Systematically identifying which layer is timing out is the first step to resolving them.

## Identifying Timeout Errors

Timeout errors in Dapr usually look like:

```text
context deadline exceeded
rpc error: code = DeadlineExceeded
connection refused: dial tcp 127.0.0.1:6379: connect: connection refused
```

Check the Dapr sidecar logs first:

```bash
kubectl logs <pod-name> -c daprd | grep -i "timeout\|deadline\|refused"
```

## Service Invocation Timeouts

When calling another service via Dapr, the default timeout is configurable. Increase it using a Resiliency policy:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: myresiliency
spec:
  policies:
    timeouts:
      DefaultResponseTimeout: 45s
  targets:
    apps:
      target-service:
        timeout: DefaultResponseTimeout
```

Apply the policy:

```bash
kubectl apply -f resiliency.yaml -n <namespace>
```

## Component Connection Timeouts

If a state store or pub/sub component cannot connect to its backend, Dapr retries during initialization. For Redis, ensure the host and port are correct:

```yaml
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis-master:6379
  - name: dialTimeout
    value: "10s"
  - name: readTimeout
    value: "5s"
  - name: writeTimeout
    value: "5s"
```

## gRPC and HTTP Timeout Tuning

For Dapr's internal gRPC and HTTP communication between sidecars, timeouts are controlled through Resiliency policies as shown in the previous section. There is no separate timeout field in the Dapr Configuration spec.

When calling Dapr via HTTP from your app, set client-side timeouts:

```python
import requests
response = requests.post(
    "http://localhost:3500/v1.0/invoke/target-service/method/getData",
    timeout=30
)
```

## Network Policy Issues on Kubernetes

Network policies may silently drop packets, causing timeouts rather than immediate connection refusals. Check if policies allow traffic on Dapr ports:

```bash
kubectl get networkpolicy -n <namespace>
```

Dapr uses ports 3500 (HTTP), 50001 (gRPC), and 50002 (internal gRPC). Ensure these are allowed between namespaces.

## Diagnosing with Dapr Dashboard

The Dapr dashboard shows component status and recent errors:

```bash
dapr dashboard -k
```

Open the browser at `http://localhost:8080` to inspect component health and configuration.

## Summary

Dapr connection timeouts stem from three common sources: slow downstream services, unreachable component backends, or network policies blocking traffic. Use Resiliency policies to increase timeouts for slow services, verify component metadata for correct endpoints, and audit Kubernetes network policies to ensure Dapr ports are accessible.
