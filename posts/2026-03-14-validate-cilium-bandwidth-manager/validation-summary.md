# Validation Summary: Validating Cilium Bandwidth Manager

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium Bandwidth Manager
- Kubernetes
- Cilium CLI
- Cilium agent debugging with `cilium-dbg`
- Hubble
- Helm
- `iperf3`

## Sources Consulted
- Cilium Bandwidth Manager documentation: https://docs.cilium.io/en/latest/network/kubernetes/bandwidth-manager/
- Cilium CLI `connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium command reference, including `cilium-dbg endpoint list`, `cilium-dbg metrics list`, and `cilium-dbg bpf bandwidth list`: https://docs.cilium.io/en/latest/cmdref/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/

## Issues Found
- The original custom workload used nginx and basic HTTP requests, which only validated connectivity and did not exercise Cilium Bandwidth Manager. Replaced it with `cilium/netperf` client and server pods, Kubernetes bandwidth annotations, `iperf3` ingress and egress tests, and `cilium-dbg bpf bandwidth list` inspection.
- The post described `cilium connectivity test` as validating the Bandwidth Manager datapath. Updated the wording to clarify that connectivity tests validate the general datapath before bandwidth enforcement is tested separately.
- The endpoint validation used `cilium endpoint list`, which is not part of the current standalone Cilium CLI command reference. Updated endpoint checks to use `kubectl get ciliumendpoints --all-namespaces` and agent-side `cilium-dbg endpoint list`.
- The endpoint count check claimed Cilium endpoint count should match running pod count exactly. Updated it to a comparison, because CiliumEndpoint resources include Cilium-managed endpoints and may include health-check endpoints depending on cluster state.
- The metrics commands used `cilium metrics list` from inside the Cilium DaemonSet. Updated these to the current agent-side `cilium-dbg metrics list` command.
- The configuration validation did not include the documented `BandwidthManager` status line. Added a `cilium status --verbose | grep -i BandwidthManager` check.

## Review Notes
The post is now technically accurate as a general validation guide. Actual throughput values from `iperf3` can vary by kernel, Cilium version, node placement, and cluster load, so operators should compare results against the configured annotations with normal tolerance rather than expecting exact bitrates every second.
