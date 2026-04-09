# How to Configure Prometheus RBAC for Rook-Ceph Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Prometheus, Security, Kubernetes

Description: Configure the RBAC roles and bindings needed for Prometheus to scrape Rook-Ceph metrics across namespaces in Kubernetes.

---

## Overview

When Prometheus runs in a separate namespace from Rook-Ceph, it requires specific RBAC permissions to discover and scrape the Ceph metrics endpoints. This guide covers the necessary ServiceAccount, ClusterRole, and ClusterRoleBinding configuration.

## Why RBAC is Needed

Prometheus uses the Kubernetes API to discover scrape targets via ServiceMonitor resources. It needs permission to:
- List and watch Services, Pods, and Endpoints in `rook-ceph`
- Access monitoring CRDs (ServiceMonitor, PodMonitor, PrometheusRule) for target and rule discovery
- Read node metrics and non-resource URLs for scraping

## Create a ServiceAccount for Prometheus (if not using kube-prometheus-stack)

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prometheus
  namespace: monitoring
```

## ClusterRole for Rook-Ceph Monitoring

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: prometheus-rook-ceph
rules:
- apiGroups: [""]
  resources:
  - nodes
  - nodes/metrics
  - services
  - endpoints
  - pods
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources:
  - configmaps
  verbs: ["get"]
- apiGroups: ["networking.k8s.io"]
  resources:
  - ingresses
  verbs: ["get", "list", "watch"]
- nonResourceURLs: ["/metrics", "/metrics/cadvisor"]
  verbs: ["get"]
- apiGroups: ["monitoring.coreos.com"]
  resources:
  - servicemonitors
  - podmonitors
  - prometheusrules
  verbs: ["get", "list", "watch"]
```

## ClusterRoleBinding

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: prometheus-rook-ceph
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus-rook-ceph
subjects:
- kind: ServiceAccount
  name: prometheus
  namespace: monitoring
```

Apply both resources:

```bash
kubectl apply -f prometheus-rbac.yaml
```

## Namespace-Scoped Role for rook-ceph

In addition to the ClusterRole, grant explicit access to the `rook-ceph` namespace:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: prometheus-rook-ceph
  namespace: rook-ceph
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus-rook-ceph
subjects:
- kind: ServiceAccount
  name: prometheus
  namespace: monitoring
```

```bash
kubectl apply -f prometheus-rolebinding-rook.yaml
```

## Verify RBAC Permissions

Test that Prometheus has the required access:

```bash
kubectl auth can-i list endpoints --as=system:serviceaccount:monitoring:prometheus -n rook-ceph
kubectl auth can-i get servicemonitors --as=system:serviceaccount:monitoring:prometheus -n rook-ceph
```

Both should return `yes`.

## kube-prometheus-stack RBAC

If using the kube-prometheus-stack Helm chart, RBAC is configured automatically. Verify it covers `rook-ceph`:

```bash
kubectl get clusterrolebinding | grep prometheus
kubectl describe clusterrolebinding prometheus-kube-prometheus-prometheus
```

## Summary

Correct RBAC configuration ensures Prometheus can discover and scrape Rook-Ceph metrics across namespaces. A ClusterRole with access to Services, Endpoints, Pods, and monitoring CRDs combined with appropriate RoleBindings in the `rook-ceph` namespace provides the minimum required permissions without granting excessive cluster access.
