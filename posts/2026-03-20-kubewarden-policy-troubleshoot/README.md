# How to Troubleshoot Kubewarden Policy Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Troubleshooting, Policy as Code, Kubernetes, Debugging, Admission Control, SUSE Rancher

Description: Learn how to diagnose and fix common Kubewarden policy issues including policies not enforcing, evaluation errors, and misconfigured settings using logs, events, and kwctl.

---

Kubewarden policies can fail silently or produce unexpected results. This guide walks through the most common issues and how to diagnose them systematically.

---

## Common Issues

| Symptom | Likely Cause |
|---|---|
| Policy not enforcing | Policy not active or rules misconfigured |
| All requests rejected | Policy settings too strict or bug in logic |
| Error on every evaluation | WASM runtime issue or SDK mismatch |
| Policy works locally but fails in cluster | Missing settings or wrong registry |

---

## Step 1: Check Policy Status

```bash
# List all ClusterAdmissionPolicies

kubectl get clusteradmissionpolicy

# Check if a policy is active
kubectl describe clusteradmissionpolicy disallow-latest-tag

# Look for the Status field - it should be "active"
# If it stays "scheduled" or "pending", the policy server may still be reconciling it
```

A policy in `pending` state means Kubewarden is still reconciling the resources needed to serve it, such as rolling out the Policy Server, downloading the module, or validating settings. If it stays pending, check the Policy Server logs:

```bash
kubectl logs -n kubewarden deployment/kubewarden-policy-server-default
```

---

## Step 2: Inspect Policy Server Logs

```bash
# Follow logs for real-time evaluation output
kubectl logs -n kubewarden deployment/kubewarden-policy-server-default -f

# Filter for a specific policy
kubectl logs -n kubewarden deployment/kubewarden-policy-server-default \
  | grep "disallow-latest-tag"

# Look for error-level log entries
kubectl logs -n kubewarden deployment/kubewarden-policy-server-default \
  | grep -i "error\|panic\|failed"
```

---

## Step 3: Check Kubernetes Events

```bash
# View events in the kubewarden namespace
kubectl get events -n kubewarden --sort-by='.metadata.creationTimestamp'

# Check events for a specific policy
kubectl describe clusteradmissionpolicy disallow-latest-tag | grep -A 10 Events
```

---

## Step 4: Test with kwctl Before Deploying

The fastest way to debug a policy is to run it locally with a known request:

```bash
# Run the policy against a test request
kwctl run \
  registry://ghcr.io/my-org/disallow-latest-tag:v0.1.0 \
  --request-path test-request.json \
  --settings-path settings.json

# Increase kwctl verbosity for additional troubleshooting output
kwctl -v run \
  registry://ghcr.io/my-org/disallow-latest-tag:v0.1.0 \
  --request-path test-request.json \
  --settings-path settings.json
```

---

## Step 5: Validate Policy Settings

Invalid settings can prevent a policy from loading cleanly. `kwctl run` validates settings before evaluating the request:

```bash
# Run the policy with the same settings you plan to deploy
kwctl run my-policy.wasm \
  --request-path test-request.json \
  --settings-path settings.json

# Example output for valid settings includes:
# "valid": true

# Example output for invalid settings includes:
# "valid": false
# "message": "required field 'maxReplicas' is missing"
```

---

## Step 6: Check Admission Webhook Configuration

Kubewarden creates a dedicated webhook configuration for each policy. Validating policies use a `ValidatingWebhookConfiguration`, while mutating policies use a `MutatingWebhookConfiguration`. If the webhook is misconfigured, the policy may not fire or it may block matching requests:

```bash
# List validating webhook configurations created by Kubewarden
kubectl get validatingwebhookconfigurations -l kubewarden

# Inspect the webhook for this ClusterAdmissionPolicy
kubectl describe validatingwebhookconfiguration clusterwide-disallow-latest-tag

# Check the namespaceSelector and rules - misconfigured selectors mean
# the webhook never fires for your target resources
```

---

## Step 7: Test with a Dry-Run Request

```bash
# Perform a dry-run to see what the webhook would do without applying
kubectl apply --dry-run=server -f my-pod.yaml

# If the request is rejected, the error message will come from the policy
# If no error appears, the policy may not be matching this resource type
```

---

## Step 8: Check Policy Rules Configuration

```text
# Verify the rules section matches your resource
kubectl get clusteradmissionpolicy disallow-latest-tag -o yaml

# Common mistake: rules.operations missing "UPDATE"
spec:
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE"]    # <-- Only fires on CREATE, not UPDATE
```

---

## Debugging Checklist

```bash
# 1. Is the policy active?
kubectl get clusteradmissionpolicy

# 2. Is the Policy Server running?
kubectl get pods -n kubewarden

# 3. Are there errors in the Policy Server logs?
kubectl logs -n kubewarden deployment/kubewarden-policy-server-default | tail -50

# 4. Does kwctl run the policy correctly locally?
kwctl run <policy> --request-path test.json

# 5. Does the webhook configuration match your resource?
kubectl describe validatingwebhookconfiguration clusterwide-disallow-latest-tag
```

---

## Best Practices

- Always test with `kwctl` locally before deploying to a cluster - it gives faster feedback than cluster-level testing.
- Set policies to `monitor` mode first (`spec.mode: monitor`) so you can observe what would be denied without actually blocking requests.
- Use `kubectl describe` on the policy and the webhook configuration together - most issues are in the rules or settings fields.
