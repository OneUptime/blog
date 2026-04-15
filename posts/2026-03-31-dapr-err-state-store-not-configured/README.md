# How to Fix ERR_STATE_STORE_NOT_CONFIGURED in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Troubleshooting, Component, Configuration

Description: Diagnose and fix the ERR_STATE_STORE_NOT_CONFIGURED error in Dapr by correctly defining and loading state store components.

---

The `ERR_STATE_STORE_NOT_CONFIGURED` error occurs when your application tries to use the Dapr state management API but Dapr cannot find a configured state store component. This is one of the most common errors when getting started with Dapr state management.

## Understanding the Error

When you call the Dapr state API and receive this error, it means Dapr's sidecar started successfully but no state store component was loaded. The full error typically looks like:

```text
error saving state: rpc error: code = FailedPrecondition
desc = state store statestore is not configured
```

## Root Causes

1. Missing component YAML file
2. Component file placed in the wrong directory
3. Incorrect component namespace or name
4. Component failed to initialize (wrong credentials, unreachable host)

## Creating a State Store Component

For local development with Redis (the default), create a components directory and define the component:

```bash
mkdir -p ~/.dapr/components
```

```yaml
# ~/.dapr/components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    value: ""
```

## Loading Components at Runtime

When running with `dapr run`, specify the resources path:

```bash
dapr run \
  --app-id myapp \
  --resources-path ./components \
  -- python app.py
```

## Kubernetes Deployment

On Kubernetes, components must be applied to the correct namespace. If your app runs in the `production` namespace, scope the component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis-master.production.svc.cluster.local:6379
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
```

Apply it:

```bash
kubectl apply -f statestore.yaml -n production
```

## Verifying Component Loading

Check if the component loaded in the Dapr sidecar logs:

```bash
kubectl logs <pod-name> -c daprd | grep -i "state"
```

For local runs, you will see a log line confirming the component initialized:

```text
INFO  Starting Dapr Runtime -- version 1.13 ...
INFO  component loaded. name: statestore, type: state.redis/v1
```

## Common Name Mismatch

If your code references `"statestore"` but your component is named `"mystore"`, you will get this error. Ensure the names match exactly when calling the API:

```bash
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key":"mykey","value":"myvalue"}]'
```

## Summary

`ERR_STATE_STORE_NOT_CONFIGURED` means no state store component was found or loaded by the Dapr sidecar. Fix it by creating a properly formatted component YAML, placing it in the correct directory, and ensuring the component name matches what your application uses. Check sidecar logs to confirm successful component initialization.
