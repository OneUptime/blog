# How to Monitor Dapr Sidecar Injection Success Rate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Sidecar, Injection, Monitoring, Kubernetes

Description: Monitor Dapr sidecar injection success rates to detect webhook failures, namespace configuration issues, and pod annotation problems affecting Dapr-enabled deployments.

---

## Why Monitor Sidecar Injection?

Dapr sidecar injection relies on a Kubernetes mutating admission webhook. If the webhook fails, pods start without the Dapr sidecar - losing observability, mTLS, and access to all Dapr APIs. Monitoring injection success rates catches configuration drift and webhook outages before they impact production deployments.

## How Sidecar Injection Works

When a pod with `dapr.io/enabled: "true"` is created, the Kubernetes API server calls the Dapr sidecar injector webhook. The webhook mutates the pod spec to add the `daprd` container and necessary volumes. Failures result in pods starting without Dapr.

## Checking Injection Status for Running Pods

```bash
# Check if sidecar is present in all Dapr-enabled pods
kubectl get pods -n production -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for pod in data['items']:
    annotations = pod['metadata'].get('annotations', {})
    if annotations.get('dapr.io/enabled') == 'true':
        containers = [c['name'] for c in pod['spec']['containers']]
        has_daprd = 'daprd' in containers
        print(f\"{pod['metadata']['name']}: {'INJECTED' if has_daprd else 'MISSING SIDECAR'}\")
"
```

## Checking the Sidecar Injector Webhook

```bash
# Verify the webhook configuration
kubectl get mutatingwebhookconfiguration dapr-sidecar-injector -o yaml | \
  grep -A 5 "failurePolicy\|namespaceSelector\|objectSelector"
```

The default failure policy is `Ignore` - meaning if the webhook fails, pods start without the sidecar. Check webhook logs:

```bash
kubectl logs -n dapr-system -l app=dapr-sidecar-injector --tail=100 | \
  grep -iE "inject|error|fail|deny"
```

## Prometheus Metrics for Injection

The sidecar injector exposes metrics for tracking injection operations:

```bash
# Total injection requests
dapr_injector_sidecar_injection_requests_total

# Failed injections
dapr_injector_sidecar_injection_failed_total

# Successful injections
dapr_injector_sidecar_injection_succeeded_total
```

Calculate injection success rate:

```bash
# Success rate over 5 minutes
rate(dapr_injector_sidecar_injection_succeeded_total[5m])
/
rate(dapr_injector_sidecar_injection_requests_total[5m])
```

## Alerting on Injection Failures

```yaml
groups:
  - name: sidecar-injection
    rules:
      - alert: DaprSidecarInjectionHighFailureRate
        expr: >
          rate(dapr_injector_sidecar_injection_failed_total[5m]) > 0
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Dapr sidecar injection failures detected"

      - alert: DaprSidecarInjectorDown
        expr: up{job="dapr-sidecar-injector"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Dapr sidecar injector is down - new pods will not get sidecars"
```

## Detecting Pods Missing Sidecars

Run a periodic audit to catch pods that started without the sidecar:

```bash
#!/bin/bash
# audit-sidecar-injection.sh
for ns in production staging; do
  kubectl get pods -n $ns -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
missing = []
for pod in data['items']:
    ann = pod['metadata'].get('annotations', {})
    if ann.get('dapr.io/enabled') == 'true':
        containers = [c['name'] for c in pod['spec']['containers']]
        if 'daprd' not in containers:
            missing.append(pod['metadata']['name'])
if missing:
    print('MISSING SIDECAR:', missing)
else:
    print('All pods have sidecars')
"
done
```

## Summary

Monitor Dapr sidecar injection by checking webhook logs for errors, tracking Prometheus injection success/failure metrics, and running periodic audits to detect pods missing the sidecar container. Alert immediately on injection failures since pods without Dapr sidecars lose mTLS, observability, and access to all Dapr building blocks. Ensure the sidecar injector runs with 3 replicas in production for high availability.
