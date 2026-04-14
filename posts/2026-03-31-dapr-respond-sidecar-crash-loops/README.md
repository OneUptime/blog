# How to Respond to Dapr Sidecar Crash Loops

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Troubleshooting, CrashLoopBackOff, Kubernetes, Incident Response

Description: Diagnose and fix Dapr sidecar CrashLoopBackOff issues by identifying root causes such as misconfigured components, certificate failures, and resource exhaustion.

---

## Recognizing a Sidecar Crash Loop

A Dapr sidecar crash loop appears as a `CrashLoopBackOff` on the `daprd` container in your pod:

```bash
kubectl get pods -n my-namespace
# NAME                          READY   STATUS             RESTARTS   AGE
# orders-api-7d8b9c6f4-xkp2m   1/2     CrashLoopBackOff   5          8m
```

The `1/2` ready count indicates the app container is running but the Dapr sidecar is not.

## Step 1 - Check Sidecar Logs

Retrieve the last logs from the crashing sidecar:

```bash
kubectl logs orders-api-7d8b9c6f4-xkp2m -c daprd --previous
```

Common messages to look for:
- `failed to load component` - component misconfiguration
- `error authenticating with Dapr` - certificate or mTLS issue
- `failed to connect to placement service` - actor placement host unreachable

Also check for OOMKill termination (visible via `kubectl describe pod`, not in logs):

```bash
kubectl describe pod orders-api-7d8b9c6f4-xkp2m -n my-namespace | grep -A 3 "Last State"
# Look for Reason: OOMKilled, Exit Code: 137
```

## Step 2 - Inspect Component Configuration

A bad component spec causes the sidecar to exit immediately:

```bash
kubectl describe component statestore -n my-namespace
```

Verify the secret references and metadata values are correct:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis-master:6379
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
```

Ensure the secret exists:

```bash
kubectl get secret redis-secret -n my-namespace
```

## Step 3 - Check Certificate Status

Dapr uses mTLS certificates issued by the control plane. Expired certificates cause sidecar crashes:

```bash
dapr mtls expiry
```

Renew the trust bundle if needed:

```bash
dapr mtls renew-certificate -k --valid-until 365
```

## Step 4 - Check Resource Limits

If the sidecar is OOMKilled, increase the memory limit:

```yaml
annotations:
  dapr.io/sidecar-memory-limit: "256Mi"
  dapr.io/sidecar-memory-request: "64Mi"
```

Then rolling restart the deployment:

```bash
kubectl rollout restart deployment/orders-api -n my-namespace
```

## Step 5 - Verify Control Plane Connectivity

The sidecar must reach the Dapr control plane (operator, sentry, placement):

```bash
kubectl get pods -n dapr-system
# All pods should show Running and 1/1 READY
```

If the sentry pod is down, sidecars cannot obtain certificates and will crash.

## Summary

Dapr sidecar crash loops are typically caused by component misconfiguration, expired mTLS certificates, resource exhaustion, or control plane unavailability. Use sidecar logs, component descriptions, and control plane pod status to isolate the root cause, then apply targeted fixes such as correcting component specs, renewing certificates, or increasing memory limits.
