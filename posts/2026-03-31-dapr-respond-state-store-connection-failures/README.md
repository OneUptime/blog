# How to Respond to Dapr State Store Connection Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Troubleshooting, Redis, Incident Response

Description: Diagnose and resolve Dapr state store connection failures by verifying component configuration, backend availability, and network connectivity within Kubernetes.

---

## Identifying State Store Connection Failures

State store connection failures manifest as HTTP 500 errors when your application calls the Dapr state API, or as component initialization errors in sidecar logs:

```bash
kubectl logs my-pod -c daprd | grep -i "state\|error\|connect"
# ERR_STATE_STORE_NOT_CONFIGURED: state store statestore is not configured
# failed to initialize component statestore: dial tcp 10.0.0.5:6379: connect: connection refused
```

## Step 1 - Verify the State Store Backend is Running

Check that the underlying backend (Redis, Cosmos DB, etc.) is accessible:

```bash
# For Redis deployed in the same cluster
kubectl get pods -l app=redis -n my-namespace
kubectl logs redis-0 -n my-namespace | tail -20
```

Test connectivity from a pod in the same namespace:

```bash
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  sh -c "nc -zv redis-master 6379"
```

## Step 2 - Inspect the Component Configuration

A typo in the host, port, or credential values causes connection failures:

```bash
kubectl describe component statestore -n my-namespace
```

Verify the component spec:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: my-namespace
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-master.my-namespace.svc.cluster.local:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-auth
      key: password
```

Check that the referenced secret exists and has the correct key:

```bash
kubectl get secret redis-auth -n my-namespace -o jsonpath='{.data.password}' | base64 -d
```

## Step 3 - Check Network Policies

A NetworkPolicy blocking sidecar-to-backend traffic silently drops connections:

```bash
kubectl get networkpolicy -n my-namespace
```

Ensure the policy allows egress from pods with the Dapr sidecar label to the Redis port:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dapr-to-redis
  namespace: my-namespace
spec:
  podSelector:
    matchLabels:
      app: orders-api
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
```

## Step 4 - Implement Resiliency Policies

Configure Dapr to retry state store operations automatically:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: statestore-resiliency
spec:
  policies:
    retries:
      stateRetry:
        policy: exponential
        maxInterval: 10s
        maxRetries: 5
    circuitBreakers:
      stateCircuitBreaker:
        maxRequests: 1
        interval: 30s
        timeout: 60s
        trip: consecutiveFailures >= 5
  targets:
    components:
      statestore:
        outbound:
          retry: stateRetry
          circuitBreaker: stateCircuitBreaker
```

## Step 5 - Reload the Component After Fixing

If you updated the component YAML, the operator reloads it automatically. You can confirm with:

```bash
kubectl rollout restart deployment/orders-api -n my-namespace
kubectl logs orders-api-<pod> -c daprd | grep "component loaded"
```

## Summary

Dapr state store connection failures are most often caused by backend unavailability, misconfigured component specs, incorrect secrets, or network policies blocking traffic. Diagnose by checking backend pod health, component configuration, and network reachability. Apply Dapr resiliency policies to handle transient failures gracefully without application code changes.
