# Fixing Namespace Selector Problems with Unlabeled Namespaces in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy

Description: Step-by-step guide to fix Calico network policy failures caused by namespaces missing required labels, including label application strategies and policy adjustments.

---

## Introduction

When Calico network policies use namespace selectors but the target namespaces lack the expected labels, traffic is silently allowed or denied in ways that violate your security intent. This is not a Calico bug but a configuration gap that requires either adding labels to namespaces or adjusting policies to account for unlabeled namespaces.

The fix must be applied carefully. Simply adding labels to namespaces in production can immediately change which policies match, potentially disrupting running workloads. Similarly, modifying policies without understanding their current effective scope can open security holes.

This guide provides safe, tested approaches to fix namespace selector mismatches with minimal disruption to running workloads.

## Prerequisites

- A Kubernetes cluster with Calico as the CNI
- `kubectl` access with permissions to label namespaces and modify Calico network policies
- A list of affected namespaces and policies from prior diagnosis
- A maintenance window for applying changes to production namespaces

## Applying Labels to Existing Namespaces

The most straightforward fix is adding the missing labels to namespaces that should be matched by policies.

```bash
# First, review existing labels on all namespaces
kubectl get namespaces --show-labels

# Add labels to specific namespaces
# Use --overwrite if updating an existing label value
kubectl label namespace frontend environment=production team=web
kubectl label namespace backend environment=production team=api
kubectl label namespace staging environment=staging team=platform

# For bulk labeling, use a script
# This applies the environment label to all namespaces listed in a file
cat > /tmp/ns-labels.txt << 'EOF'
frontend,environment=production
backend,environment=production
monitoring,environment=production
staging,environment=staging
EOF

while IFS=',' read -r ns label; do
  echo "Labeling namespace $ns with $label"
  kubectl label namespace "$ns" "$label" --overwrite
done < /tmp/ns-labels.txt
```

## Automating Namespace Labels with a Mutating Webhook

To prevent this problem from recurring, set up automatic label injection for new namespaces:

```yaml
# namespace-label-policy.yaml
# Kyverno policy to automatically label new namespaces
# Requires Kyverno to be installed in the cluster
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-default-namespace-labels
spec:
  rules:
    - name: add-environment-label
      match:
        any:
          - resources:
              kinds:
                - Namespace
      mutate:
        patchStrategicMerge:
          metadata:
            labels:
              # Default to 'development' if no environment label is set
              +(environment): "development"
```

If you do not use Kyverno, you can enforce labeling via a ValidatingWebhook that rejects unlabeled namespaces:

```yaml
# namespace-label-validation.yaml
# Kyverno validation policy that blocks namespaces without required labels
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-namespace-labels
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-environment-label
      match:
        any:
          - resources:
              kinds:
                - Namespace
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - kube-public
                - kube-node-lease
                - calico-system
                - calico-apiserver
      validate:
        message: "Namespaces must have an 'environment' label."
        pattern:
          metadata:
            labels:
              environment: "?*"
```

## Adjusting Calico Policies to Handle Unlabeled Namespaces

Sometimes you cannot label all namespaces. In that case, adjust policies to use the auto-applied `kubernetes.io/metadata.name` label:

```yaml
# Before: policy depends on a custom label that may not exist
# apiVersion: projectcalico.org/v3
# kind: NetworkPolicy
# ...
#   ingress:
#     - action: Allow
#       source:
#         namespaceSelector: environment == 'production'

# After: use the built-in namespace name label instead
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-known-namespaces
  namespace: backend
spec:
  selector: app == 'api-server'
  types:
    - Ingress
  ingress:
    - action: Allow
      source:
        # Use the auto-applied label that always exists on every namespace
        namespaceSelector: >-
          kubernetes.io/metadata.name == 'frontend'
          || kubernetes.io/metadata.name == 'monitoring'
      protocol: TCP
      destination:
        ports:
          - 8080
```

For GlobalNetworkPolicies that need to catch all namespaces:

```yaml
# global-default-deny.yaml
# A GlobalNetworkPolicy that applies regardless of namespace labels
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: default-deny-all
spec:
  # Using has() ensures this catches namespaces with ANY value for the label
  # kubernetes.io/metadata.name is always present on every namespace
  namespaceSelector: has(kubernetes.io/metadata.name)
  types:
    - Ingress
    - Egress
  ingress:
    - action: Deny
  egress:
    - action: Deny
```

## Safe Rollout Strategy

Apply changes incrementally to avoid disrupting production:

```bash
# Step 1: Apply labels in non-production first
kubectl label namespace staging environment=staging
kubectl label namespace development environment=development

# Step 2: Verify policies now match correctly in non-prod
kubectl exec -n staging test-pod -- wget -qO- --timeout=5 http://backend-svc.backend:8080

# Step 3: Apply labels in production during maintenance window
kubectl label namespace frontend environment=production
kubectl label namespace backend environment=production

# Step 4: Monitor for any connectivity changes
kubectl get events --all-namespaces --field-selector reason=NetworkPolicyDrop --watch &

# Step 5: Verify critical connectivity paths
kubectl exec -n frontend deploy/web -- curl -s --max-time 5 http://api-svc.backend:8080/health
```

## Verification

Confirm all namespace selector mismatches are resolved:

```bash
# Verify all expected namespaces now have required labels
kubectl get namespaces -l environment --no-headers | wc -l
kubectl get namespaces --no-headers | wc -l
echo "All namespaces should have the environment label"

# Cross-check policies against namespace labels
kubectl get networkpolicies.crd.projectcalico.org --all-namespaces -o json | python3 -c "
import sys, json, subprocess
policies = json.load(sys.stdin)['items']
for p in policies:
    ns = p['metadata']['namespace']
    name = p['metadata']['name']
    spec = p.get('spec', {})
    for direction in ['ingress', 'egress']:
        for rule in spec.get(direction, []):
            for field in [rule.get('source', {}), rule.get('destination', {})]:
                ns_sel = field.get('namespaceSelector', '')
                if ns_sel:
                    print(f'{ns}/{name}: namespaceSelector={ns_sel}')
"

# Test pod connectivity across namespaces
kubectl run fix-test --image=busybox:1.36 --restart=Never -- sleep 30
kubectl wait --for=condition=Ready pod/fix-test --timeout=30s
kubectl delete pod fix-test
```

## Troubleshooting

- **Labeling a namespace immediately breaks connectivity**: A newly applied label may cause the namespace to match a deny policy it previously did not. Review all GlobalNetworkPolicies with namespace selectors before applying labels.
- **Cannot label system namespaces**: System namespaces like `kube-system` should generally be excluded from policy namespace selectors using `namespaceSelector: kubernetes.io/metadata.name != 'kube-system'`.
- **Labels removed after namespace recreation**: If namespaces are managed by Helm or GitOps, ensure labels are added in the source manifests, not just applied via `kubectl label`.
- **Policy changes not taking effect**: Felix processes policy updates within seconds. If changes are not reflected, check `kubectl logs -n calico-system -l k8s-app=calico-node --tail=20` for errors.

## Conclusion

Fixing namespace selector problems with unlabeled namespaces requires a two-pronged approach: applying missing labels to existing namespaces and preventing the problem from recurring through automation. Use the built-in `kubernetes.io/metadata.name` label for policies that must match all namespaces reliably. Always roll out label changes incrementally, starting with non-production environments, and verify connectivity after each change.
