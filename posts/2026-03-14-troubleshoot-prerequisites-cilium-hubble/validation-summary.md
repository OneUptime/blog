# Validation Summary: How to Troubleshoot Pre-Requisites in Cilium Hubble

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- kubectl
- Helm
- Linux eBPF/BPF filesystem
- Container Network Interface (CNI)

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes Requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium Quick Installation / CLI install instructions: https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/
- Cilium Hubble setup / Hubble CLI install instructions: https://docs.cilium.io/en/latest/observability/hubble/setup/
- Kubernetes kubectl debug node documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Containerd CRI CNI configuration documentation: https://github.com/containerd/containerd/blob/main/docs/cri/config.md
- CNI specification: https://www.cni.dev/docs/spec/

## Issues Found
- The node debug commands checked and modified paths inside the debug container instead of the node filesystem. Updated them to run through `chroot /host`, matching Kubernetes node-debug behavior where the host root filesystem is mounted at `/host`.
- The kernel requirement in the flowchart used `>= 4.19`, which is outdated for current Cilium documentation. Updated it to `>= 5.10 or equivalent`.
- The Kubernetes compatibility comments gave stale examples for Cilium 1.14 and 1.15. Replaced them with guidance to consult the version-specific Cilium requirements matrix.
- The Cilium CLI and Hubble CLI installation snippets hard-coded `amd64` and skipped checksum verification. Updated them to follow the official architecture-selection and checksum-verification pattern.
- The verification script used `kubectl version --short`, which is no longer listed in current generated kubectl documentation. Updated it to use `kubectl version -o json`.

## Review Notes
The CNI removal commands are examples and assume those CNIs were installed from the referenced manifests. In real clusters, operators should remove the old CNI using the same installation method that created it, then verify node-level CNI config cleanup.
