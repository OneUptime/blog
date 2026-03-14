# How to Validate Kubernetes Ingress with Calico in a Lab Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Ingress, CNI, Lab, Testing, Validation, Network Policy

Description: A systematic validation suite for testing Calico ingress network policy behavior in a lab cluster, including deny-all enforcement and allow rule verification.

---

## Introduction

Validating ingress policy requires testing both the allow and deny cases. A policy that appears to work because connectivity succeeded may still be misconfigured — it might be allowing too much traffic. Systematic validation requires explicitly testing both intended-allow and intended-deny traffic paths.

This guide provides a complete ingress validation suite for Calico, organized by policy complexity. Run these tests after any policy change in a lab cluster before applying to production.

## Prerequisites

- A Calico lab cluster
- Three test pods: a client pod, an allowed-source pod, and a denied-source pod
- `kubectl` and `calicoctl` access

## Setup: Deploy Test Infrastructure

```bash
# Deploy the target pod
kubectl run target --image=nginx --labels="app=target"
kubectl expose pod target --port=80

# Deploy an allowed source pod
kubectl run allowed-client --image=nicolaka/netshoot \
  --labels="app=allowed-client" -- sleep 3600

# Deploy a denied source pod
kubectl run denied-client --image=nicolaka/netshoot \
  --labels="app=denied-client" -- sleep 3600
```

## Validation 1: Baseline (No Policy) — All Ingress Allowed

Confirm all pods can reach the target before any policy is applied:

```bash
TARGET_IP=$(kubectl get pod target -o jsonpath='{.status.podIP}')

kubectl exec allowed-client -- wget -qO- http://$TARGET_IP
# Expected: nginx HTML page

kubectl exec denied-client -- wget -qO- http://$TARGET_IP
# Expected: nginx HTML page (both allowed before policy)
```

## Validation 2: Apply Deny-All Ingress Policy

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: target
  policyTypes:
  - Ingress
  ingress: []
EOF

kubectl exec allowed-client -- wget --timeout=5 -qO- http://$TARGET_IP
# Expected: timeout

kubectl exec denied-client -- wget --timeout=5 -qO- http://$TARGET_IP
# Expected: timeout
```

## Validation 3: Allow Specific Source

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-allowed-client
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: target
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: allowed-client
    ports:
    - port: 80
      protocol: TCP
EOF

kubectl exec allowed-client -- wget --timeout=10 -qO- http://$TARGET_IP
# Expected: nginx HTML page (now allowed)

kubectl exec denied-client -- wget --timeout=5 -qO- http://$TARGET_IP
# Expected: timeout (still denied)
```

## Validation 4: Calico NetworkPolicy with Explicit Deny

Test that Calico's explicit `Deny` action works and applies in the correct order:

```bash
kubectl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: calico-ingress-policy
  namespace: default
spec:
  selector: app == 'target'
  ingress:
  - action: Allow
    source:
      selector: app == 'allowed-client'
    destination:
      ports:
      - 80
  - action: Deny
EOF

# Verify Calico policy is created
calicoctl get networkpolicy calico-ingress-policy -n default

kubectl exec allowed-client -- wget --timeout=10 -qO- http://$TARGET_IP
# Expected: success

kubectl exec denied-client -- wget --timeout=5 -qO- http://$TARGET_IP
# Expected: timeout (explicit Deny action)
```

## Validation 5: Cross-Namespace Ingress

Test that cross-namespace source selectors work correctly:

```bash
kubectl create namespace external-ns
kubectl run external-client -n external-ns --image=nicolaka/netshoot \
  --labels="app=external-client" -- sleep 3600

kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-external-ns
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: target
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: external-ns
      podSelector:
        matchLabels:
          app: external-client
EOF

kubectl exec -n external-ns external-client -- wget --timeout=10 -qO- http://$TARGET_IP
# Expected: success
```

## Validation Checklist

| Test | Expected Result |
|---|---|
| No policy — both clients connect | Success |
| Deny-all policy — both clients blocked | Timeout |
| Allow specific source — only allowed-client succeeds | Asymmetric |
| Calico NetworkPolicy explicit deny | Allowed passes, denied times out |
| Cross-namespace allow | External-ns client succeeds |

## Best Practices

- Always test both the allow and deny cases — a passing allow test does not confirm the deny is working
- Clean up test policies after validation to avoid interference with other tests
- Document the expected result for each test before running — confirms your policy intent before testing implementation

## Conclusion

Ingress validation requires deliberate testing of both sides of every policy rule. The five-test sequence above confirms that deny-all enforcement works, explicit allow rules select the correct sources, and cross-namespace rules behave as expected. Running this suite after any policy change gives you confidence that the policy is both correct and correctly enforced.
