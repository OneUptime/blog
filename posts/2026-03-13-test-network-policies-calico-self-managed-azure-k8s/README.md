# How to Test Network Policies with Calico on Self-Managed Azure Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Network Policy, Azure, Self-Managed, Security

Description: Test and validate Kubernetes network policies enforced by Calico on self-managed Kubernetes clusters running on Azure VMs.

---

## Introduction

Self-managed Kubernetes on Azure Virtual Machines runs Calico as a full CNI - unlike AKS where Calico operates in policy-only mode. This gives you access to Calico's complete feature set including IPAM, BGP routing, VXLAN encapsulation, and GlobalNetworkPolicy resources on Azure infrastructure.

Azure networking requires VXLAN encapsulation for Calico pod-to-pod traffic in most configurations, since IPIP (protocol 4) may be blocked by Azure NSG rules. The VXLAN mode (UDP port 4789) is more reliably allowed through Azure's default NSG configurations. Testing network policies on self-managed Azure Kubernetes validates both the Calico policy enforcement layer and the Azure networking layer underneath.

## Prerequisites

- Self-managed Kubernetes on Azure VMs
- Calico installed with VXLAN mode
- kubectl and calicoctl configured

## Step 1: Verify Cluster and Calico Health

```bash
kubectl get nodes -o wide
calicoctl node status
calicoctl get ippool -o yaml | grep -E "ipipMode|vxlanMode"
```

Confirm VXLAN mode is configured for Azure compatibility.

## Step 2: Create Test Environment

```bash
kubectl create namespace azure-policy-test

kubectl run frontend --image=busybox -n azure-policy-test \
  --labels=tier=web -- sleep 3600
kubectl run backend --image=nginx -n azure-policy-test \
  --labels=tier=api --port=80
kubectl expose pod backend --port=80 -n azure-policy-test --name=backend-api

kubectl run intruder --image=busybox -n azure-policy-test \
  --labels=tier=unknown -- sleep 3600
```

## Step 3: Test Pre-Policy Connectivity

```bash
kubectl exec -n azure-policy-test frontend -- \
  wget --timeout=5 -qO- http://backend-api

kubectl exec -n azure-policy-test intruder -- \
  wget --timeout=5 -qO- http://backend-api
```

Both should succeed before policies are applied.

## Step 4: Apply Default Deny Policy

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: azure-policy-test
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
EOF
```

## Step 5: Allow DNS Egress

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: azure-policy-test
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - ports:
    - protocol: UDP
      port: 53
EOF
```

## Step 6: Allow Web Tier to API Tier

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-web-to-api
  namespace: azure-policy-test
spec:
  podSelector:
    matchLabels:
      tier: api
  ingress:
  - from:
    - podSelector:
        matchLabels:
          tier: web
    ports:
    - protocol: TCP
      port: 80
EOF

kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: web-egress-to-api
  namespace: azure-policy-test
spec:
  podSelector:
    matchLabels:
      tier: web
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          tier: api
    ports:
    - protocol: TCP
      port: 80
  - ports:
    - protocol: UDP
      port: 53
EOF
```

## Step 7: Verify Policy Enforcement

```bash
# Web frontend should reach backend
kubectl exec -n azure-policy-test frontend -- wget -qO- http://backend-api

# Intruder should be blocked
kubectl exec -n azure-policy-test intruder -- \
  wget --timeout=5 -qO- http://backend-api
```

## Step 8: Test Cross-VM Network Policy (Multi-Node)

For multi-VM Azure deployments, test cross-VM policy enforcement:

```bash
NODE1=$(kubectl get nodes -o name | head -1 | cut -d/ -f2)
NODE2=$(kubectl get nodes -o name | sed -n '2p' | cut -d/ -f2)

kubectl run cross-vm-client --image=busybox -n azure-policy-test \
  --labels=tier=web \
  --overrides="{\"spec\":{\"nodeName\":\"$NODE1\"}}" -- sleep 3600

kubectl run cross-vm-server --image=nginx -n azure-policy-test \
  --labels=tier=api --port=80 \
  --overrides="{\"spec\":{\"nodeName\":\"$NODE2\"}}"

CROSS_SERVER_IP=$(kubectl get pod cross-vm-server -n azure-policy-test \
  -o jsonpath='{.status.podIP}')
kubectl exec -n azure-policy-test cross-vm-client -- wget -qO- http://$CROSS_SERVER_IP
```

## Conclusion

You have tested Calico network policies on self-managed Azure Kubernetes, validating that policy enforcement works correctly with VXLAN encapsulation on Azure VMs. Cross-VM network policy testing confirms that Calico correctly filters traffic even when it traverses Azure's networking infrastructure between virtual machines in the same VNet.
