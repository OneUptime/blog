# Validation Summary: Update Cilium System Requirements

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- Linux kernel features
- Linux capabilities
- Container Runtime Interface runtimes
- `kubectl`

## Sources Consulted
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium WireGuard transparent encryption: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium bandwidth manager: https://docs.cilium.io/en/stable/network/kubernetes/bandwidth-manager/
- Cilium upgrade guide and pre-flight check: https://docs.cilium.io/en/stable/operations/upgrade/
- Kubernetes `kubectl version` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging task: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes container runtimes: https://kubernetes.io/docs/setup/production-environment/container-runtimes/

## Issues Found
- The post claimed each major Cilium version raises the minimum kernel version. Changed this to "some Cilium releases" because this is not guaranteed for every major release.
- The Kubernetes version command used deprecated or removed `kubectl version --short`. Changed it to `kubectl version`, which is the current documented command.
- The Cilium Kubernetes compatibility range was outdated. Updated it to Cilium 1.19's tested Kubernetes versions, 1.31 through 1.34, and corrected the documentation URL.
- The kernel requirement table contained outdated minimums for older Cilium feature tiers. Replaced it with current Cilium stable requirements, including the base 5.10-or-equivalent kernel requirement and current advanced-feature kernel requirements.
- The `kubectl debug` examples used `chroot /host` without a privileged debug profile. Added `--profile=sysadmin`, which Kubernetes documents as necessary when the default node debug pod is not privileged enough for `chroot /host`.
- The Linux capability list was incomplete. Updated it to match the default Cilium Helm chart capabilities for `cilium-agent`.
- The container runtime section listed unsupported fixed minimum versions without current Cilium documentation backing. Reworded it to Kubernetes-supported CRI runtimes and clarified Docker Engine's need for `cri-dockerd` after dockershim removal.
- The BPF mount loop used an awkward `--attach=false` pattern and a local pipe. Changed it to attach to the debug pod and run the `mount` filter inside the host chroot.
- The cgroup v2 note stated it was recommended for Cilium 1.12+. Reworded it as a check for whether cgroup v2 is mounted, because the current system requirements page does not state that recommendation.
- The best-practice command `cilium preflight check` did not match the current upgrade-guide workflow. Reworded it to reference the official Cilium pre-flight check.

## Review Notes
The post is now technically valid as a current Cilium 1.19 stable reference. Future updates should re-check Cilium's stable Kubernetes version matrix and kernel requirements because the stable documentation changes as new Cilium releases become current.
