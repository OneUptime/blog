# Validation Summary: Validating Cilium Routing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Cilium CLI
- Cilium agent diagnostics (`cilium-dbg`)
- Hubble CLI
- Kubernetes
- Helm
- Linux routing and overlay networking

## Sources Consulted
- Cilium routing documentation: https://docs.cilium.io/en/v1.15/network/concepts/routing/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/
- `cilium config view` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view/
- `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_endpoint_list/
- `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_metrics_list/
- Hubble setup and CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Hubble flow inspection documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Kubernetes workload and affinity API behavior: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Helm `get values` command documentation: https://helm.sh/docs/helm/helm_get_values/

## Issues Found
- The `cilium connectivity test --test pod-to-pod` and `--test pod-to-service` examples targeted scenario names without the scenario selector syntax documented by Cilium. Changed them to `--test /pod-to-pod` and `--test /pod-to-service`.
- The `cilium connectivity test --test dns-resolution` example did not match a current Cilium connectivity test name. Changed it to `--test to-fqdns`, which is a current DNS/FQDN-related connectivity test.
- The custom BusyBox workload used `wget --timeout=5`. Changed this to `wget -T 5`, which is the BusyBox timeout option form.
- The endpoint and metrics examples used `cilium endpoint list` and `cilium metrics list` from inside Cilium pods. Current Cilium command reference exposes these agent-side diagnostics through `cilium-dbg`, so the commands were updated to `cilium-dbg endpoint list` and `cilium-dbg metrics list`.
- The endpoint-count example implied that one `kubectl exec ds/cilium` command could validate the cluster-wide endpoint count against all running pods. Updated it to describe the count as local to the selected Cilium agent.
- The Hubble observability command was run through `kubectl exec` even though the post prerequisites only mentioned the Cilium CLI. Added a Hubble CLI/Hubble-enabled prerequisite and changed the example to use the local `hubble observe` command.
- The troubleshooting note for drop metrics referenced `cilium metrics list`; updated it to `cilium-dbg metrics list` for consistency with current Cilium diagnostics.

## Review Notes
The guide is version-neutral, so the validation used current Cilium documentation available on 2026-05-08. Some connectivity tests are feature-gated by Cilium configuration, so individual `cilium connectivity test --test ...` examples can still be skipped by Cilium if the required feature is disabled.
