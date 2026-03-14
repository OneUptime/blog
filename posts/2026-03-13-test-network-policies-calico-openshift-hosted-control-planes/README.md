# How to Test Network Policies with Calico on OpenShift Hosted Control Planes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Hosted Control Planes, Kubernetes, Networking, Network Policies

Description: A guide to testing Calico and Kubernetes network policies on OpenShift Hosted Control Plane clusters.

---

## Introduction

Network policy testing on OpenShift Hosted Control Planes follows the same process as standard OpenShift, but with an important consideration: policies must not accidentally block the hosted cluster's connection to its remote API server. Because the API server runs in the management cluster, egress policies that restrict pod-to-API-server traffic can break all Kubernetes control plane operations.

When applying egress policies in HCP environments, always include an explicit allow for the Kubernetes API server IP range. This is the most common source of policy misconfiguration in Hosted Control Plane environments.

This guide covers network policy testing on OpenShift Hosted Control Planes.

## Prerequisites

- Calico running on an OpenShift Hosted Control Plane cluster
- `kubectl` configured with the hosted cluster kubeconfig
- `calicoctl` installed

## Step 1: Identify the Hosted Cluster API Server IP

```bash
# Get the API server endpoint
kubectl cluster-info | grep "Kubernetes control plane"
# Note the IP/hostname for use in egress policies
```

## Step 2: Deploy Test Workloads

```bash
kubectl create namespace hcp-policy-test
kubectl run server --image=nginx --labels="tier=server" -n hcp-policy-test
kubectl expose pod server --port=80 -n hcp-policy-test
kubectl run allowed-client --image=busybox --labels="tier=client" -n hcp-policy-test -- sleep 3600
kubectl run blocked-client --image=busybox --labels="tier=other" -n hcp-policy-test -- sleep 3600
```

## Step 3: Apply Ingress Policy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-specific-client
  namespace: hcp-policy-test
spec:
  podSelector:
    matchLabels:
      tier: server
  ingress:
    - from:
        - podSelector:
            matchLabels:
              tier: client
  policyTypes:
    - Ingress
```

```bash
kubectl apply -f allow-specific.yaml
```

## Step 4: Test Ingress Policy

```bash
kubectl exec -n hcp-policy-test allowed-client -- wget -qO- --timeout=5 http://server
kubectl exec -n hcp-policy-test blocked-client -- wget -qO- --timeout=5 http://server || echo "Blocked"
```

## Step 5: Test Egress Policy (API-Safe)

Apply an egress policy that allows the API server.

```yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: restrict-egress-hcp
  namespace: hcp-policy-test
spec:
  selector: tier == 'client'
  egress:
    - action: Allow
      destination:
        nets:
          - 10.132.0.0/14    # Pod CIDR
    - action: Allow
      destination:
        ports: [443, 6443]   # API server
  types:
    - Egress
```

```bash
calicoctl apply -f restrict-egress-hcp.yaml
# Verify API server is still reachable from the client pod
kubectl exec -n hcp-policy-test allowed-client -- wget -qO- --timeout=5 \
  https://kubernetes.default.svc.cluster.local --no-check-certificate
```

## Step 6: Clean Up

```bash
kubectl delete namespace hcp-policy-test
```

## Conclusion

Testing network policies on OpenShift Hosted Control Planes requires the same steps as standard OpenShift testing, with the critical addition of ensuring egress policies do not block the hosted cluster's connection to its remote API server. Always include explicit egress allows for port 6443 and the API server's IP when applying egress restrictions in HCP environments.
