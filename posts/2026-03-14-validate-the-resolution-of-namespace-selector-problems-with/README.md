# Validating the Resolution of Namespace Selector Problems with Unlabeled Namespaces in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy

Description: Systematically validate that namespace selector issues caused by missing labels in Calico network policies have been fully resolved across your Kubernetes cluster.

---

## Introduction

After fixing namespace selector problems caused by unlabeled namespaces in Calico, validation ensures the fix is complete and has not introduced new issues. A partial fix may resolve the reported symptom while leaving other namespaces in the same misconfigured state, creating future incidents.

Validation for namespace selector issues must cover three areas: the specific namespaces reported in the incident, all other namespaces that use similar labels, and the policies themselves to confirm they match the intended scope. This comprehensive approach prevents fix-and-forget cycles that leave latent issues in the cluster.

This guide provides a structured validation process with automated checks and manual verification steps.

## Prerequisites

- A Kubernetes cluster with Calico CNI where namespace selector problems were previously identified
- `kubectl` with cluster-admin access
- The list of namespaces and policies that were modified as part of the fix
- Test pods or connectivity testing tools

## Validating Label Consistency Across All Namespaces

```bash
#!/bin/bash
# validate-ns-labels.sh
# Checks that all non-system namespaces have the required labels

REQUIRED_LABELS=("environment" "team")
SYSTEM_NS_PATTERN="^(kube-|calico-|default$)"

echo "=== Namespace Label Validation ==="
ERRORS=0

for NS in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  # Skip system namespaces
  if echo "$NS" | grep -qE "$SYSTEM_NS_PATTERN"; then
    continue
  fi

  for LABEL in "${REQUIRED_LABELS[@]}"; do
    VALUE=$(kubectl get namespace "$NS" -o jsonpath="{.metadata.labels.$LABEL}" 2>/dev/null)
    if [ -z "$VALUE" ]; then
      echo "FAIL: Namespace '$NS' missing label '$LABEL'"
      ERRORS=$((ERRORS + 1))
    fi
  done
done

if [ $ERRORS -eq 0 ]; then
  echo "PASS: All non-system namespaces have required labels"
else
  echo "FAIL: $ERRORS missing labels found"
fi
```

## Validating Policy-Namespace Selector Alignment

Ensure every namespace selector in every policy matches at least one namespace:

```bash
#!/bin/bash
# validate-policy-selectors.sh
# Verifies that policy namespace selectors match existing namespaces

echo "=== Policy Selector Validation ==="

# Extract all unique namespace selectors from Calico policies
kubectl get networkpolicies.crd.projectcalico.org --all-namespaces -o json | python3 -c "
import sys, json, subprocess

policies = json.load(sys.stdin)['items']
selectors = {}

for p in policies:
    ns = p['metadata']['namespace']
    name = p['metadata']['name']
    spec = p.get('spec', {})
    for direction in ['ingress', 'egress']:
        for rule in spec.get(direction, []):
            for field_name in ['source', 'destination']:
                field = rule.get(field_name, {})
                ns_sel = field.get('namespaceSelector', '')
                if ns_sel:
                    key = f'{ns}/{name}'
                    selectors.setdefault(ns_sel, []).append(key)

# Report selectors and the policies that use them
for sel, policy_list in selectors.items():
    print(f'Selector: {sel}')
    for p in policy_list:
        print(f'  Used by: {p}')
    print()
"
```

## Testing Cross-Namespace Connectivity

Deploy a comprehensive connectivity test:

```yaml
# connectivity-test.yaml
# Creates pods in multiple namespaces to validate policy behavior
apiVersion: v1
kind: Namespace
metadata:
  name: validate-prod
  labels:
    environment: production
    team: validation
---
apiVersion: v1
kind: Namespace
metadata:
  name: validate-staging
  labels:
    environment: staging
    team: validation
---
apiVersion: v1
kind: Pod
metadata:
  name: server
  namespace: validate-prod
  labels:
    app: validation-server
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      ports:
        - containerPort: 80
---
apiVersion: v1
kind: Pod
metadata:
  name: client-prod
  namespace: validate-prod
spec:
  containers:
    - name: client
      image: busybox:1.36
      command: ["sleep", "3600"]
---
apiVersion: v1
kind: Pod
metadata:
  name: client-staging
  namespace: validate-staging
spec:
  containers:
    - name: client
      image: busybox:1.36
      command: ["sleep", "3600"]
```

```bash
# Deploy and run tests
kubectl apply -f connectivity-test.yaml
kubectl wait --for=condition=Ready pod/server -n validate-prod --timeout=60s
kubectl wait --for=condition=Ready pod/client-prod -n validate-prod --timeout=60s
kubectl wait --for=condition=Ready pod/client-staging -n validate-staging --timeout=60s

SERVER_IP=$(kubectl get pod server -n validate-prod -o jsonpath='{.status.podIP}')

# Test from production namespace (should be allowed by production policies)
echo "Production -> Production:"
kubectl exec -n validate-prod client-prod -- wget -qO- --timeout=5 "http://$SERVER_IP" >/dev/null 2>&1 && echo "ALLOWED" || echo "DENIED"

# Test from staging namespace (behavior depends on your policies)
echo "Staging -> Production:"
kubectl exec -n validate-staging client-staging -- wget -qO- --timeout=5 "http://$SERVER_IP" >/dev/null 2>&1 && echo "ALLOWED" || echo "DENIED"

# Cleanup
kubectl delete namespace validate-prod validate-staging
```

## Validating Felix Policy Evaluation

Confirm Felix is correctly processing the updated policies:

```bash
# Check Felix configuration and policy sync status
kubectl exec -n calico-system $(kubectl get pod -n calico-system \
  -l k8s-app=calico-node -o jsonpath='{.items[0].metadata.name}') -- \
  calico-node -felix-ready

# Verify Felix metrics show policy evaluations
kubectl exec -n calico-system $(kubectl get pod -n calico-system \
  -l k8s-app=calico-node -o jsonpath='{.items[0].metadata.name}') -- \
  wget -qO- http://localhost:9091/metrics | grep "felix_active_local_policies"
```

## Verification

Final validation summary:

```bash
echo "=== Final Validation Summary ==="

# 1. All namespaces labeled
UNLABELED=$(kubectl get namespaces -o json | python3 -c "
import sys, json
count = 0
for ns in json.load(sys.stdin)['items']:
    name = ns['metadata']['name']
    labels = ns['metadata'].get('labels', {})
    if not name.startswith('kube-') and name not in ['default','calico-system','calico-apiserver']:
        if 'environment' not in labels:
            count += 1
print(count)
")
echo "1. Unlabeled namespaces: $UNLABELED"

# 2. All Calico components healthy
CALICO_READY=$(kubectl get ds calico-node -n calico-system -o jsonpath='{.status.numberReady}')
CALICO_DESIRED=$(kubectl get ds calico-node -n calico-system -o jsonpath='{.status.desiredNumberScheduled}')
echo "2. Calico nodes: $CALICO_READY/$CALICO_DESIRED ready"

# 3. No recent policy-related errors
echo "3. Recent errors:"
kubectl get events --all-namespaces --field-selector type=Warning \
  --sort-by='.lastTimestamp' | grep -i "policy\|network\|calico" | tail -5 || echo "None found"
```

## Troubleshooting

- **Validation tests show inconsistent results**: Network policies may take a few seconds to propagate. Wait 15 seconds after applying labels and retry.
- **Connectivity test fails in one direction only**: Check for asymmetric policies. Ingress policies on the destination and egress policies on the source both need to allow the traffic.
- **Felix shows stale policy count**: Restart the calico-node pod on the affected node to force a full policy resync.
- **Labels appear correct but selector still does not match**: Verify the selector syntax. Calico uses `==` for equality and `has()` for existence checks, not the `matchLabels` syntax used by Kubernetes NetworkPolicy.

## Conclusion

Validating the resolution of namespace selector problems requires checking label consistency across all namespaces, verifying that every policy selector matches its intended namespaces, testing actual connectivity, and confirming Felix is processing the updated policies. Only after all these checks pass should the fix be considered complete. Automate these validation steps as part of your post-incident checklist.
