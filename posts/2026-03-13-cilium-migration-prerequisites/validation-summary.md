# Validation Summary: Cilium CNI Migration Prerequisites

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- CNI plugins
- Linux eBPF and bpffs
- Helm
- kubectl

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes Requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium migration guide: https://docs.cilium.io/en/stable/installation/k8s-install-migration/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium policy enforcement modes: https://docs.cilium.io/en/latest/security/policy/intro/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The Kubernetes prerequisite said version 1.21 or later. Current Cilium stable documentation lists tested and supported Kubernetes versions per Cilium release, so I changed the wording to require a Kubernetes version supported by the target Cilium release and cited Cilium 1.19's tested range of 1.31 through 1.34.
- The Linux kernel prerequisite said 4.19.57 or later, which is a feature-specific kernel threshold and not the current base requirement. I changed it to Linux kernel 5.10 or later, or a documented distribution-equivalent kernel such as RHEL 8.10's 4.18 kernel.
- The migration values used `tunnel: "vxlan"` and reused the existing pod CIDR. Current Cilium migration documentation uses `routingMode`, `tunnelProtocol`, a distinct Cilium pod CIDR, migration-safe CNI settings, `operator.unmanagedPodWatcher.restart: false`, and `bpf.hostLegacyRouting: true`, so I updated the example values.
- The preflight Helm command was presented as a general non-Cilium migration readiness check. Cilium documents `preflight.enabled` for upgrades, so I replaced it with the documented migration flow that uses `cilium install --dry-run-helm-values` and `helm template` to render migration manifests before applying them.
- The kernel module check looked for iptables modules instead of Cilium's documented eBPF and routing kernel configuration options. I replaced it with checks for key Cilium kernel config options such as `CONFIG_BPF`, `CONFIG_BPF_SYSCALL`, `CONFIG_CGROUP_BPF`, `CONFIG_VXLAN`, `CONFIG_GENEVE`, and `CONFIG_FIB_RULES`.
- The persistent bpffs `/etc/fstab` example did not match Cilium's documented portable entry. I changed it to `bpffs /sys/fs/bpf bpf defaults 0 0`.
- The CNI configuration inspection commands read `/etc/cni/net.d/` from the local shell. I changed them to inspect `/host/etc/cni/net.d/` through `kubectl debug node`, matching Kubernetes node debugging behavior.
- The etcd connectivity check implied etcd was critical for all Cilium CNI state, but Kubernetes Cilium installs commonly use CRD-backed state by default. I replaced it with a Kubernetes API readiness check.
- The baseline DNS command used an image that may not include `nslookup`. I changed the baseline test pods to use `ghcr.io/nicolaka/netshoot:v0.8` and added `--restart=Never` for one-shot `kubectl run` diagnostics.

## Review Notes
- Cilium's exact compatibility matrix is version-specific. Future updates should pin the target Cilium version in examples if the post wants to provide exact Kubernetes, kernel, and Helm value expectations.
- Cilium can automatically mount bpffs if it is not already mounted, but pre-mounting it remains a valid readiness step when done in the host mount namespace.
