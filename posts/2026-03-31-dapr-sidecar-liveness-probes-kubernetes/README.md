# How to Configure Dapr Sidecar Liveness Probes on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Liveness Probe, Sidecar, Health Check

Description: Configure custom liveness probe settings for the Dapr sidecar container using pod annotations to control health check timing and failure thresholds.

---

## Default Liveness Probe Behavior

By default, Dapr injects a liveness probe that calls the sidecar's `/v1.0/healthz` endpoint. The defaults work for most cases, but you may need to tune them in slow-starting environments or for pods with strict restart policies.

## Viewing the Default Probe

```bash
# Inspect the injected sidecar container spec
kubectl get pod myapp-xxxxxxxxx -o jsonpath='{.spec.containers[?(@.name=="daprd")].livenessProbe}'
```

Default values:
- `initialDelaySeconds`: 3
- `periodSeconds`: 6
- `failureThreshold`: 3
- `timeoutSeconds`: 3

## Customizing Liveness Probe via Annotations

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "myapp"
        dapr.io/app-port: "8080"
        # Increase initial delay for slow-starting apps
        dapr.io/sidecar-liveness-probe-delay-seconds: "15"
        # Check every 10 seconds
        dapr.io/sidecar-liveness-probe-period-seconds: "10"
        # Allow 5 failures before restarting
        dapr.io/sidecar-liveness-probe-threshold: "5"
        # Timeout per probe request
        dapr.io/sidecar-liveness-probe-timeout-seconds: "5"
    spec:
      containers:
      - name: myapp
        image: myregistry/myapp:latest
```

## Adding an App-Level Liveness Probe

Your application container also needs a liveness probe. Dapr does not configure this for you:

```yaml
containers:
- name: myapp
  image: myregistry/myapp:latest
  livenessProbe:
    httpGet:
      path: /healthz
      port: 8080
    initialDelaySeconds: 10
    periodSeconds: 15
    failureThreshold: 3
    timeoutSeconds: 5
```

## Checking Liveness Probe Health

```bash
# Port-forward to access the Dapr health endpoint directly
kubectl port-forward pod/myapp-xxxxxxxxx 3500:3500

# Check sidecar health
curl http://localhost:3500/v1.0/healthz
# Returns HTTP 204 when healthy

# Check outbound health (component connectivity)
curl http://localhost:3500/v1.0/healthz/outbound
```

## Diagnosing Liveness Probe Failures

```bash
# View events for restart reasons
kubectl describe pod myapp-xxxxxxxxx | grep -A10 "Events:"

# Check kubelet liveness probe outcomes
kubectl get events --field-selector reason=Unhealthy -n default

# View sidecar logs around restart time
kubectl logs myapp-xxxxxxxxx -c daprd --previous --tail=50
```

## Summary

Dapr sidecar liveness probe timing is configured via pod annotations. Increasing `sidecar-liveness-probe-delay-seconds` prevents premature restarts when the daprd sidecar takes time to initialize component connections. Always pair sidecar liveness probes with application-level probes to ensure Kubernetes restarts pods when either layer is unhealthy.
