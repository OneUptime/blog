# How to Use Dapr Logs for Troubleshooting Component Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Logging, Troubleshooting, Component, Debug

Description: Diagnose Dapr component initialization failures, connection errors, and runtime issues using sidecar logs for state stores, pub/sub, and bindings.

---

Dapr components - state stores, pub/sub brokers, bindings, and secret stores - are the backbone of Dapr-based architectures. When they fail, the sidecar logs provide detailed error messages that identify the root cause. This guide covers how to read those logs effectively.

## Component Failure Categories

Dapr component failures fall into three categories:

1. **Initialization failure** - component cannot connect at startup
2. **Runtime error** - component connected but fails during operation
3. **Configuration error** - invalid component YAML or missing secrets

## Checking Component Initialization

When a pod starts, Dapr logs each component it loads. Look for these messages:

```bash
# Successful component loading
kubectl logs deploy/order-service -c daprd | grep "loaded component"
# level=info msg="loaded component statestore (state.redis/v1)"

# Failed component loading
kubectl logs deploy/order-service -c daprd | grep -i "failed\|error\|init"
# level=error msg="error initializing component" component=statestore error="..."
```

## Redis State Store Connection Failure

```bash
kubectl logs deploy/order-service -c daprd | grep "redis\|state"
```

Common error:
```text
level=error msg="error initializing component" component=statestore
  error="failed to create Redis client: dial tcp 10.0.0.5:6379: connection refused"
```

Diagnosis steps:

```bash
# Check Redis pod status
kubectl get pods -l app=redis

# Test Redis connectivity from within the cluster
kubectl run redis-test --rm -it --image=redis:7 -- redis-cli -h redis -p 6379 ping

# Check the component YAML for correct host/port
kubectl get component statestore -o yaml
```

## Kafka Pub/Sub Connection Failure

```bash
kubectl logs deploy/consumer-service -c daprd | grep "kafka\|pubsub"
```

Error pattern:
```text
level=error msg="error initializing component" component=pubsub
  error="kafka: client has run out of available brokers to talk to"
```

Diagnosis:

```bash
# Check if Kafka brokers are reachable
kubectl run kafka-test --rm -it --image=confluentinc/cp-kafka:7.4.0 -- \
  kafka-broker-api-versions --bootstrap-server kafka:9092

# Verify the component config
kubectl get component pubsub -o yaml | grep -A5 "metadata"
```

## Secret Reference Errors

If a component uses secret references for credentials:

```bash
kubectl logs deploy/order-service -c daprd | grep -i "secret\|credential"
```

Error:
```text
level=error msg="error getting secret" storeName=kubernetes secretName=redis-auth
  error="secret 'redis-auth' not found"
```

Fix:

```bash
# Create the missing secret
kubectl create secret generic redis-auth \
  --from-literal=password=mypassword

# Verify the component references the correct secret name
kubectl get component statestore -o yaml
```

## Runtime Component Errors

For errors that occur after successful initialization:

```bash
# Watch for component errors during operation (requires JSON logging)
# Enable JSON logs with the annotation: dapr.io/log-as-json: "true"
kubectl logs -f deploy/order-service -c daprd | \
  jq -c 'select(.level == "error") | {time, msg, component, error}'
```

Common runtime errors include:
- Timeout exceeded on state operations
- Authentication failures after token expiry
- Network interruption to backing service

## Component Health Check

Use the Dapr HTTP API to check component health:

```bash
# Check if the sidecar considers itself healthy
kubectl exec deploy/order-service -c order-service -- \
  curl -s http://localhost:3500/v1.0/healthz

# Get component metadata
kubectl exec deploy/order-service -c order-service -- \
  curl -s http://localhost:3500/v1.0/metadata | jq .components
```

## Summary

Dapr component failure logs provide specific error messages for connection failures, missing secrets, and configuration errors. Check initialization logs first to confirm all components loaded, then watch runtime logs for intermittent failures. Use the metadata API to verify component status at runtime and the cluster's DNS/network tools to verify connectivity to backing services like Redis or Kafka.
