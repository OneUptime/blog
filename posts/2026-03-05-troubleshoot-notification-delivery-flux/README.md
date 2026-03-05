# How to Troubleshoot Notification Delivery Failures in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Notifications, Troubleshooting, Debugging

Description: Learn how to diagnose and fix notification delivery failures in Flux CD, covering common issues with providers, alerts, and the notification controller.

---

When Flux notifications stop arriving, identifying the root cause can be challenging because the issue could be in the alert configuration, the provider setup, the notification controller itself, or the external service receiving notifications. This guide provides a systematic approach to troubleshooting notification delivery failures in Flux.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- kubectl access with permissions to read Flux resources and logs
- An existing alert and provider configuration that is not delivering notifications

## Step 1: Check the Notification Controller Status

The notification controller is the component responsible for processing events and delivering notifications. Start by verifying it is running.

```bash
# Check if the notification controller pod is running
kubectl get pods -n flux-system | grep notification

# Check the controller deployment status
kubectl get deployment notification-controller -n flux-system

# Check for pod restarts that might indicate crashes
kubectl get pods -n flux-system -o custom-columns=NAME:.metadata.name,RESTARTS:.status.containerStatuses[0].restartCount | grep notification
```

## Step 2: Examine Notification Controller Logs

The logs are the most valuable source of information for diagnosing delivery failures.

```bash
# View recent notification controller logs
kubectl logs -n flux-system deploy/notification-controller --tail=100

# Filter logs for error messages
kubectl logs -n flux-system deploy/notification-controller | grep -i "error\|fail\|unable"

# Follow logs in real-time while triggering a reconciliation
kubectl logs -n flux-system deploy/notification-controller -f
```

Look for messages indicating:
- HTTP errors when posting to the provider endpoint
- Authentication failures
- TLS certificate errors
- Timeout issues

## Step 3: Verify the Alert Resource

Check that the alert is correctly configured and not suspended.

```bash
# List all alerts and their status
kubectl get alerts -n flux-system

# Check if the alert is suspended
kubectl get alert my-alert -n flux-system -o jsonpath='{.spec.suspend}'

# View the full alert configuration
kubectl get alert my-alert -n flux-system -o yaml
```

Verify these fields in the alert:
- `spec.providerRef.name` references an existing Provider
- `spec.eventSources` lists valid resource kinds and names
- `spec.eventSeverity` is set to `info` or `error`
- `spec.suspend` is `false` or not set

## Step 4: Verify the Provider Resource

Check the notification provider configuration.

```bash
# List all providers
kubectl get providers -n flux-system

# View provider details
kubectl get provider my-provider -n flux-system -o yaml

# Verify the provider status
kubectl describe provider my-provider -n flux-system
```

## Step 5: Check the Provider Secret

Many providers require a secret containing a webhook URL, token, or API key. Verify the secret exists and contains the expected data.

```bash
# Check if the secret exists
kubectl get secret -n flux-system | grep webhook

# Verify the secret has the expected keys
kubectl get secret slack-webhook-url -n flux-system -o jsonpath='{.data}' | jq 'keys'

# Decode and verify the secret value (be cautious with sensitive data)
kubectl get secret slack-webhook-url -n flux-system -o jsonpath='{.data.address}' | base64 -d
```

## Step 6: Verify Events Are Being Generated

If no events are being generated, there is nothing for the alert to forward.

```bash
# Check recent events in the namespace
kubectl get events -n flux-system --sort-by='.lastTimestamp' | tail -20

# Filter events by specific resource types
kubectl get events -n flux-system --field-selector involvedObject.kind=Kustomization

# Trigger a reconciliation to generate events
flux reconcile kustomization flux-system --with-source
```

## Step 7: Test the Provider Endpoint Directly

Test connectivity to the provider endpoint from within the cluster.

```bash
# For Slack webhooks, test the URL directly
kubectl run curl-test --image=curlimages/curl --rm -it -- \
  curl -X POST -H "Content-Type: application/json" \
  -d '{"text":"Test from Flux cluster"}' \
  "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# For generic webhooks, test connectivity
kubectl run curl-test --image=curlimages/curl --rm -it -- \
  curl -I "https://your-webhook-endpoint.example.com"
```

## Step 8: Check Network Policies

Network policies might block outgoing traffic from the notification controller.

```bash
# Check for network policies in the flux-system namespace
kubectl get networkpolicies -n flux-system

# Describe any network policies that might affect the notification controller
kubectl describe networkpolicy -n flux-system

# Check if egress is restricted
kubectl get networkpolicy -n flux-system -o yaml
```

## Step 9: Check for TLS Certificate Issues

If the provider endpoint uses HTTPS, certificate verification might fail.

```bash
# Test TLS connectivity from within the cluster
kubectl run curl-test --image=curlimages/curl --rm -it -- \
  curl -v "https://your-provider-endpoint.example.com" 2>&1 | grep -i "ssl\|certificate\|tls"

# Check notification controller logs for TLS errors
kubectl logs -n flux-system deploy/notification-controller | grep -i "tls\|certificate\|x509"
```

## Step 10: Restart the Notification Controller

If logs show stale connections or the controller appears stuck, restart it.

```bash
# Restart the notification controller
kubectl rollout restart deploy/notification-controller -n flux-system

# Wait for the rollout to complete
kubectl rollout status deploy/notification-controller -n flux-system

# Verify the new pod is running
kubectl get pods -n flux-system | grep notification
```

## Common Issues and Solutions

| Symptom | Likely Cause | Solution |
|---|---|---|
| No logs about event processing | Alert is suspended or misconfigured | Check alert spec and suspension status |
| "provider not found" in logs | Provider reference is incorrect | Verify providerRef name matches |
| HTTP 401/403 errors | Invalid credentials in secret | Update the secret with correct values |
| HTTP 404 errors | Wrong webhook URL | Verify the URL in the provider secret |
| Connection timeout | Network policy or firewall | Check network policies and egress rules |
| TLS handshake failure | Certificate issues | Verify TLS certs or configure certificate authority |
| Events generated but no notifications | Severity filter too strict | Check eventSeverity setting |
| Events generated but no notifications | Exclusion rules too broad | Review exclusionList patterns |

## Diagnostic Script

Here is a comprehensive diagnostic script you can run to gather information.

```bash
# Flux notification diagnostic script
echo "=== Notification Controller Status ==="
kubectl get deploy notification-controller -n flux-system

echo ""
echo "=== Providers ==="
kubectl get providers -n flux-system

echo ""
echo "=== Alerts ==="
kubectl get alerts -n flux-system -o custom-columns=NAME:.metadata.name,SEVERITY:.spec.eventSeverity,SUSPENDED:.spec.suspend,PROVIDER:.spec.providerRef.name

echo ""
echo "=== Recent Events ==="
kubectl get events -n flux-system --sort-by='.lastTimestamp' | tail -10

echo ""
echo "=== Controller Logs (last 20 lines) ==="
kubectl logs -n flux-system deploy/notification-controller --tail=20

echo ""
echo "=== Controller Errors ==="
kubectl logs -n flux-system deploy/notification-controller | grep -i "error\|fail" | tail -10
```

## Summary

Troubleshooting notification delivery failures in Flux requires a systematic approach: verify the controller is running, check logs for errors, validate alert and provider configurations, confirm secrets exist, ensure events are being generated, test network connectivity, and check for TLS issues. Most problems fall into one of a few categories: misconfigured resources, invalid credentials, network connectivity issues, or the alert being suspended. Use the diagnostic steps and common issues table in this guide to quickly identify and resolve the problem.
