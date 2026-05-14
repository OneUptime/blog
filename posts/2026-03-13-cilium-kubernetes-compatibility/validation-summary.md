# Validation Summary: Cilium Kubernetes Compatibility: Configure, Troubleshoot, Validate, and Monitor

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- eBPF
- Linux kernel feature requirements
- Cilium CLI and Cilium agent debugging commands

## Sources Consulted
- Cilium 1.15 Kubernetes requirements: https://docs.cilium.io/en/v1.15/network/kubernetes/requirements/
- Cilium 1.15 Kubernetes compatibility: https://docs.cilium.io/en/v1.15/network/kubernetes/compatibility/
- Cilium 1.15 system requirements: https://docs.cilium.io/en/v1.15/operations/system_requirements/
- Cilium 1.15 Helm reference: https://docs.cilium.io/en/v1.15/helm-reference/
- Cilium latest `cilium features status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_features_status/
- Cilium stable `cilium-dbg status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status/
- Kubernetes `kubectl version` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/

## Issues Found
- Corrected the Kubernetes compatibility range for Cilium 1.15 from Kubernetes 1.27-1.30 to Kubernetes 1.26-1.29, matching the Cilium 1.15 requirements documentation.
- Replaced the broad claim that each Cilium release supports the three most recent Kubernetes minor versions with a more accurate statement that each Cilium minor version publishes a tested compatibility range.
- Corrected kernel requirement claims. Cilium 1.15 requires Linux kernel 4.19.57 or equivalent, while advanced features have separate minimum versions such as WireGuard >= 5.6, Bandwidth Manager >= 5.1, socket-level LB bypass in pod netns >= 5.7, and BPF-based host routing >= 5.10.
- Replaced `kubectl version --short` with `kubectl version -o json` because the official current `kubectl version` reference documents `-o json|yaml` and no longer documents `--short`.
- Updated Cilium 1.15 installation examples from older patch versions to Cilium 1.15.19 and removed the incorrect suggestion that Kubernetes 1.27 requires an older Cilium 1.14 release.
- Replaced invalid or misplaced `cilium features list` and in-pod `cilium status` examples with documented Cilium CLI commands and `cilium-dbg status --verbose` for agent status inside the Cilium pod.
- Removed the unsupported `endpointSlice.enabled=false` Helm value example and replaced it with a compatibility-matrix check for required Kubernetes APIs.
- Replaced the unavailable `quay.io/cilium/cilium-cli:v0.16.24` CronJob image with the existing official `quay.io/cilium/cilium-cli-ci:v0.16.24` image and verified locally that it provides the `cilium features status` command.
- Replaced decimal-style kernel version comparisons with a major/minor comparison helper so versions such as 5.10 are not incorrectly treated as 5.1.

## Review Notes
The CronJob example still assumes the `cilium` ServiceAccount has enough RBAC for Cilium CLI status checks in the target cluster. That is typical for Cilium-managed clusters but should be verified in hardened installations.
