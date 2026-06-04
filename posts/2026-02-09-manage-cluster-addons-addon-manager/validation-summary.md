# Validation Summary: How to Manage Kubernetes Cluster Addons with Addon Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes addon-manager
- CoreDNS
- Metrics Server
- Kubernetes RBAC
- kubectl

## Sources Consulted
- Kubernetes official labels, annotations, and taints reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes addon-manager README: https://github.com/kubernetes/kubernetes/blob/master/cluster/addons/addon-manager/README.md
- Kubernetes addon-manager manifest: https://github.com/kubernetes/kubernetes/blob/master/cluster/gce/manifests/kube-addon-manager.yaml
- Kubernetes CoreDNS addon manifest: https://github.com/kubernetes/kubernetes/blob/master/cluster/addons/dns/coredns/coredns.yaml.base
- Metrics Server official release manifest v0.8.1: https://github.com/kubernetes-sigs/metrics-server/releases/download/v0.8.1/components.yaml
- Metrics Server official repository and compatibility notes: https://github.com/kubernetes-sigs/metrics-server

## Issues Found
- The post described addon-manager as watching labeled in-cluster resources. Updated this to clarify that addon-manager processes manifests under `$ADDON_PATH` and selects resources by label.
- The `Reconcile` mode description incorrectly said addon-manager does not delete resources. Updated it to state that `Reconcile` resources are pruned when the manifest is removed from the addon path.
- The namespace creation command would fail on clusters where `kube-system` already exists. Replaced it with an idempotent `kubectl create namespace --dry-run=client -o yaml | kubectl apply -f -` command.
- The addon-manager image path was incorrect. Updated it from `registry.k8s.io/kube-addon-manager:v9.1.8` to the official `registry.k8s.io/addon-manager/kube-addon-manager:v9.1.8`.
- The standalone Deployment example would not pass addon-manager's leader check reliably. Added `ADDON_MANAGER_LEADER_ELECTION=false`.
- The hostPath manifest guidance was too broad for a single-replica Deployment. Clarified that manifests must exist on any control plane node where the pod might run.
- The CoreDNS image was stale compared with the current Kubernetes addon manifest. Updated it to `registry.k8s.io/coredns/coredns:v1.14.2`.
- The Metrics Server manifest was missing the `metrics-server-auth-reader` RoleBinding required by the official manifest. Added it.
- The Metrics Server image and secure port were outdated. Updated the example to v0.8.1 with secure port 10250, probes, security context, Linux node selector, and system priority class from the official manifest.
- The removal section contradicted addon-manager pruning behavior. Updated it to show optional immediate `kubectl delete -f` cleanup and explain Reconcile versus EnsureExists deletion behavior.
- The log grep pattern used capitalized words that do not match normal `kubectl apply` output. Updated it to match `created`, `configured`, `pruned`, and `deleted`.

## Review Notes
The YAML snippets were parsed successfully with PyYAML. `kubectl` is not installed in this workspace, so CLI behavior was checked against official documentation and upstream manifests rather than executed locally.
