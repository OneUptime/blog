# How to Test Network Policies with Calico with Helm

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Network Policy, Helm, Security

Description: Test and validate Kubernetes network policies with Calico installed via Helm and the Tigera Operator.

---

## Introduction

Calico installed via Helm with the Tigera Operator supports the full set of Kubernetes NetworkPolicy and Calico GlobalNetworkPolicy resources. Network policy testing after a Helm-based installation follows the same approach as other installation methods, with the added benefit that the Tigera Operator provides health status monitoring for the policy enforcement layer.

Testing network policies after a Helm installation also provides an opportunity to validate that the Tigera Operator correctly reconciles policy-affecting configuration changes. When you modify the Installation CR to change encapsulation or CIDR, the Operator should update the underlying Calico components and maintain policy enforcement throughout the transition.

This guide demonstrates network policy testing on a Calico Helm installation, covering standard NetworkPolicy and Calico GlobalNetworkPolicy scenarios.

## Prerequisites

- Calico installed via Helm with Tigera Operator
- kubectl and calicoctl configured
- All pods in `calico-system` running

## Step 1: Create Test Namespaces and Pods

```bash
kubectl create namespace app-frontend
kubectl create namespace app-backend
kubectl label namespace app-frontend tier=frontend
kubectl label namespace app-backend tier=backend

kubectl run frontend --image=busybox -n app-frontend \
  --labels=app=frontend -- sleep 3600
kubectl run backend --image=nginx -n app-backend \
  --labels=app=backend --port=80
kubectl expose pod backend --port=80 -n app-backend --name=backend-api
```

## Step 2: Verify Pre-Policy Connectivity

```bash
kubectl exec -n app-frontend frontend -- \
  wget --timeout=5 -qO- http://backend-api.app-backend.svc.cluster.local
```

Should succeed before policies are applied.

## Step 3: Apply Default Deny Using GlobalNetworkPolicy

Using Calico's Helm-installed API:

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: default-deny
spec:
  selector: "projectcalico.org/namespace not in {'kube-system', 'calico-system', 'tigera-operator'}"
  types:
  - Ingress
  - Egress
  egress:
  - action: Allow
    protocol: UDP
    destination:
      ports: [53]
EOF
```

## Step 4: Verify Connectivity Is Blocked

```bash
kubectl exec -n app-frontend frontend -- \
  wget --timeout=5 -qO- http://backend-api.app-backend.svc.cluster.local
```

Should time out.

## Step 5: Apply Allow Policy

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend
  namespace: app-backend
spec:
  podSelector:
    matchLabels:
      app: backend
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          tier: frontend
    ports:
    - protocol: TCP
      port: 80
EOF
```

## Step 6: Verify Allow Policy Works

```bash
kubectl exec -n app-frontend frontend -- \
  wget -qO- http://backend-api.app-backend.svc.cluster.local
```

Should succeed.

## Step 7: Check Tigera Status After Policy Changes

```bash
kubectl get tigerastatus
```

Policy components should remain `Available: True` after applying policies.

## Conclusion

You have tested Calico network policies on a Helm-based installation, using both Kubernetes NetworkPolicy and Calico GlobalNetworkPolicy resources. The Tigera Operator maintained policy enforcement throughout the test, and the `tigerastatus` monitoring confirmed that the policy enforcement layer remained healthy during all changes.
