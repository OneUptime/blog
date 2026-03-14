# How to Test Network Policies with Calico on Rancher

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Network Policy, Rancher, Security

Description: Test and validate Kubernetes network policies enforced by Calico on Rancher-managed clusters.

---

## Introduction

Rancher-managed clusters with Calico support the full Kubernetes NetworkPolicy specification and Calico's GlobalNetworkPolicy extension. Testing network policies on Rancher clusters is important for enterprise deployments where multi-tenant workloads require strict network isolation enforced at the platform level.

Rancher's project and namespace isolation features complement Calico's network policies, creating a layered security model. Calico enforces network-level isolation while Rancher enforces administrative separation. Testing both together ensures that the combined security model works as intended.

This guide demonstrates network policy testing on a Rancher-managed cluster with Calico, covering tenant isolation, cross-project communication policies, and Calico GlobalNetworkPolicy for cluster-wide controls.

## Prerequisites

- Rancher-managed cluster with Calico
- kubectl with cluster kubeconfig from Rancher
- calicoctl configured
- At least 2 nodes for cross-node policy testing

## Step 1: Create Rancher Projects and Namespaces

In Rancher UI:
1. Create two projects: **Project-A** and **Project-B**
2. Within each project, create a namespace: `ns-a` and `ns-b`

Or via kubectl:

```bash
kubectl create namespace ns-a
kubectl create namespace ns-b
kubectl label namespace ns-a project=a
kubectl label namespace ns-b project=b
```

## Step 2: Deploy Workloads

```bash
kubectl run workload-a --image=busybox -n ns-a --labels=app=client -- sleep 3600
kubectl run workload-b --image=nginx -n ns-b --labels=app=server --port=80
kubectl expose pod workload-b --port=80 -n ns-b --name=server-svc
```

## Step 3: Verify Pre-Policy Connectivity

```bash
kubectl exec -n ns-a workload-a -- \
  wget --timeout=5 -qO- http://server-svc.ns-b.svc.cluster.local
```

## Step 4: Apply Project Isolation Policy

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: isolate-project-b
  namespace: ns-b
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          project: b
EOF
```

## Step 5: Verify Isolation

```bash
kubectl exec -n ns-a workload-a -- \
  wget --timeout=5 -qO- http://server-svc.ns-b.svc.cluster.local
```

Should be denied.

## Step 6: Apply Cross-Project Allow Policy

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-project-a
  namespace: ns-b
spec:
  podSelector:
    matchLabels:
      app: server
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          project: a
    ports:
    - protocol: TCP
      port: 80
EOF
```

## Step 7: Verify Selective Allow

```bash
kubectl exec -n ns-a workload-a -- \
  wget -qO- http://server-svc.ns-b.svc.cluster.local
```

Should succeed now.

## Step 8: Apply Calico GlobalNetworkPolicy

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: rancher-deny-node-exporter
spec:
  selector: all()
  types:
  - Ingress
  ingress:
  - action: Deny
    destination:
      ports: [9100]
EOF
```

## Conclusion

You have tested Calico network policy enforcement on a Rancher-managed cluster, validating namespace isolation, cross-project policies, and cluster-wide controls via Calico GlobalNetworkPolicy. Rancher with Calico provides a robust multi-tenant security model combining administrative and network-level isolation.
