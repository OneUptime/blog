# Validation Summary: How to Parse Output from cilium-agent

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Cilium
- Cilium CLI
- cilium-dbg
- Kubernetes
- kubectl
- jq
- Bash
- Prometheus-style metrics

## Sources Consulted
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- cilium status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- cilium sysdump command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- cilium-dbg status command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status/
- cilium-dbg endpoint list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- cilium-dbg identity list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- cilium-dbg service list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_service_list/
- cilium-dbg metrics list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium API reference for JSON field names: https://docs.cilium.io/en/stable/api/
- Cilium Kubernetes requirements and compatibility: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/

## Issues Found
- The post used the Kubernetes `cilium` CLI for agent-local commands such as `endpoint list`, `identity list`, `service list`, `metrics list`, `bpf tunnel list`, and `endpoint get`. These are `cilium-dbg` agent commands in the current official command reference, so the examples were updated to run `cilium-dbg` inside a selected Cilium agent pod via `kubectl exec`.
- Some jq filters used underscore-separated field names for Cilium API fields that are serialized with hyphenated JSON names, such as `cluster-mesh`, `frontend-address`, and `backend-addresses`. These filters were corrected to use jq bracket notation.
- The prerequisites stated a fixed Kubernetes/Cilium version pair of Kubernetes v1.21+ and Cilium v1.14+. Cilium's supported Kubernetes versions are version-specific, so this was changed to require a Kubernetes cluster with a Cilium version that supports that Kubernetes version.
- The troubleshooting section suggested `cilium policy get`, which is not part of the current Kubernetes `cilium` CLI reference. This was replaced with `kubectl get networkpolicy,ciliumnetworkpolicy,ciliumclusterwidenetworkpolicy -A` for checking applied policy resources.
- The agent log troubleshooting command omitted the `cilium-agent` container selection, which can fail on multi-container pods. The command now includes `-c cilium-agent`.
- Snippets that depend on a Cilium agent pod now define `CILIUM_POD` before using it.

## Review Notes
- The post mixes cluster-level checks and agent-local parsing. This is technically valid after the corrections, but future revisions could make that distinction more explicit throughout the prose.
- The jq examples were reviewed for syntax. Exact JSON field availability can vary across Cilium versions, so operators should confirm field paths against their installed Cilium version when building automation.
