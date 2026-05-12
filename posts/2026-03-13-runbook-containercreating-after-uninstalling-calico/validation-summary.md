# Validation Summary: Runbook: ContainerCreating After Uninstalling Calico

## Status
validated

## Post Type
Runbook / Operational Guide

## Technologies Covered
- Calico CNI (v3.27.0)
- Kubernetes (kubectl)
- Container Network Interface (CNI)
- kubelet / systemd
- Bash shell utilities (awk, ssh, grep)
- Mermaid (diagram syntax)

## Sources Consulted
- Calico official documentation: https://docs.tigera.io/calico/latest/
- Calico GitHub releases: https://github.com/projectcalico/calico/releases
- Verified Calico v3.27.0 manifest URL returns HTTP 200: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
- Kubernetes CNI spec / CNI plugin configuration directory conventions (`/etc/cni/net.d/`, `/opt/cni/bin/`): https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Mermaid flowchart syntax (multi-source edges `A & B --> C`): https://mermaid.js.org/syntax/flowchart.html

## Issues Found
No technical issues found.

Verified items:
- `kubectl get pods --all-namespaces` column order — `$1` is NAMESPACE and `$2` is NAME, matching usage in the awk pipelines.
- Calico's standard CNI config filename `10-calico.conflist` in `/etc/cni/net.d/` is correct.
- Standard CNI binary directory `/opt/cni/bin/` is correct per CNI conventions.
- Calico DaemonSet name `calico-node` in `kube-system` is correct for the upstream manifest.
- The Calico v3.27.0 manifest URL is reachable (HTTP 200), and the version is a real release.
- `kubectl rollout status daemonset calico-node -n kube-system --timeout=180s` syntax is valid.
- Mermaid `D & F --> G` syntax is a valid way to express multi-source edges.
- The `kubectl describe pod | grep -A5 "Warning"` approach correctly surfaces the CNI plugin error events.

## Review Notes
- Calico v3.27.0 was released in November 2023. It remains a valid, downloadable manifest, but newer minor versions exist (v3.29.x / v3.30.x as of 2026). For a fresh install on new clusters, operators may prefer pinning to a currently supported minor; however, for a fast rollback runbook the goal is to match the version previously running in the cluster, so a fixed historic version is reasonable.
- The "If new CNI installed but Calico config conflicts" snippet removes only `10-calico.conflist`. In some installations Calico also leaves behind `calico-kubeconfig` and `calico.conflist` (older naming) in `/etc/cni/net.d/`. Operators should verify what files are present before pruning; the current command is correct for the most common modern Calico install.
- The bulk pod delete via shell pipeline assumes pod names contain no spaces (they cannot in Kubernetes), so it is safe as written.
