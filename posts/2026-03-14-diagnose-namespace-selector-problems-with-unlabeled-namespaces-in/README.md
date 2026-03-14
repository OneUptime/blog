# Diagnosing Namespace Selector Problems with Unlabeled Namespaces in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy

Description: Learn how to diagnose issues where Calico network policies fail to match namespaces that lack the expected labels, causing unexpected traffic allow or deny behavior.

---

## Introduction

Calico network policies use namespace selectors to control traffic between namespaces. A common and subtle problem arises when namespaces lack the labels that policies depend on. In this scenario, policies silently fail to match the intended namespaces, leading to either overly permissive or overly restrictive network behavior.

This issue is particularly dangerous because it produces no errors. The policy applies successfully, Calico reports no warnings, and the only symptom is that traffic flows differently than expected. Engineers often spend hours checking policy syntax before realizing the target namespace simply does not have the required label.

This guide walks through systematic diagnostic steps to identify when unlabeled namespaces are causing policy selector mismatches.

## Prerequisites

- A Kubernetes cluster with Calico CNI installed
- `kubectl` with permissions to read namespaces, network policies, and Calico resources
- `calicoctl` CLI installed (optional but recommended)
- Basic understanding of Calico NetworkPolicy and GlobalNetworkPolicy resources

## Identifying Namespace Label Mismatches

Start by auditing which namespaces have labels and which do not:

```bash
# List all namespaces with their labels
# This reveals namespaces missing expected labels
kubectl get namespaces --show-labels

# Find namespaces with no custom labels (only kubernetes.io/metadata.name)
kubectl get namespaces -o json | python3 -c "
import sys, json
ns_list = json.load(sys.stdin)['items']
for ns in ns_list:
    labels = ns['metadata'].get('labels', {})
    # Filter out the auto-applied label
    custom = {k:v for k,v in labels.items() if not k.startswith('kubernetes.io/')}
    if not custom:
        print(f'  Unlabeled: {ns["metadata"]["name"]}')
    else:
        print(f'  Labeled:   {ns["metadata"]["name"]} -> {custom}')
"
```

## Auditing Calico Policies for Namespace Selectors

Identify which policies use namespace selectors and what labels they expect:

```bash
# Find all Calico NetworkPolicies that reference namespace selectors
kubectl get networkpolicies.crd.projectcalico.org --all-namespaces -o yaml \
  | grep -B5 -A5 "namespaceSelector"

# For GlobalNetworkPolicies, check namespace selectors
kubectl get globalnetworkpolicies.crd.projectcalico.org -o yaml \
  | grep -B5 -A5 "namespaceSelector"
```

Example of a policy that depends on namespace labels:

```yaml
# This policy allows ingress only from namespaces labeled environment=production
# If the source namespace lacks this label, traffic will be DENIED
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-production-ingress
  namespace: backend
spec:
  selector: app == 'api-server'
  types:
    - Ingress
  ingress:
    - action: Allow
      source:
        namespaceSelector: environment == 'production'
      protocol: TCP
      destination:
        ports:
          - 8080
```

```bash
# Cross-reference: find namespaces that SHOULD match but do not
# Extract unique namespace selector expressions from all policies
kubectl get networkpolicies.crd.projectcalico.org --all-namespaces -o json \
  | python3 -c "
import sys, json
policies = json.load(sys.stdin)['items']
selectors = set()
for p in policies:
    spec = p.get('spec', {})
    for direction in ['ingress', 'egress']:
        for rule in spec.get(direction, []):
            src = rule.get('source', {})
            dst = rule.get('destination', {})
            for field in [src, dst]:
                ns_sel = field.get('namespaceSelector', '')
                if ns_sel:
                    selectors.add(ns_sel)
for s in sorted(selectors):
    print(f'  Selector: {s}')
"
```

## Testing Selector Matching with Diagnostic Pods

Create test workloads to verify whether traffic is flowing as expected:

```yaml
# diagnostic-pods.yaml
# Deploy test pods in different namespaces to verify policy behavior
apiVersion: v1
kind: Namespace
metadata:
  name: diag-labeled
  labels:
    environment: production
    team: platform
---
apiVersion: v1
kind: Namespace
metadata:
  name: diag-unlabeled
  # Intentionally no custom labels
---
apiVersion: v1
kind: Pod
metadata:
  name: server
  namespace: diag-labeled
  labels:
    app: diag-server
spec:
  containers:
    - name: server
      image: nginx:1.25
      ports:
        - containerPort: 80
---
apiVersion: v1
kind: Pod
metadata:
  name: client-labeled
  namespace: diag-labeled
spec:
  containers:
    - name: client
      image: busybox:1.36
      command: ["sleep", "3600"]
---
apiVersion: v1
kind: Pod
metadata:
  name: client-unlabeled
  namespace: diag-unlabeled
spec:
  containers:
    - name: client
      image: busybox:1.36
      command: ["sleep", "3600"]
```

```bash
# Deploy diagnostic pods
kubectl apply -f diagnostic-pods.yaml
kubectl wait --for=condition=Ready pod/server -n diag-labeled --timeout=60s
kubectl wait --for=condition=Ready pod/client-labeled -n diag-labeled --timeout=60s
kubectl wait --for=condition=Ready pod/client-unlabeled -n diag-unlabeled --timeout=60s

# Get server IP
SERVER_IP=$(kubectl get pod server -n diag-labeled -o jsonpath='{.status.podIP}')

# Test from labeled namespace (should succeed if policy allows environment=production)
echo "From labeled namespace:"
kubectl exec -n diag-labeled client-labeled -- wget -qO- --timeout=5 "http://$SERVER_IP" && echo "ALLOWED" || echo "DENIED"

# Test from unlabeled namespace (may be denied if policy requires labels)
echo "From unlabeled namespace:"
kubectl exec -n diag-unlabeled client-unlabeled -- wget -qO- --timeout=5 "http://$SERVER_IP" && echo "ALLOWED" || echo "DENIED"
```

## Using Calico Policy Audit Tools

Use Felix metrics and logging to see which policies are being evaluated:

```bash
# Enable Felix debug logging temporarily on one node
kubectl exec -n calico-system $(kubectl get pod -n calico-system \
  -l k8s-app=calico-node -o jsonpath='{.items[0].metadata.name}') -- \
  env FELIX_LOGSEVERITYSCREEN=debug sh -c "echo 'Debug logging enabled'"

# Check Felix flow logs for policy evaluation
kubectl logs -n calico-system -l k8s-app=calico-node --tail=100 \
  | grep -i "namespace" | grep -i "selector" | tail -20
```

## Verification

Confirm you have identified all namespace selector mismatches:

```bash
# Generate a report of policy-namespace alignment
echo "=== Namespace Selector Audit Report ==="
echo ""
echo "Namespaces without custom labels:"
kubectl get ns --no-headers -o custom-columns=NAME:.metadata.name,LABELS:.metadata.labels \
  | grep -v "environment\|team\|app"

echo ""
echo "Policies using namespace selectors:"
kubectl get networkpolicies.crd.projectcalico.org --all-namespaces \
  --no-headers -o custom-columns=NS:.metadata.namespace,NAME:.metadata.name

# Cleanup diagnostic resources
kubectl delete namespace diag-labeled diag-unlabeled --wait=false
```

## Troubleshooting

- **All traffic is allowed despite policies**: Calico operates in a default-allow mode unless a policy selects the endpoint. Verify that your policy's `selector` field matches the pods you intend to protect, not just the `namespaceSelector`.
- **Policy appears correct but traffic is still denied**: Check if multiple policies apply to the same pod. Calico evaluates all matching policies, and a deny in any policy takes precedence.
- **Kubernetes NetworkPolicy vs Calico NetworkPolicy confusion**: Standard Kubernetes NetworkPolicies use `matchLabels` under `namespaceSelector`, while Calico uses label selector expressions like `environment == 'production'`. Ensure you are using the correct syntax for the resource type.
- **Namespace labels were added but policy still does not match**: Calico watches for label changes in real time, but Felix may take a few seconds to recalculate. Wait 10-15 seconds and test again.

## Conclusion

Diagnosing namespace selector problems with unlabeled namespaces in Calico requires auditing both your namespace labels and policy selectors, then cross-referencing them to find mismatches. The core diagnostic approach is to list all namespace selectors used in policies, identify namespaces that should match but lack the required labels, and verify with test pods. Making this audit a regular part of your policy review process prevents silent misconfigurations from reaching production.
