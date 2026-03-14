# How to Test Network Policies with Calico on K3s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Network Policy, K3s, Security

Description: Learn how to create and test Kubernetes network policies enforced by Calico on a K3s cluster for edge and IoT environments.

---

## Introduction

K3s deployed at the edge often runs workloads that require strict network isolation. Calico's network policy enforcement on K3s provides the same security controls available on full Kubernetes clusters, making it ideal for edge environments where network segmentation is critical for security compliance.

Testing network policies on K3s validates that Calico correctly enforces isolation rules before deploying to production edge nodes. K3s's lightweight architecture does not change how Calico enforces policies - the iptables or eBPF rules applied by Calico's Felix agent work the same way regardless of the Kubernetes distribution.

This guide demonstrates network policy testing on K3s, covering ingress and egress policies relevant to edge computing scenarios.

## Prerequisites

- K3s with Calico installed and verified
- kubectl configured for K3s
- calicoctl installed

## Step 1: Create Edge Workload Simulation

```bash
kubectl create namespace sensor-data
kubectl create namespace analytics

kubectl run sensor --image=busybox -n sensor-data \
  --labels=app=sensor,tier=edge -- sleep 3600
kubectl run analytics --image=nginx -n analytics \
  --labels=app=analytics,tier=processing --port=8080
kubectl expose pod analytics --port=8080 -n analytics --name=analytics-svc
```

Label namespaces:

```bash
kubectl label namespace sensor-data env=edge
kubectl label namespace analytics env=processing
```

## Step 2: Test Pre-Policy Connectivity

```bash
kubectl exec -n sensor-data sensor -- \
  wget --timeout=5 -qO- http://analytics-svc.analytics.svc.cluster.local:8080
```

## Step 3: Apply Default Deny for Analytics

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: analytics
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
EOF
```

## Step 4: Allow Only Sensor Data Ingress

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-sensor-ingress
  namespace: analytics
spec:
  podSelector:
    matchLabels:
      app: analytics
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          env: edge
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to: []
    ports:
    - protocol: UDP
      port: 53
EOF
```

## Step 5: Verify Allow Policy

```bash
kubectl exec -n sensor-data sensor -- \
  wget -qO- http://analytics-svc.analytics.svc.cluster.local:8080
```

## Step 6: Test Calico GlobalNetworkPolicy for K3s Edge

Apply a cluster-wide policy using Calico's extended API:

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: deny-metadata-access
spec:
  selector: all()
  types:
  - Egress
  egress:
  - action: Deny
    destination:
      nets:
      - 169.254.169.254/32
EOF
```

## Step 7: Verify Metadata Endpoint Is Blocked

```bash
kubectl exec -n sensor-data sensor -- \
  wget --timeout=3 -qO- http://169.254.169.254/
```

Should be denied.

## Conclusion

You have tested Calico network policies on K3s, including namespace-scoped ingress/egress policies and a Calico GlobalNetworkPolicy that blocks access to cloud metadata endpoints. Calico enforces these rules consistently on K3s, providing robust edge security without requiring a full Kubernetes distribution.
