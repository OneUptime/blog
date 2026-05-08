# Validation Summary: Upgrade Cilium on k0s with k0sctl

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- k0s
- k0sctl
- Helm
- Hubble
- eBPF

## Sources Consulted
- k0s Networking documentation: https://docs.k0sproject.io/stable/networking/
- k0s Configuration Options documentation: https://docs.k0sproject.io/v1.35.2+k0s.0/configuration/
- k0s Upgrade documentation: https://docs.k0sproject.io/head/upgrade/
- k0sctl README and configuration reference: https://github.com/k0sproject/k0sctl
- Cilium k0s installation guide: https://docs.cilium.io/en/stable/installation/k0s/
- Cilium upgrade guide: https://docs.cilium.io/en/stable/operations/upgrade/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/index_cilium_cli/

## Issues Found
- The post incorrectly stated that k0s bundles Cilium as a first-class CNI option and that k0sctl can manage Cilium versioning. Updated the introduction and conclusion to reflect that k0s bundles Kube-router and Calico, while Cilium is installed separately with `provider: custom`.
- The k0sctl YAML example used an invalid `provider: cilium` and `spec.network.cilium.mode` configuration. Replaced it with a valid k0sctl embedded `ClusterConfig` using `provider: custom`, and added the kube-proxy disable setting only for Cilium kube-proxy replacement deployments.
- The k0s upgrade step claimed that upgrading k0s also updates bundled Cilium. Corrected this to state that k0sctl upgrades k0s only, and Cilium must be upgraded separately.
- The Cilium Helm upgrade command used `--reuse-values` while upgrading chart versions. Replaced it with the documented pattern of exporting current Helm values, reviewing them, and passing a values file to `helm upgrade`.
- The Cilium version example used an older fixed version. Updated the example to Cilium `1.19.3`, matching the current stable documentation consulted during review.
- The post called `hubble status` without listing the Hubble CLI as a prerequisite. Added the Hubble CLI prerequisite for Hubble validation.
- The kubeconfig command used `kubectl --kubeconfig -`, which is not a reliable documented pattern. Changed it to write the kubeconfig to `k0s.config` and pass that file to `kubectl`.
- The post enabled Hubble during post-upgrade validation even though it said "if enabled." Removed `cilium hubble enable` from validation and kept only port-forward/status checks.

## Review Notes
- `k0sctl apply --dry-run` exists in current k0sctl references, but it still connects to hosts to calculate actions; it should not be treated as only a local YAML linter.
- Cilium's official upgrade guidance recommends reading version-specific upgrade notes, upgrading one minor release at a time, and first moving to the latest patch release of the current minor version before a minor upgrade.
