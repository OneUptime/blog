# Validation Summary: Troubleshooting Cilium Agent Shell Access Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- kubectl
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- Cilium CLI and cilium-dbg

## Sources Consulted
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/authorization/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium cilium-dbg command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium cilium-dbg status command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html
- Cilium cilium-dbg shell command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_shell.html
- Cilium status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium API reference: https://docs.cilium.io/en/stable/api/

## Issues Found
- The temporary debug pod example hard-coded `quay.io/cilium/cilium:v1.16.0` and passed `/bin/bash` without `--command`. I changed it to reuse the running Cilium agent image and added `--command -- /bin/bash`, matching the documented `kubectl run` syntax for overriding the container command.
- The network policy section claimed that network policies may block the exec connection. Kubernetes NetworkPolicy applies to pod network traffic, while `kubectl exec` is an API server/kubelet streaming operation. I changed the section to explain that NetworkPolicy does not normally block the exec stream itself, but can affect networked commands run inside the pod.
- The endpoint-list command in the network policy section was described as checking "without policies", which it does not do. I changed the comment to accurately describe it as checking whether Cilium-managed kube-system endpoints are visible.

## Review Notes
The core diagnostic commands for pod status, explicit-container `kubectl exec`, RBAC `pods/exec` creation permission, Cilium `cilium-dbg status`, `cilium-dbg endpoint list`, Unix socket health checks, previous logs, and `cilium status --wait` are consistent with official Kubernetes and Cilium documentation. `kubectl` was not installed in the review environment, so command verification used official generated CLI references instead of local `--help` output.
