# Validation Summary: Networking For Existing Pods with Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- eBPF
- Cilium endpoint restoration
- Cilium metrics and `cilium-dbg`

## Sources Consulted
- Cilium Endpoint Lifecycle: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium `cilium-dbg endpoint` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg endpoint get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium `cilium-dbg endpoint log` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_log/
- Cilium `cilium-dbg config get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_config_get/
- Cilium Monitoring & Metrics: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Considerations on Node Pool Taints and Unmanaged Pods: https://docs.cilium.io/en/stable/installation/taints/
- Cilium chart `values.yaml` for v1.19.3: https://github.com/cilium/cilium/blob/v1.19.3/install/kubernetes/cilium/values.yaml

## Issues Found
- The post implied that installing Cilium into a cluster automatically restores networking for all already-running pods. Cilium endpoint restoration applies to existing Cilium-managed endpoints after an agent restart or upgrade; pods that start before Cilium is active on the node may be unmanaged. Updated the description, introduction, prerequisites, troubleshooting notes, and conclusion to distinguish restored endpoints from unmanaged pods.
- The Helm value `endpointRestoreTime` is not present in the current Cilium Helm reference. Replaced it with `envoy.policyRestoreTimeoutDuration`, which controls the Envoy endpoint policy restore timeout.
- The Helm value `maxConnectedClusters` was described as endpoint regeneration parallelism, but it is a Cluster Mesh setting. Removed that command and the related tuning claim.
- The post used `cilium endpoint list`, `cilium endpoint get`, and `cilium endpoint regenerate`. Current Cilium command references document endpoint inspection through `cilium-dbg endpoint list`, `cilium-dbg endpoint get`, and `cilium-dbg endpoint log`; there is no documented `endpoint regenerate` command. Updated commands to use `cilium-dbg` and changed the recovery advice to inspect endpoint state and recreate unmanaged or stuck pods.
- The restart example deleted a Cilium pod and then tailed logs from the old pod name. Updated the example to wait for the replacement pod and refresh `CILIUM_POD` before monitoring logs.
- The example ran `watch` inside the Cilium container. Updated it so the local shell runs `watch` and repeatedly executes `kubectl exec`.
- The Prometheus metric `cilium_endpoint_regeneration_total` was singular, but current Cilium metrics use `endpoint_regenerations_total` along with endpoint restoration metrics. Updated the metric names and grep pattern.
- The endpoint validation examples depended on brittle table parsing and exact pod-to-endpoint counts. Updated the examples to look for non-ready transition states and added a caveat that host-network and unmanaged pods do not have matching Cilium endpoints.

## Review Notes
The guide is now accurate for current Cilium documentation, but operational behavior can still vary by Cilium version, install mode, and cloud provider. Future revisions could add a migration-specific note pointing readers to Cilium's migration and unmanaged-pod documentation.
