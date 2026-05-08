# Validation Summary: How to Use Hubble to Find Why Traffic Was Dropped in Cilium

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- Helm
- jq
- eBPF networking observability

## Sources Consulted
- Cilium documentation: Inspecting Network Flows with the CLI: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium documentation: Setting up Hubble Observability: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium CLI command reference for `cilium hubble`: https://docs.cilium.io/en/latest/cmdref/cilium_hubble/
- Cilium Flow API protocol reference for `drop_reason_desc` and `DropReason`: https://docs.cilium.io/en/stable/_api/v1/flow/README/
- Cilium Hubble exporter configuration examples for `drop_reason_desc`: https://docs.cilium.io/en/stable/observability/hubble/configuration/export/
- Hubble CLI v0.11.0 release notes for JSON/jsonpb output behavior: https://github.com/cilium/hubble/releases/tag/v0.11.0

## Issues Found
- The architecture diagram referred to a separate "Hubble Agent." Hubble flow events are exposed by Hubble running in the Cilium agent and aggregated by Hubble Relay, so the diagram was updated to say "Hubble in the Cilium agent captures event."
- The drop reason table used `ENDPOINT_NOT_FOUND`, which is not a current Cilium `DropReason` enum value. It was changed to `DROP_EP_NOT_READY`, matching the endpoint-not-ready condition described in the post.
- The drop reason table used `NO_TUNNEL_OR_ROUTE`, which is not a current Cilium `DropReason` enum value. It was changed to `FIB_LOOKUP_FAILED` for route lookup failures.
- The policy denial example grepped human-readable output for `POLICY_DENIED`, but Hubble's default compact output normally renders policy drops as human-readable text such as "Policy denied." The example now uses `--output jsonpb` and `jq` to filter `.flow.drop_reason_desc == "POLICY_DENIED"`.
- The export example used `--output json` with a `.flow` jq path. To make the structured `GetFlowResponse` shape explicit and avoid ambiguity, it now uses `--output jsonpb`.

## Review Notes
The local environment did not have the `hubble` or `cilium` CLI installed, so CLI behavior was validated against official Cilium/Hubble documentation and upstream release notes rather than local `--help` output. The Helm values and Hubble Relay port-forward flow are consistent with official setup guidance.
