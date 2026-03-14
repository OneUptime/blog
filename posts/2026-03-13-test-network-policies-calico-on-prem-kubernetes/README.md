# How to Test Network Policies with Calico on On-Prem Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, On-Premise, Network Policies

Description: A practical guide to testing Kubernetes and Calico network policies on an on-premises cluster to validate that traffic isolation is working as intended.

---

## Introduction

Network policies on on-premises Kubernetes clusters are your primary tool for enforcing zero-trust networking between workloads. Calico implements both the standard Kubernetes NetworkPolicy API and its own richer GlobalNetworkPolicy and NetworkPolicy CRDs, which support egress rules, CIDR-based selectors, and ordering. Testing these policies thoroughly before production deployment prevents security gaps.

On-prem clusters often have stricter security requirements than cloud deployments, making policy validation even more important. The physical network may already enforce some isolation, but relying solely on physical network controls leaves the pod-to-pod layer unprotected. Calico policies close this gap.

This guide provides a structured workflow for testing network policies on an on-prem Calico cluster.

## Prerequisites

- Calico running on an on-prem Kubernetes cluster
- `kubectl` and `calicoctl` installed
- Basic understanding of Calico policy resources

## Step 1: Create a Test Namespace

```bash
kubectl create namespace policy-demo
```

## Step 2: Deploy Server and Clients

```bash
kubectl run server --image=nginx --labels="role=server" -n policy-demo
kubectl expose pod server --port=80 -n policy-demo
kubectl run client-a --image=busybox --labels="role=client-a" -n policy-demo -- sleep 3600
kubectl run client-b --image=busybox --labels="role=client-b" -n policy-demo -- sleep 3600
```

## Step 3: Verify Default Allow (No Policy)

Without any policy, all pods can communicate.

```bash
kubectl exec -n policy-demo client-a -- wget -qO- --timeout=5 http://server
kubectl exec -n policy-demo client-b -- wget -qO- --timeout=5 http://server
```

Both should succeed.

## Step 4: Apply a Default Deny Policy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: policy-demo
spec:
  podSelector: {}
  policyTypes:
    - Ingress
```

```bash
kubectl apply -f default-deny.yaml
```

Both clients should now be blocked.

## Step 5: Apply a Targeted Allow Policy

Allow only client-a to reach the server.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-client-a
  namespace: policy-demo
spec:
  podSelector:
    matchLabels:
      role: server
  ingress:
    - from:
        - podSelector:
            matchLabels:
              role: client-a
```

```bash
kubectl apply -f allow-client-a.yaml
kubectl exec -n policy-demo client-a -- wget -qO- --timeout=5 http://server
kubectl exec -n policy-demo client-b -- wget -qO- --timeout=5 http://server || echo "Blocked as expected"
```

## Step 6: Test Calico GlobalNetworkPolicy

Test a Calico-specific policy that applies across namespaces.

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: deny-all-egress
spec:
  selector: all()
  egress: []
  types:
    - Egress
```

```bash
calicoctl apply -f global-deny-egress.yaml
kubectl exec -n policy-demo client-a -- wget -qO- --timeout=5 http://example.com || echo "Egress blocked"
calicoctl delete globalnetworkpolicy deny-all-egress
```

## Conclusion

Testing network policies on on-prem Calico clusters requires a systematic approach: establish a baseline with no policies, apply default deny, then selectively allow traffic and verify each direction. Testing Calico's GlobalNetworkPolicy CRD alongside standard Kubernetes NetworkPolicy resources gives you full confidence in your isolation model before production traffic flows.
