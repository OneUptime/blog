# How to Configure Network Policies for Rook-Ceph Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Security, Network Policy, Kubernetes

Description: Configure Kubernetes NetworkPolicies for Rook-Ceph pods to restrict traffic, isolate storage components from untrusted workloads, and enforce least-privilege network access.

---

## Why Network Policies for Rook-Ceph

By default, Kubernetes allows all pod-to-pod communication across namespaces. Without NetworkPolicies, any compromised application pod could communicate directly with Ceph OSDs, MONs, or the manager. Network policies restrict this to only what is necessary.

## Default Deny for the rook-ceph Namespace

Start with a default-deny policy for the rook-ceph namespace:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: rook-ceph
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

Then add explicit allow rules for each component.

## Allow MON Communication

Ceph MONs need to communicate with each other and with all other Ceph components:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-mon-internal
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

## Allow OSD Communication

OSDs communicate on ports 6800-7300:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-osd-internal
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
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: rook-ceph
```

## Allow CSI to Access Ceph

The CSI pods are deployed in the operator namespace (`rook-ceph` by default) and need to reach both the MONs and OSDs:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-csi-to-ceph
  namespace: rook-ceph
spec:
  podSelector:
    matchLabels:
      app: rook-ceph-mon
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: csi-rbdplugin
      ports:
        - protocol: TCP
          port: 3300
        - protocol: TCP
          port: 6789
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-csi-to-osd
  namespace: rook-ceph
spec:
  podSelector:
    matchLabels:
      app: rook-ceph-osd
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: csi-rbdplugin
      ports:
        - protocol: TCP
          port: 6800
          endPort: 7300
```

## Allow Application Namespaces via CSI Only

Application pods should communicate with Ceph only through the CSI driver, never directly:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-app-direct-ceph
  namespace: rook-ceph
spec:
  podSelector:
    matchLabels:
      app: rook-ceph-osd
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: rook-ceph
```

## Allow Dashboard Access

Allow the Ceph dashboard to be accessed from a monitoring namespace:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dashboard
  namespace: rook-ceph
spec:
  podSelector:
    matchLabels:
      app: rook-ceph-mgr
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              purpose: monitoring
      ports:
        - protocol: TCP
          port: 8443
```

## Summary

Configuring NetworkPolicies for Rook-Ceph starts with a default-deny baseline and adds explicit allow rules for each component pair. MONs, OSDs, and the manager require intra-namespace access. CSI pods need MON access from their namespace. Application pods should never directly reach Ceph components - all access flows through the CSI driver.
