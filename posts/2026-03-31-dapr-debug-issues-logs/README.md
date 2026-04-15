# How to Debug Dapr Issues Using Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Debug, Logging, Troubleshooting, Kubernetes

Description: Use Dapr sidecar logs to diagnose common issues including component failures, service invocation errors, and pub/sub problems.

---

When a Dapr-enabled service misbehaves, the sidecar logs are the first place to look. They contain detailed information about component initialization, API call results, and error conditions. This guide covers the most common issues and how to diagnose them from logs.

## Accessing Sidecar Logs

```bash
# Follow sidecar logs for a deployment
kubectl logs -f deploy/order-service -c daprd

# Get last 200 lines
kubectl logs deploy/order-service -c daprd --tail=200

# Get logs from a specific time period
kubectl logs deploy/order-service -c daprd --since=30m

# Search for errors
kubectl logs deploy/order-service -c daprd | grep -i "error\|fail\|warn"
```

## Issue 1 - Component Fails to Initialize

Symptom: Service starts but Dapr returns errors on state/pubsub calls.

```bash
kubectl logs deploy/order-service -c daprd | grep -i "component\|init"
```

Look for:
```text
level=error msg="error initializing component" component=statestore error="dial tcp redis:6379: connection refused"
```

Fix: Check the component backing service is running:

```bash
kubectl get pods -n default | grep redis
kubectl logs deploy/redis --tail=20
```

## Issue 2 - Service Invocation Fails with 404

Symptom: Service invocation returns 404, target service cannot be found.

```bash
kubectl logs deploy/order-service -c daprd | grep "invoke\|404\|service"
```

Common causes:

```bash
# Check if the target app is registered with Dapr
kubectl get pods -o custom-columns='NAME:.metadata.name,DAPR-APP-ID:.metadata.annotations.dapr\.io/app-id' | grep inventory-service

# Check the app ID annotation
kubectl get pod inventory-service-xxx -o jsonpath='{.metadata.annotations}'
```

## Issue 3 - Pub/Sub Subscription Not Working

Symptom: Messages are published but subscribers never receive them.

```bash
# Check subscriptions are registered
kubectl logs deploy/consumer-service -c daprd | grep -i "subscri"

# Look for subscription registration errors
kubectl logs deploy/consumer-service -c daprd | grep -i "topic\|sub"
```

Expected successful subscription log:
```text
level=info msg="app is subscribed to the following topics: [orders] through pubsub=pubsub"
```

## Issue 4 - mTLS Certificate Errors

Symptom: Service invocation fails with TLS errors.

```bash
kubectl logs deploy/order-service -c daprd | grep -i "mtls\|cert\|tls"

# Also check sentry logs
kubectl logs -n dapr-system deploy/dapr-sentry | tail -50
```

If certificates are expired:

```bash
# Check certificate expiry
kubectl get secret dapr-trust-bundle -n dapr-system -o jsonpath='{.data.issuer\.crt}' | \
  base64 -d | openssl x509 -noout -dates
```

## Issue 5 - Sidecar Injection Not Happening

Symptom: Pod starts without the daprd container.

```bash
# Check injection annotation
kubectl get pod order-service-xxx -o jsonpath='{.metadata.annotations.dapr\.io/enabled}'

# Check sidecar injector logs
kubectl logs -n dapr-system deploy/dapr-sidecar-injector | tail -50 | grep -i "inject\|error"
```

## Enabling Debug Logging Temporarily

For unresolved issues, enable debug logging:

```bash
# Patch the annotation to enable debug logging
kubectl patch deployment order-service -p \
  '{"spec":{"template":{"metadata":{"annotations":{"dapr.io/log-level":"debug","dapr.io/enable-api-logging":"true"}}}}}'

# Follow debug logs
kubectl logs -f deploy/order-service -c daprd | jq -c 'select(.level == "debug")'

# Restore normal logging after debugging
kubectl patch deployment order-service -p \
  '{"spec":{"template":{"metadata":{"annotations":{"dapr.io/log-level":"info","dapr.io/enable-api-logging":"false"}}}}}'
```

## Summary

Dapr sidecar logs are the primary diagnostic tool for most issues. Component initialization failures show as connection errors in the logs, subscription problems show as missing subscription registration messages, and mTLS errors surface as certificate-related log entries. Enable API logging and debug level temporarily when normal logs do not provide enough context, and always check both the sidecar logs and the relevant control plane component logs (operator, sentry) for a complete picture.
