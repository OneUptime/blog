# How to Test Network Policies with Calico on Self-Managed Google Compute Engine Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Network Policy, GCE, Google Cloud, Self-Managed, Security

Description: Test and validate Kubernetes network policies enforced by Calico on self-managed Kubernetes clusters running on Google Compute Engine.

---

## Introduction

Self-managed Kubernetes on Google Compute Engine (GCE) runs Calico as a full CNI with access to all Calico features — unlike GKE where Calico operates in policy-only mode. GCE's networking infrastructure is VPC-based, and Calico can use IPIP encapsulation across GCE instances in different subnets, or route traffic directly using GCE routes for pod CIDRs.

Testing network policies on self-managed GCE Kubernetes validates the complete Calico policy stack. GCE's firewall rules and VPC networking coexist with Calico's iptables rules, providing defense-in-depth security. Testing confirms that Calico policies are enforced independently of GCE firewall rules, preventing lateral movement between pods even within the same VPC.

## Prerequisites

- Self-managed Kubernetes on GCE instances
- Calico installed as full CNI
- kubectl and calicoctl configured
- gcloud CLI for GCE-specific diagnostics

## Step 1: Verify GCE Network Configuration

```bash
# Check GCE instance networking
gcloud compute instances list --format="table(name,networkInterfaces[0].networkIP,zone)"
kubectl get nodes -o wide
calicoctl node status
```

## Step 2: Create Test Namespaces and Pods

```bash
kubectl create namespace gce-policy-test

kubectl run gce-client --image=busybox -n gce-policy-test \
  --labels=app=client -- sleep 3600
kubectl run gce-server --image=nginx -n gce-policy-test \
  --labels=app=server --port=80
kubectl expose pod gce-server --port=80 -n gce-policy-test --name=gce-server-svc

kubectl run gce-untrusted --image=busybox -n gce-policy-test \
  --labels=app=untrusted -- sleep 3600
```

## Step 3: Verify Pre-Policy Connectivity

```bash
kubectl exec -n gce-policy-test gce-client -- \
  wget --timeout=5 -qO- http://gce-server-svc
kubectl exec -n gce-policy-test gce-untrusted -- \
  wget --timeout=5 -qO- http://gce-server-svc
```

Both should succeed.

## Step 4: Apply Calico GlobalNetworkPolicy Default Deny

Leverage Calico's extended API for cluster-wide control:

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: gce-global-deny
spec:
  namespaceSelector: "kubernetes.io/metadata.name == 'gce-policy-test'"
  types:
  - Ingress
  - Egress
  egress:
  - action: Allow
    protocol: UDP
    destination:
      ports: [53]
  - action: Allow
    protocol: TCP
    destination:
      ports: [53]
EOF
```

## Step 5: Verify GlobalNetworkPolicy is Enforced

```bash
kubectl exec -n gce-policy-test gce-client -- \
  wget --timeout=5 -qO- http://gce-server-svc
```

Should time out.

## Step 6: Allow Client to Server with NetworkPolicy

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-client-to-server
  namespace: gce-policy-test
spec:
  podSelector:
    matchLabels:
      app: server
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: client
    ports:
    - protocol: TCP
      port: 80
EOF

kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: client-egress
  namespace: gce-policy-test
spec:
  podSelector:
    matchLabels:
      app: client
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: server
    ports:
    - protocol: TCP
      port: 80
  - ports:
    - protocol: UDP
      port: 53
EOF
```

## Step 7: Verify Policies

```bash
# Client should succeed
kubectl exec -n gce-policy-test gce-client -- wget -qO- http://gce-server-svc

# Untrusted should remain blocked
kubectl exec -n gce-policy-test gce-untrusted -- \
  wget --timeout=5 -qO- http://gce-server-svc
```

## Step 8: Test Cross-Zone GCE Policy

Create pods in different GCE zones and verify cross-zone policy enforcement:

```bash
ZONE_A_NODE=$(kubectl get nodes -l topology.kubernetes.io/zone=us-central1-a -o name | head -1 | cut -d/ -f2)
ZONE_B_NODE=$(kubectl get nodes -l topology.kubernetes.io/zone=us-central1-b -o name | head -1 | cut -d/ -f2)
```

## Conclusion

You have tested Calico network policies on self-managed GCE Kubernetes, using both Calico GlobalNetworkPolicy for namespace-level defaults and Kubernetes NetworkPolicy for pod-level controls. Self-managed GCE gives you the full Calico feature set, and cross-zone policy testing confirms that Calico correctly enforces isolation across GCE's multi-zone VPC networking infrastructure.
