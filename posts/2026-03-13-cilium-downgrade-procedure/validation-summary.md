# Validation Summary: Cilium Downgrade Procedure: Configure, Troubleshoot, Validate, and Monitor

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- eBPF
- Cilium CRDs
- Hubble

## Sources Consulted
- Cilium Upgrade Guide: https://docs.cilium.io/en/stable/operations/upgrade/
- Cilium Helm installation guide: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium endpoint lifecycle documentation: https://docs.cilium.io/en/latest/security/policy/lifecycle/
- Cilium configuration documentation for `clean-cilium-bpf-state`: https://docs.cilium.io/en/stable/network/kubernetes/configuration.html
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Cilium `cilium-dbg policy get` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_policy_get.html
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium v1.14.6 CRD manifests in the official repository: https://github.com/cilium/cilium/tree/v1.14.6/pkg/k8s/apis/cilium.io/client/crds

## Issues Found
- The rollback support claim was too broad and referenced a generic compatibility table. Updated it to match Cilium's documented tested path: rollbacks and upgrades are tested between consecutive minor releases, with multi-minor rollbacks not tested.
- The Helm values backup command omitted `-o yaml`. Added it so the exported values file is explicitly usable as YAML.
- The explicit Helm downgrade example did not warn against `--reuse-values`. Added a note because Cilium documents that `--reuse-values` should not be used when changing chart versions.
- The CRD check relied on Helm ownership annotations and the example applied only one CRD. Replaced this with checks for installed Cilium CRDs and served versions, and clarified that target-version CRDs should only be applied when required or when CRDs were installed outside the operator.
- Internal Cilium pod commands used `cilium endpoint` and `cilium policy`. Updated these to current `cilium-dbg` forms for endpoint, policy, and version inspection.
- The endpoint readiness grep could report headers as failures. Added `--no-headers` before filtering non-ready endpoints.
- The guidance for clearing incompatible eBPF maps incorrectly said deleting Cilium pods flushes maps. Replaced it with `cleanBpfState=true`, a forced agent pod restart, and immediate reset to `cleanBpfState=false`, matching Cilium configuration behavior.
- The endpoint regeneration command was not present in current Cilium command references. Replaced it with log inspection and a Cilium agent pod restart.
- The metrics port-forward example targeted `svc/cilium-operator`, which only exists for certain Prometheus ServiceMonitor configurations. Changed it to port-forward the `cilium-operator` deployment and marked it conditional on `operator.prometheus.enabled=true`.

## Review Notes
The guide remains version-sensitive. Future updates should revisit example versions, Cilium CLI command names, and CRD handling against the exact source and target Cilium versions used in production.
