# How to Troubleshoot Rancher Webhook Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Troubleshooting, Webhook

Description: Diagnose and fix Rancher webhook failures that block resource creation, updates, and deletions in Rancher-managed Kubernetes clusters.

## Introduction

Rancher deploys admission webhooks to enforce policies and manage cluster resources. When these webhooks fail - due to pod crashes, TLS errors, or timeout issues - affected Kubernetes API calls may be rejected, preventing users from creating or modifying resources. This guide explains how to identify and resolve webhook failures quickly.

## Understanding Rancher Webhooks

Rancher installs the `rancher-webhook` deployment and service, which manages two admission webhook configurations:

1. **ValidatingWebhookConfiguration `rancher.cattle.io`** - Validates Rancher-managed resources.
2. **MutatingWebhookConfiguration `rancher.cattle.io`** - Applies Rancher webhook mutations where required.

```bash
# List all webhooks in the cluster

kubectl get validatingwebhookconfiguration
kubectl get mutatingwebhookconfiguration
```

## Step 1: Identify Webhook Failure Messages

When a webhook fails, Kubernetes returns an error like:

```text
Error from server (InternalError): error when creating "manifest.yaml":
Internal error occurred: failed calling webhook
"rancher.cattle.io": Post "https://rancher-webhook.cattle-system.svc:443/v1/webhook/validation/...":
dial tcp: connect: connection refused
```

```bash
# Check the webhook deployment status
kubectl get pods -n cattle-system -l app=rancher-webhook

# If pods are not Running, get details
kubectl describe pod -n cattle-system -l app=rancher-webhook
kubectl logs -n cattle-system -l app=rancher-webhook --tail=100
```

## Step 2: Check Webhook Service Endpoints

```bash
# Verify the webhook service exists and has endpoints
kubectl get service -n cattle-system rancher-webhook
kubectl get endpoints -n cattle-system rancher-webhook

# If endpoints are empty, the webhook pod may be missing, not Ready,
# or not matching the service selector
kubectl describe service -n cattle-system rancher-webhook | grep Selector
kubectl get pods -n cattle-system --show-labels | grep rancher-webhook
```

## Step 3: Test Webhook TLS Connectivity

```bash
# Get the webhook's CA bundle
kubectl get validatingwebhookconfiguration rancher.cattle.io \
  -o jsonpath='{.webhooks[0].clientConfig.caBundle}' | base64 -d \
  | openssl x509 -noout -dates

# Test connectivity to the webhook service
kubectl run webhook-test --rm -it \
  --image=nicolaka/netshoot \
  --restart=Never \
  --command -- curl -vk https://rancher-webhook.cattle-system.svc:443/healthz
```

## Step 4: Check Webhook Timeout Configuration

```bash
# View the timeoutSeconds setting on webhooks
kubectl get validatingwebhookconfiguration rancher.cattle.io -o json \
  | jq '.webhooks[] | {name: .name, timeoutSeconds: .timeoutSeconds, failurePolicy: .failurePolicy}'

# Admission webhooks default to 10 seconds. Rancher manages these objects and
# overrides manual edits, so investigate pod health and API server connectivity first.
```

## Step 5: Temporarily Bypass Webhooks (Emergency Only)

**Warning**: Only do this in an emergency. This bypass disables all Rancher webhook validations and mutations for the impersonated request.

```bash
# Rancher's supported bypass impersonates both the sudo service account
# and the system:masters group for the specific command you need to run
kubectl apply -f manifest.yaml \
  --as=system:serviceaccount:cattle-system:rancher-webhook-sudo \
  --as-group=system:masters
```

## Step 6: Restart and Redeploy the Webhook

```bash
# Restart the webhook deployment
kubectl rollout restart deployment/rancher-webhook -n cattle-system

# Watch rollout status
kubectl rollout status deployment/rancher-webhook -n cattle-system
```

## Step 7: Check for Resource Exhaustion

```bash
# If Metrics Server is installed, check current CPU/memory usage
kubectl top pod -n cattle-system -l app=rancher-webhook

# Inspect restart reasons and last container state for OOMKilled events
kubectl describe pod -n cattle-system -l app=rancher-webhook
```

## Step 8: Verify After Fix

```bash
# Test that webhook is now accepting requests
kubectl create namespace test-webhook-ns
kubectl delete namespace test-webhook-ns

# Check webhook logs for remaining errors
kubectl logs -n cattle-system -l app=rancher-webhook --tail=50
```

## Conclusion

Rancher webhook failures can block Kubernetes API operations and halt your DevOps workflows. The most common causes are crashed webhook pods, TLS certificate mismatches, and timeout issues. By combining pod status checks, service endpoint verification, and connectivity troubleshooting, you can quickly restore webhook functionality. Always monitor webhook pod health as part of your cluster observability strategy.
