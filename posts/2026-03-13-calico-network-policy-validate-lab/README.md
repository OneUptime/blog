# How to Validate Network Policy Fundamentals in Calico in a Lab Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, CNI, Lab, Testing, Validation, Calicoctl

Description: A systematic test suite for validating Calico network policy behavior including rule ordering, selector matching, and GlobalNetworkPolicy enforcement in a lab cluster.

---

## Introduction

Validating network policy fundamentals requires testing the core behaviors that everything else depends on: deny-all enforcement, selector matching accuracy, rule evaluation order, and GlobalNetworkPolicy scope. If these fundamentals work correctly, all more complex policies built on them will also work correctly.

This test suite validates each fundamental behavior with explicit test cases and expected outcomes. Run it after any Calico installation, upgrade, or configuration change.

## Prerequisites

- A Calico lab cluster
- `kubectl` and `calicoctl` configured
- Test pods with distinct labels for allow/deny testing
- `nicolaka/netshoot` image for connectivity testing

## Test Setup

```bash
# Deploy pods with distinct labels
kubectl run pod-alpha --image=nginx --labels="role=alpha,tier=web"
kubectl run pod-beta --image=nicolaka/netshoot \
  --labels="role=beta,tier=web" -- sleep 3600
kubectl run pod-gamma --image=nicolaka/netshoot \
  --labels="role=gamma,tier=data" -- sleep 3600

ALPHA_IP=$(kubectl get pod pod-alpha -o jsonpath='{.status.podIP}')
```

## Test 1: No Policy - Default Allow

Confirm that without any policy, all pods can communicate:

```bash
kubectl exec pod-beta -- wget -qO- http://$ALPHA_IP
# Expected: nginx HTML (allowed by default)

kubectl exec pod-gamma -- wget -qO- http://$ALPHA_IP
# Expected: nginx HTML (allowed by default)
```

## Test 2: Kubernetes NetworkPolicy Deny-All

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-alpha
spec:
  podSelector:
    matchLabels:
      role: alpha
  policyTypes:
  - Ingress
  ingress: []
EOF

kubectl exec pod-beta -- wget --timeout=5 -qO- http://$ALPHA_IP
# Expected: timeout

kubectl exec pod-gamma -- wget --timeout=5 -qO- http://$ALPHA_IP
# Expected: timeout
```

## Test 3: Selector-Based Allow (Only Matching Pods)

```bash
kubectl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-beta-only
  namespace: default
spec:
  selector: role == 'alpha'
  ingress:
  - action: Allow
    source:
      selector: role == 'beta'
  - action: Deny
EOF

kubectl exec pod-beta -- wget --timeout=10 -qO- http://$ALPHA_IP
# Expected: success (beta matches selector)

kubectl exec pod-gamma -- wget --timeout=5 -qO- http://$ALPHA_IP
# Expected: timeout (gamma does not match selector)
```

## Test 4: Rule Ordering Verification

Create a policy with multiple rules and verify the first matching rule wins:

```bash
kubectl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: ordered-rules-test
  namespace: default
spec:
  selector: role == 'alpha'
  ingress:
  - action: Deny
    source:
      selector: tier == 'web'  # Denies both beta and gamma (tier=web)
  - action: Allow
    source:
      selector: role == 'beta'  # This comes after deny - should NOT override
  - action: Deny
EOF

kubectl exec pod-beta -- wget --timeout=5 -qO- http://$ALPHA_IP
# Expected: timeout - first matching rule is Deny (beta has tier=web)
```

This test validates that earlier rules take precedence over later rules.

## Test 5: GlobalNetworkPolicy Scope

```bash
# Create a second namespace
kubectl create namespace ns-external
kubectl run external-pod -n ns-external --image=nicolaka/netshoot \
  --labels="role=external" -- sleep 3600

# Apply GlobalNetworkPolicy
kubectl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: block-external-ns
spec:
  order: 100
  selector: role == 'alpha'
  ingress:
  - action: Deny
    source:
      namespaceSelector: kubernetes.io/metadata.name == 'ns-external'
  - action: Pass
EOF

kubectl exec -n ns-external external-pod -- wget --timeout=5 -qO- http://$ALPHA_IP
# Expected: timeout (blocked by GlobalNetworkPolicy)
```

## Test 6: Union Semantics (Multiple Policies, Same Pod)

Verify that if two policies select the same pod, allow from either policy is sufficient:

```bash
# Policy A: allows gamma
# Policy B: allows beta (already applied above)
kubectl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-gamma-too
  namespace: default
spec:
  selector: role == 'alpha'
  ingress:
  - action: Allow
    source:
      selector: role == 'gamma'
EOF

kubectl exec pod-gamma -- wget --timeout=10 -qO- http://$ALPHA_IP
# Expected: success (gamma allowed by this new policy - union semantics)
```

## Validation Summary

| Test | Expected |
|---|---|
| No policy | All pods connect |
| Deny-all applied | All blocked |
| Allow selector | Only matching pods connect |
| Rule ordering | First matching rule wins |
| GlobalNetworkPolicy | Applies across namespaces |
| Union semantics | Allow from any matching policy |

## Best Practices

- Run all six tests in sequence, cleaning up between tests, to avoid policy interactions
- Use `calicoctl get networkpolicy --all-namespaces` to audit active policies between tests
- Automate these tests as part of your CI/CD pipeline for post-deploy validation

## Conclusion

Validating network policy fundamentals ensures that the core behaviors Calico relies on - deny-all enforcement, selector matching, rule ordering, GlobalNetworkPolicy scope, and union semantics - all work correctly in your specific cluster and Calico version. These tests are the foundation for validating any more complex policy configuration.
