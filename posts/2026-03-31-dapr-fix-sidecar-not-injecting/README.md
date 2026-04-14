# How to Fix Dapr Sidecar Not Injecting on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Troubleshooting, Kubernetes, Sidecar, Injection

Description: Learn how to diagnose and fix issues where Dapr fails to inject the sidecar container into Kubernetes pods.

---

## Overview

Dapr sidecar injection uses a Kubernetes MutatingWebhookConfiguration to intercept pod creation and inject the sidecar container. When injection fails silently or the webhook is misconfigured, pods start without the Dapr sidecar and your application loses all Dapr capabilities.

## Step 1: Verify Dapr Injection Annotation

The most common cause is a missing or incorrect annotation:

```yaml
# Correct - always quote annotation values
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "myservice"

# Not recommended - unquoted boolean may cause issues with Helm or other YAML processors
annotations:
  dapr.io/enabled: true   # kubectl coerces this to "true", but some tools may not
```

Check your running pod:

```bash
kubectl get pod <pod-name> -o jsonpath='{.metadata.annotations}' | python3 -m json.tool | grep dapr
```

## Step 2: Check the Dapr Webhook

Verify the MutatingWebhookConfiguration exists:

```bash
kubectl get mutatingwebhookconfiguration | grep dapr
# Expected: dapr-sidecar-injector
```

Describe it to verify it's targeting the correct namespace:

```bash
kubectl describe mutatingwebhookconfiguration dapr-sidecar-injector | grep -A5 "Namespace Selector"
```

## Step 3: Verify Namespace Label

Ensure your namespace has the correct label if namespace selectors are configured:

```bash
kubectl get namespace default --show-labels
# Should include: kubernetes.io/metadata.name=default
```

If namespace-based injection is required, add the label:

```bash
kubectl label namespace myapp dapr.io/enabled=true
```

## Step 4: Check the Sidecar Injector Logs

Look for errors in the Dapr injector:

```bash
kubectl logs -n dapr-system -l app=dapr-sidecar-injector --tail=50
```

Common error messages:
- `"failed to get service account"` - RBAC issue
- `"certificate validation failed"` - Webhook TLS certificate expired
- `"quota exceeded"` - Resource quota preventing injection

## Step 5: Check for Resource Quotas

Resource quotas can prevent pod creation if the sidecar pushes resource requests over the quota:

```bash
kubectl describe resourcequota -n myapp
# Check if CPU/memory requests are near the limit
```

If quota is the issue, increase it:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: myapp-quota
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    pods: "100"
```

## Step 6: Verify Webhook TLS Certificate

The webhook uses a TLS certificate. Check if it's expired:

```bash
kubectl get secret dapr-sidecar-injector-cert -n dapr-system \
  -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | \
  openssl x509 -noout -dates
```

If expired, restart the injector to trigger certificate renewal:

```bash
kubectl rollout restart deployment dapr-sidecar-injector -n dapr-system
```

## Step 7: Test Injection Manually

Create a test pod and verify injection occurs:

```bash
kubectl run test-injection \
  --image=nginx \
  --annotations="dapr.io/enabled=true,dapr.io/app-id=test,dapr.io/app-port=80" \
  --restart=Never

kubectl get pod test-injection -o jsonpath='{.spec.containers[*].name}'
# Should show: nginx daprd
```

## Summary

Dapr sidecar injection failures are most commonly caused by incorrect annotation types (boolean vs. string), missing namespace labels, expired webhook TLS certificates, or resource quotas blocking pod creation. Systematically check annotations, the webhook configuration, injector logs, and resource quotas to identify the root cause and apply the appropriate fix.
