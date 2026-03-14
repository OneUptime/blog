# Building a Runbook for Namespace Selector Problems with Unlabeled Namespaces

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, Runbook

Description: Create an operational runbook for diagnosing and resolving Calico network policy failures caused by namespaces missing the labels that namespace selectors depend on.

---

## Introduction

A runbook for namespace selector problems provides on-call engineers with a structured, repeatable process to diagnose and fix policy mismatches caused by unlabeled namespaces. Without a runbook, engineers may spend valuable incident time reading documentation rather than resolving the issue.

Namespace selector problems manifest as unexpected traffic behavior: connections that should be blocked are allowed, or connections that should work are denied. The root cause is always a mismatch between the labels a policy expects and the labels a namespace actually has.

This guide provides a complete runbook with decision trees, diagnostic commands, and remediation steps that your team can use directly during incidents.

## Prerequisites

- `kubectl` access with permissions to read namespaces, pods, network policies, and Calico CRDs
- Access to the cluster where the issue is reported
- Familiarity with Calico NetworkPolicy and GlobalNetworkPolicy syntax

## Runbook Step 1: Confirm the Symptom

```bash
# Determine what the reporter is experiencing
# Symptom A: Traffic is flowing that should be blocked
# Symptom B: Traffic is blocked that should be allowed

# Step 1.1: Identify the source and destination
# Get the source pod and namespace
kubectl get pod SOURCE_POD -n SOURCE_NAMESPACE -o wide

# Get the destination pod and namespace
kubectl get pod DEST_POD -n DEST_NAMESPACE -o wide

# Step 1.2: Test connectivity directly
kubectl exec -n SOURCE_NAMESPACE SOURCE_POD -- \
  wget -qO- --timeout=5 http://DEST_IP:DEST_PORT 2>&1
```

## Runbook Step 2: Audit Namespace Labels

```bash
# Step 2.1: Check labels on source namespace
kubectl get namespace SOURCE_NAMESPACE --show-labels

# Step 2.2: Check labels on destination namespace
kubectl get namespace DEST_NAMESPACE --show-labels

# Step 2.3: List ALL namespace labels in a readable format
kubectl get namespaces -o custom-columns=\
NAME:.metadata.name,\
ENVIRONMENT:.metadata.labels.environment,\
TEAM:.metadata.labels.team

# Decision Point:
# - If source or destination namespace is missing expected labels → Go to Step 4 (Fix)
# - If both namespaces have expected labels → Go to Step 3 (Check Policies)
```

## Runbook Step 3: Check Policy Selector Expressions

```bash
# Step 3.1: List policies in the destination namespace
kubectl get networkpolicies.crd.projectcalico.org -n DEST_NAMESPACE -o yaml

# Step 3.2: List global policies that may apply
kubectl get globalnetworkpolicies.crd.projectcalico.org -o yaml

# Step 3.3: For each policy, extract namespace selectors
kubectl get networkpolicies.crd.projectcalico.org -n DEST_NAMESPACE -o json \
  | python3 -c "
import sys, json
for p in json.load(sys.stdin)['items']:
    name = p['metadata']['name']
    spec = p.get('spec', {})
    for direction in ['ingress', 'egress']:
        for i, rule in enumerate(spec.get(direction, [])):
            for key in ['source', 'destination']:
                ns_sel = rule.get(key, {}).get('namespaceSelector', '')
                if ns_sel:
                    print(f'Policy: {name}, Rule {i} ({direction}/{key}): {ns_sel}')
"

# Step 3.4: Manually verify the selector matches the namespace labels
# Example: if selector is 'environment == "production"'
# Check: does the source namespace have label environment=production?
kubectl get namespace SOURCE_NAMESPACE -o jsonpath='{.metadata.labels.environment}'
```

## Runbook Step 4: Apply the Fix

```bash
# Option A: Add missing labels to the namespace
kubectl label namespace SOURCE_NAMESPACE environment=production --overwrite
kubectl label namespace DEST_NAMESPACE environment=production --overwrite

# Option B: If labels cannot be added, update the policy
# Edit the policy to use kubernetes.io/metadata.name instead
kubectl edit networkpolicies.crd.projectcalico.org POLICY_NAME -n DEST_NAMESPACE

# In the editor, change:
#   namespaceSelector: environment == 'production'
# To:
#   namespaceSelector: kubernetes.io/metadata.name == 'SOURCE_NAMESPACE'
```

Apply a corrected policy:

```yaml
# Example corrected policy using the built-in namespace name label
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: backend
spec:
  selector: app == 'api'
  types:
    - Ingress
  ingress:
    - action: Allow
      source:
        namespaceSelector: >-
          kubernetes.io/metadata.name == 'frontend'
      protocol: TCP
      destination:
        ports:
          - 8080
```

## Runbook Step 5: Validate the Fix

```bash
# Step 5.1: Re-test connectivity
kubectl exec -n SOURCE_NAMESPACE SOURCE_POD -- \
  wget -qO- --timeout=5 http://DEST_IP:DEST_PORT

# Step 5.2: Verify no unintended side effects
# Check that other namespaces that should NOT reach the destination are still blocked
kubectl exec -n OTHER_NAMESPACE OTHER_POD -- \
  wget -qO- --timeout=5 http://DEST_IP:DEST_PORT 2>&1
# Expected: connection refused or timeout

# Step 5.3: Confirm namespace labels are correct
kubectl get namespaces --show-labels | grep -E "SOURCE_NAMESPACE|DEST_NAMESPACE"
```

## Verification

```bash
# Final verification checklist
echo "=== Runbook Completion Checklist ==="

# 1. Affected connectivity is restored/blocked as intended
echo "1. Connectivity test:"
kubectl exec -n SOURCE_NAMESPACE SOURCE_POD -- wget -qO- --timeout=5 http://DEST_IP:DEST_PORT && echo "PASS" || echo "FAIL"

# 2. Namespace labels are documented
echo "2. Namespace labels:"
kubectl get namespace SOURCE_NAMESPACE --show-labels

# 3. No new events or errors
echo "3. Recent events:"
kubectl get events -n DEST_NAMESPACE --sort-by='.lastTimestamp' | tail -5
```

## Troubleshooting

- **Label was added but traffic is still blocked**: Multiple policies may apply. Check all policies in the namespace and all GlobalNetworkPolicies. A deny rule in any matching policy takes precedence.
- **Label was added but too much traffic is now allowed**: The label may have caused the namespace to match an allow policy intended for a different namespace. Review all policies that select for that label value.
- **Cannot determine which policy is affecting traffic**: Use Felix debug logging by setting `logSeverityScreen: Debug` in the FelixConfiguration resource temporarily. Check calico-node logs for policy hit information.
- **Namespace is managed by Terraform/Helm**: Do not apply labels manually. Update the source definition and redeploy through the proper pipeline to avoid drift.

## Conclusion

This runbook provides a systematic five-step process for resolving namespace selector problems: confirm the symptom, audit namespace labels, check policy selectors, apply the fix, and validate. The most critical step is the cross-reference between policy namespace selectors and actual namespace labels, which is where the mismatch always occurs. Document any new failure modes you discover and add them to the runbook for future incidents.
