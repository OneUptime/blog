# How to Troubleshoot Flux Receiver Not Triggering Reconciliation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Receiver, Webhook, Troubleshooting, Debugging, Reconciliation

Description: A systematic troubleshooting guide for diagnosing and fixing issues when a Flux Receiver accepts webhooks but does not trigger resource reconciliation.

---

You have configured a Flux Receiver, exposed it externally, and your webhook provider shows successful deliveries. Yet your GitRepository, HelmRepository, or Kustomization resources are not being reconciled. This is one of the most frustrating issues to debug because the webhook appears to work but nothing happens downstream.

This guide provides a systematic approach to diagnosing every link in the chain from webhook delivery to resource reconciliation.

## Prerequisites

- A Kubernetes cluster with Flux CD installed.
- A Receiver resource configured in the `flux-system` namespace.
- Access to `kubectl` and the `flux` CLI.
- The webhook provider shows successful deliveries (HTTP 200).

## Understanding the Reconciliation Chain

When a webhook arrives at the Receiver, the following chain of events should occur:

1. The notification-controller receives the HTTP request.
2. It validates the token or HMAC signature.
3. It annotates the target resources with `reconcile.fluxcd.io/requestedAt` set to the current timestamp.
4. The source-controller or kustomize-controller detects the annotation change.
5. The controller triggers an immediate reconciliation of that resource.

A failure at any step breaks the chain. Let us diagnose each one.

## Step 1: Verify the Receiver Status

Start by checking whether the Receiver itself is healthy:

```bash
kubectl -n flux-system get receiver
```

Expected output:

```text
NAME              AGE   READY   STATUS
github-receiver   10m   True    Receiver initialized for path /hook/abc123...
```

If `READY` is `False`, describe the resource for more detail:

```bash
kubectl -n flux-system describe receiver github-receiver
```

Common issues:

- **Secret not found**: The `secretRef` points to a secret that does not exist.
- **Invalid resource reference**: One of the resources listed in `spec.resources` does not exist.

Fix the underlying issue and wait for the notification-controller to reconcile the Receiver.

## Step 2: Confirm the Webhook Is Reaching the Controller

Check the notification-controller logs for incoming requests:

```bash
kubectl -n flux-system logs deploy/notification-controller --since=10m | grep -i "receiver"
```

Look for lines indicating a request was received:

```text
"msg":"handling request","receiver":"flux-system/github-receiver"
```

If you see no log lines, the request is not reaching the controller. Possible causes:

- The Ingress or Gateway is misconfigured.
- The webhook URL path does not match the Receiver's webhook path.
- A firewall or network policy is blocking traffic.

Test connectivity directly to the service from inside the cluster:

```bash
WEBHOOK_PATH=$(kubectl -n flux-system get receiver github-receiver -o jsonpath='{.status.webhookPath}')

kubectl -n flux-system run curl-test --rm -it --image=curlimages/curl -- \
  curl -s -o /dev/null -w "%{http_code}" -X POST \
  http://notification-controller.flux-system.svc.cluster.local$WEBHOOK_PATH
```

If this returns 200 but external requests fail, the problem is with the Ingress or external routing.

## Step 3: Check Token Validation

If the controller receives the request but rejects it, look for authentication errors:

```bash
kubectl -n flux-system logs deploy/notification-controller --since=10m | grep -i "signature\|token\|unauthorized\|forbidden"
```

Common authentication failures:

- **Token mismatch**: The secret in Kubernetes does not match the secret on the provider side.
- **Wrong Receiver type**: Using `type: github` but the webhook comes from GitLab (different signature header).
- **Encoding issues**: Trailing newline in the secret value.

Verify the token value:

```bash
kubectl -n flux-system get secret webhook-token -o jsonpath='{.data.token}' | base64 -d | xxd | tail -1
```

Check for trailing newlines or whitespace in the hexdump output.

## Step 4: Verify Resource Annotations

After a successful webhook, the notification-controller should annotate the target resources. Check whether the annotation was applied:

```bash
kubectl -n flux-system get gitrepository flux-system -o jsonpath='{.metadata.annotations.reconcile\.fluxcd\.io/requestedAt}'
```

If the annotation is missing or the timestamp is old, the notification-controller failed to patch the resource. Check its RBAC permissions:

```bash
kubectl -n flux-system auth can-i patch gitrepositories.source.toolkit.fluxcd.io \
  --as=system:serviceaccount:flux-system:notification-controller
```

This should return `yes`. If not, the notification-controller's ClusterRole or ClusterRoleBinding may have been modified.

## Step 5: Check the Source Controller

Even if the annotation is set, the source-controller must react to it. Verify the source-controller is running:

```bash
kubectl -n flux-system get pods -l app=source-controller
```

Check its logs for reconciliation activity:

```bash
kubectl -n flux-system logs deploy/source-controller --since=10m | grep "flux-system"
```

Look for messages about fetching the Git repository. If the source-controller is healthy but not reconciling, check the GitRepository status:

```bash
flux get source git flux-system
```

A suspended resource will not reconcile:

```bash
kubectl -n flux-system get gitrepository flux-system -o jsonpath='{.spec.suspend}'
```

If it returns `true`, resume it:

```bash
flux resume source git flux-system
```

## Step 6: Verify the Resource References in the Receiver

The Receiver must reference the correct resources. A common mistake is a typo in the resource name, kind, or API version:

```bash
kubectl -n flux-system get receiver github-receiver -o yaml | grep -A 10 "resources:"
```

Compare the listed resources with what actually exists:

```bash
# Check if the GitRepository exists
kubectl -n flux-system get gitrepository flux-system

# Check if a Kustomization exists (if referenced)
kubectl -n flux-system get kustomization flux-system
```

The `apiVersion` must match exactly. For example, `source.toolkit.fluxcd.io/v1` is different from `source.toolkit.fluxcd.io/v1beta2`.

## Step 7: Check for Network Policies

If your cluster uses network policies, they may be blocking traffic between namespaces or to the notification-controller:

```bash
kubectl -n flux-system get networkpolicies
```

Ensure the notification-controller can receive traffic from the Ingress controller namespace and can make API calls to the Kubernetes API server.

## Step 8: Check Event Filtering

The Receiver filters by event type. If the webhook event does not match the configured events, the Receiver will ignore it silently:

```yaml
spec:
  events:
    - "push"
```

This configuration only reacts to push events. If the webhook provider sends a `pull_request` event, it will be ignored. Check the provider's delivery log to see what event type is being sent and make sure it appears in the Receiver's `spec.events` list.

For testing, you can temporarily accept all events by omitting the `events` field (some receiver types support this).

## Step 9: Inspect the Notification Controller for Errors

Collect a comprehensive set of logs:

```bash
kubectl -n flux-system logs deploy/notification-controller --since=30m > /tmp/notification-logs.txt
```

Search for errors:

```bash
grep -i "error\|fail\|panic\|unable" /tmp/notification-logs.txt
```

Common errors include:

- `failed to patch resource`: RBAC issue or the target resource was deleted.
- `signature verification failed`: Token mismatch.
- `no matching event`: The webhook event type is not in the Receiver's event list.

## Step 10: Force a Manual Reconciliation

To confirm that the controllers themselves work, trigger a manual reconciliation:

```bash
flux reconcile source git flux-system
```

If this succeeds, the controllers are healthy and the problem is specifically in the webhook-to-annotation pipeline (Steps 1 through 4).

## Quick Diagnostic Script

Run this script to check all components at once:

```bash
#!/bin/bash
echo "=== Receiver Status ==="
kubectl -n flux-system get receiver

echo -e "\n=== Notification Controller Pods ==="
kubectl -n flux-system get pods -l app=notification-controller

echo -e "\n=== Source Controller Pods ==="
kubectl -n flux-system get pods -l app=source-controller

echo -e "\n=== GitRepository Status ==="
flux get source git --all-namespaces

echo -e "\n=== Recent Notification Controller Errors ==="
kubectl -n flux-system logs deploy/notification-controller --since=10m 2>/dev/null | grep -i "error" | tail -5

echo -e "\n=== Reconciliation Annotation ==="
kubectl -n flux-system get gitrepository flux-system -o jsonpath='{.metadata.annotations.reconcile\.fluxcd\.io/requestedAt}'
echo ""
```

## Verification

After fixing the issue, trigger a webhook from the provider side (use the "Redeliver" button on GitHub) and confirm:

1. The notification-controller log shows the request was handled.
2. The target resource's `reconcile.fluxcd.io/requestedAt` annotation is updated.
3. The source-controller fetches the latest commit.
4. Downstream Kustomizations or HelmReleases are reconciled.

```bash
# Watch reconciliation in real time
flux get source git flux-system -w
```

## Summary

When a Flux Receiver is not triggering reconciliation, work through the chain systematically: check that the Receiver is Ready, confirm the webhook reaches the notification-controller, verify token validation passes, ensure the resource annotation is being set, and confirm the source-controller reacts to the annotation. Most issues fall into one of these categories: misconfigured Ingress routing, token mismatches, incorrect resource references, or suspended resources.
