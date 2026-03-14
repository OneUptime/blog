# How to Troubleshoot Notification Controller Pod Crashes in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Notification Controller, Pod Crashes, Alerts, Webhook

Description: Learn how to diagnose and fix Notification Controller pod crashes in Flux, including webhook endpoint failures, excessive event volumes, and configuration errors.

---

The Notification Controller handles event dispatching and webhook receiving in Flux. It sends alerts to external services like Slack, Microsoft Teams, Discord, and PagerDuty, and receives webhooks from source providers like GitHub and GitLab. When this controller crashes, you lose visibility into your GitOps pipeline status and cannot trigger reconciliations via webhooks. This guide covers diagnosing and fixing Notification Controller pod crashes.

## Prerequisites

Before you begin, ensure you have the following:

- A Kubernetes cluster with Flux installed
- kubectl configured to access your cluster
- Permissions to view pods, logs, and events in the flux-system namespace

## Step 1: Check Pod Status

Check the Notification Controller pod:

```bash
kubectl get pods -n flux-system -l app=notification-controller
```

Get detailed information:

```bash
kubectl describe pod -n flux-system -l app=notification-controller
```

## Step 2: Review Logs

Check logs from the previous crashed instance:

```bash
kubectl logs -n flux-system deploy/notification-controller --previous
```

Review current logs:

```bash
kubectl logs -n flux-system deploy/notification-controller --tail=200
```

## Step 3: Identify Common Crash Causes

### Event Flooding

When many Flux resources are reconciling simultaneously, the Notification Controller can be overwhelmed by the volume of events it needs to process and dispatch:

```bash
kubectl logs -n flux-system deploy/notification-controller | grep -c "Dispatching"
```

If the event volume is very high, consider reducing the number of Alert resources or making their event selectors more specific:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: critical-alerts
  namespace: flux-system
spec:
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: production-*
  providerRef:
    name: slack-provider
```

### Unreachable Webhook Endpoints

If the configured Provider endpoints are unreachable and the controller does not handle timeouts gracefully, it can crash or become unresponsive:

```bash
kubectl logs -n flux-system deploy/notification-controller | grep -i "timeout\|connection refused\|unreachable"
```

Verify your Provider configurations:

```bash
kubectl get providers -n flux-system
kubectl describe provider <provider-name> -n flux-system
```

Ensure the webhook URLs in your Provider secrets are correct and reachable from the cluster:

```bash
kubectl get secret <provider-secret> -n flux-system -o jsonpath='{.data.address}' | base64 -d
```

### OOMKilled from Large Event Payloads

If events contain large payloads such as full resource manifests, the controller may run out of memory:

```bash
kubectl get pod -n flux-system -l app=notification-controller -o jsonpath='{.items[0].status.containerStatuses[0].lastState.terminated.reason}'
```

Increase memory limits if needed:

```bash
kubectl patch deployment notification-controller -n flux-system --type='json' -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value": "512Mi"}]'
```

### Invalid Provider or Alert Configuration

Misconfigured Provider or Alert resources can cause the controller to panic during reconciliation:

```bash
kubectl logs -n flux-system deploy/notification-controller | grep -i "panic\|nil pointer\|invalid"
```

Validate all Alert and Provider resources:

```bash
flux get alerts --all-namespaces
flux get alert-providers --all-namespaces
```

### Webhook Receiver TLS Issues

If you are using the Notification Controller as a webhook receiver with TLS, certificate issues can cause crashes:

```bash
kubectl logs -n flux-system deploy/notification-controller | grep -i "tls\|certificate\|x509"
```

Verify the webhook receiver is properly configured:

```bash
kubectl get receiver -n flux-system
```

## Step 4: Check Service and Ingress Configuration

The Notification Controller exposes a webhook receiver endpoint. Verify the service is properly configured:

```bash
kubectl get svc -n flux-system notification-controller
kubectl get svc -n flux-system webhook-receiver
```

## Step 5: Restart and Verify

Restart the controller:

```bash
kubectl rollout restart deployment/notification-controller -n flux-system
kubectl rollout status deployment/notification-controller -n flux-system
```

Verify alerts and providers are working:

```bash
flux get alerts --all-namespaces
flux get alert-providers --all-namespaces
```

## Prevention Tips

- Use specific event selectors in Alert resources to reduce the volume of events processed
- Set `eventSeverity: error` on alerts where you only need failure notifications
- Monitor the Notification Controller metrics endpoint for event queue depth
- Test webhook endpoints for reachability before configuring Providers
- Set appropriate timeouts in Provider configurations to prevent the controller from hanging
- Keep the number of Alert resources manageable and consolidate where possible

## Summary

Notification Controller pod crashes are typically caused by event flooding, unreachable webhook endpoints, memory exhaustion, or misconfigured Provider and Alert resources. Reducing event volumes through specific selectors, verifying endpoint reachability, and properly sizing resource limits will resolve most issues. Keeping alert configurations focused and testing webhook endpoints proactively are the best preventive measures.
