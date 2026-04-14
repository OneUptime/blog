# How to Respond to Dapr Control Plane Outages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Incident Response, Control Plane, Kubernetes, High Availability

Description: Respond to Dapr control plane outages by understanding impact scope, restoring affected components, and implementing high-availability configurations to prevent recurrence.

---

## Understanding the Dapr Control Plane

The Dapr control plane consists of these key components in the `dapr-system` namespace:
- `dapr-operator` - manages Component and Configuration CRDs
- `dapr-sidecar-injector` - injects the Dapr sidecar into annotated pods
- `dapr-sentry` - issues mTLS certificates to sidecars
- `dapr-placement` - manages actor placement tables
- `dapr-dashboard` - optional management UI (installed separately)

An outage of any of these affects running workloads differently. Existing sidecars with valid certificates continue running, but new pod startups fail.

## Step 1 - Assess the Scope

```bash
kubectl get pods -n dapr-system
```

Identify which components are down:

```bash
# Check recent events for failures
kubectl get events -n dapr-system --sort-by='.lastTimestamp' | tail -20
```

## Step 2 - Restart Failed Pods

For pods in `CrashLoopBackOff` or `Error` state, delete and let the deployment recreate them:

```bash
kubectl rollout restart deployment/dapr-operator -n dapr-system
kubectl rollout restart deployment/dapr-sentry -n dapr-system
kubectl rollout restart deployment/dapr-placement -n dapr-system
```

Monitor rollout status:

```bash
kubectl rollout status deployment/dapr-operator -n dapr-system
```

## Step 3 - Check for Resource Pressure

Control plane pods may be evicted due to node resource pressure:

```bash
kubectl describe node <node-name> | grep -A 10 "Conditions:"
kubectl top nodes
```

If the node is under memory pressure, consider moving control plane pods to a dedicated node using taints and tolerations.

## Step 4 - Verify Certificate Health

If the sentry service was down for an extended period, some sidecars may have expired certificates:

```bash
# Check sentry certificate validity
kubectl get secret dapr-trust-bundle -n dapr-system \
  -o jsonpath='{.data.issuer\.crt}' | base64 -d | openssl x509 -noout -dates
```

Renew if expiry is near:

```bash
dapr mtls renew-certificate -k --valid-until 365 --restart
```

## Step 5 - Configure High Availability

Prevent future outages by enabling HA mode during Dapr installation:

```bash
dapr init -k --enable-ha
```

Or with Helm:

```yaml
# values.yaml
global:
  ha:
    enabled: true
    replicaCount: 3
```

```bash
helm upgrade dapr dapr/dapr -n dapr-system -f values.yaml
```

## Step 6 - Set Up Alerts

Monitor control plane health proactively:

```bash
# Prometheus alert rule
- alert: DaprControlPlaneDown
  expr: up{job="dapr-system"} == 0
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Dapr control plane component is down"
```

## Summary

Dapr control plane outages primarily impact new sidecar startups and certificate renewals, while existing running sidecars continue with cached state. Respond by restarting failed deployments, verifying certificate health, and addressing underlying resource pressure. Configure HA mode to ensure at least three replicas of each control plane component for production workloads.
