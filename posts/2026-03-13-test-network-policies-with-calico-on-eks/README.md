# How to Test Network Policies with Calico on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Network Policy, EKS, AWS, Security

Description: Test and validate Kubernetes network policies enforced by Calico on Amazon EKS clusters.

---

## Introduction

EKS with Calico supports full Kubernetes NetworkPolicy and Calico GlobalNetworkPolicy enforcement. AWS environments introduce unique networking considerations — security groups, VPC flow logs, and AWS-specific egress paths — that interact with Calico policy enforcement. Testing network policies on EKS validates that Calico correctly enforces isolation between workloads running in the same VPC.

On EKS, pod-to-pod traffic within a node is handled at the Linux level by the VPC CNI, while Calico Felix enforces policies using iptables or eBPF. Pod-to-pod traffic between nodes traverses the VPC routing infrastructure. Testing must cover both intra-node and cross-node policy scenarios to ensure comprehensive coverage.

## Prerequisites

- EKS cluster with Calico installed
- kubectl configured for EKS
- calicoctl installed
- Multiple nodes for cross-node tests

## Step 1: Set Up Multi-Namespace Test Environment

```bash
kubectl create namespace eks-test-app
kubectl create namespace eks-test-db
kubectl label namespace eks-test-app tier=app
kubectl label namespace eks-test-db tier=db

kubectl run app-client --image=busybox -n eks-test-app \
  --labels=role=client -- sleep 3600
kubectl run db-server --image=nginx -n eks-test-db \
  --labels=role=server --port=80
kubectl expose pod db-server --port=80 -n eks-test-db --name=db-svc
```

## Step 2: Test Pre-Policy Connectivity

```bash
kubectl exec -n eks-test-app app-client -- \
  wget --timeout=5 -qO- http://db-svc.eks-test-db.svc.cluster.local
```

## Step 3: Apply Default Deny

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: eks-test-db
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
EOF
```

## Step 4: Allow DNS Egress for DB

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: eks-test-db
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

## Step 5: Verify Deny is Enforced

```bash
kubectl exec -n eks-test-app app-client -- \
  wget --timeout=5 -qO- http://db-svc.eks-test-db.svc.cluster.local
```

Should time out.

## Step 6: Allow App Tier Access

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-app-ingress
  namespace: eks-test-db
spec:
  podSelector:
    matchLabels:
      role: server
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          tier: app
    ports:
    - protocol: TCP
      port: 80
EOF
```

## Step 7: Verify Allow Policy

```bash
kubectl exec -n eks-test-app app-client -- \
  wget -qO- http://db-svc.eks-test-db.svc.cluster.local
```

Should succeed.

## Step 8: Test Cross-Node Policy (if multi-node)

Schedule pods on specific nodes and verify cross-node policy enforcement:

```bash
NODE1=$(kubectl get nodes -o name | head -1 | cut -d/ -f2)
NODE2=$(kubectl get nodes -o name | sed -n '2p' | cut -d/ -f2)

kubectl run cross-node-client --image=busybox -n eks-test-app \
  --labels=role=client \
  --overrides="{\"spec\":{\"nodeName\":\"$NODE1\"}}" -- sleep 3600

kubectl run cross-node-server --image=nginx -n eks-test-db \
  --labels=role=server --port=80 \
  --overrides="{\"spec\":{\"nodeName\":\"$NODE2\"}}"

CROSS_SERVER_IP=$(kubectl get pod cross-node-server -n eks-test-db -o jsonpath='{.status.podIP}')
kubectl exec -n eks-test-app cross-node-client -- wget -qO- http://$CROSS_SERVER_IP
```

## Conclusion

You have tested Calico network policies on EKS, confirming default deny, DNS allow, and selective ingress allow policies across both same-node and cross-node scenarios. Calico correctly enforces policies within EKS's VPC networking model, providing the same security guarantees as on self-managed Kubernetes.
