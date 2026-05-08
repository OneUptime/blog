# Validation Summary: How to Secure Pre-Requisites in Cilium Hubble

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- Kubernetes RBAC
- Helm
- Linux kernel sysctl and eBPF settings

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Helm installation documentation: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium Helm chart index: https://helm.cilium.io/index.yaml
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Helm pull reference: https://helm.sh/docs/helm/helm_pull/
- Helm verify reference: https://helm.sh/docs/helm/helm_verify/
- Linux kernel network sysctl documentation: https://www.kernel.org/doc/html/latest/admin-guide/sysctl/net.html
- Linux kernel unprivileged BPF sysctl documentation: https://www.kernel.org/doc/html/latest/admin-guide/sysctl/kernel.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html

## Issues Found
- The `kubectl debug node` commands modified the debug container filesystem rather than the host filesystem for persistent sysctl configuration, and did not request a privileged debug profile. Updated both commands to use `--profile=sysadmin` and `chroot /host`.
- The BPF comments overstated `bpf_jit_enable` as a universal runtime requirement and described privileged BPF access too narrowly. Updated the wording to match Linux kernel documentation for `CAP_BPF` and `CAP_SYS_ADMIN`.
- The reverse path filtering example used strict mode (`rp_filter=1`) without noting that asymmetric routing requires loose mode. Changed the example to loose mode (`rp_filter=2`) and added a short caveat for strict mode.
- The installer RBAC example referenced a `ServiceAccount` that was never created and omitted common resources that Helm may create for Cilium, such as Roles, RoleBindings, ResourceQuotas, and PodDisruptionBudgets. Added the ServiceAccount and expanded the temporary installer permissions.
- The Helm integrity example untarred the chart before running `helm verify`, but `helm verify` validates a packaged chart archive and matching provenance data. Updated the flow to pull the packaged chart, verify provenance if available, and compare the package digest with the official Cilium Helm index.
- The chart version in the Helm integrity example was outdated for a 2026 validation. Updated it from `1.15.0` to `1.19.3`, matching the current stable Cilium documentation consulted during review.

## Review Notes
The RBAC example is still best treated as temporary installation RBAC. Exact least-privilege permissions depend on the rendered Cilium Helm values; operators should render the chart for their chosen values and remove the installer binding after installation.
