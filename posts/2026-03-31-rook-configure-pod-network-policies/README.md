# How to Configure Pod Network Policies for Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Network Policy, Security, Kubernetes, Networking

Description: Implement Kubernetes NetworkPolicy rules to secure Rook-Ceph pods by restricting ingress and egress traffic to only required communication paths.

---

## Overview

Kubernetes NetworkPolicies restrict traffic to and from pods. For Rook-Ceph, correctly configuring NetworkPolicies is essential to maintain security without breaking cluster communication. By default, all traffic is allowed - policies add restrictions.

## Understanding Ceph Network Requirements

Ceph components communicate on specific ports:
- Monitors: TCP 6789 (legacy), TCP 3300 (v2)
- OSDs: TCP 6800-7300 (data)
- MGR: TCP 6800, 9283 (Prometheus)
- RGW: TCP 80, 443, 7480
- Dashboard: TCP 8443

## Step 1: Allow Monitor Traffic

Create a NetworkPolicy allowing monitor communication:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ceph-mon
  namespace: rook-ceph
spec:
  podSelector:
    matchLabels:
      app: rook-ceph-mon
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: rook-ceph
    ports:
    - protocol: TCP
      port: 6789
    - protocol: TCP
      port: 3300
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: rook-ceph
```

## Step 2: Allow OSD Traffic

OSDs need to communicate with monitors and other OSDs:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ceph-osd
  namespace: rook-ceph
spec:
  podSelector:
    matchLabels:
      app: rook-ceph-osd
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: rook-ceph
    ports:
    - protocol: TCP
      port: 6800
      endPort: 7300
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 3300
    - protocol: TCP
      port: 6789
    - protocol: TCP
      port: 6800
      endPort: 7300
```

## Step 3: Allow Client Namespace Access

Allow application pods in other namespaces to access Ceph:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-client-access
  namespace: rook-ceph
spec:
  podSelector:
    matchLabels:
      app: rook-ceph-mon
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          ceph-access: "true"
    ports:
    - protocol: TCP
      port: 3300
    - protocol: TCP
      port: 6789
```

Label client namespaces:

```bash
kubectl label namespace my-app ceph-access=true
```

## Step 4: Allow Metrics Scraping

Allow Prometheus to scrape Ceph metrics:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-prometheus-scrape
  namespace: rook-ceph
spec:
  podSelector:
    matchLabels:
      app: rook-ceph-mgr
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: monitoring
    ports:
    - protocol: TCP
      port: 9283
```

## Step 5: Verify Connectivity After Applying Policies

Test that required traffic still flows:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph -s

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd stat
```

If connectivity breaks, temporarily remove policies to diagnose:

```bash
kubectl -n rook-ceph delete networkpolicy allow-ceph-mon
```

## Summary

NetworkPolicies for Rook-Ceph require allowing monitor ports (6789, 3300), OSD data ports (6800-7300), and manager Prometheus port (9283). Client namespaces need ingress access to monitor ports. Always test cluster health after applying policies and use namespace selectors to limit access to authorized workloads.
