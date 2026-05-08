# Validation Summary: Auditing Node Label Attachment in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- CiliumEndpoint
- Hubble CLI
- kubectl
- jq

## Sources Consulted
- Cilium Network Policy documentation: https://docs.cilium.io/en/latest/network/kubernetes/policy/
- Cilium Host Policies documentation: https://docs.cilium.io/en/latest/security/policy/host/
- Cilium Host Firewall documentation: https://docs.cilium.io/en/stable/security/host-firewall/
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint/
- Cilium API Reference for endpoint policy status fields: https://docs.cilium.io/en/stable/api/
- Cilium command reference for `cilium config view`: https://docs.cilium.io/en/latest/cmdref/cilium_config_view/
- Cilium command reference for `cilium-dbg endpoint list`, `cilium-dbg config`, and `cilium-dbg identity list`: https://docs.cilium.io/en/latest/cmdref/
- Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/

## Issues Found
- The policy inventory command only listed namespaced CiliumNetworkPolicy resources even though the text said all Cilium network policies. Added a CiliumClusterwideNetworkPolicy inventory command.
- The endpoint coverage examples used `cilium endpoint list` as a cluster-wide command and queried outdated JSON keys such as `status.policy.realized."l4-ingress"`. Replaced those examples with cluster-wide `kubectl get ciliumendpoints --all-namespaces` queries that use the current nested `status.policy.realized.l4.ingress` and `status.policy.realized.l4.egress` fields.
- The node-label policy examples did not separately inspect host endpoints, which are the endpoints affected by `nodeSelector` host policies. Added a per-agent `cilium-dbg endpoint list -o json` check for `reserved:host` endpoints.
- The per-agent configuration audit used `cilium config view` inside Cilium agent pods. Replaced it with `cilium-dbg config --all`, which is the documented agent-local CLI interface.
- The documented YAML example claimed to include audit annotations but did not include any annotations. Added example audit annotations under `metadata.annotations`.
- The audit report script used the same incorrect endpoint command and JSON keys. Updated it to count CiliumEndpoint resources and use the current policy status paths.
- The verification section used the deprecated `cilium policy get` command for policy summaries. Replaced it with Kubernetes CRD queries for CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy names.
- The identity verification command used `cilium identity list` directly, which is not part of the Kubernetes-facing `cilium` CLI command set in current docs. Replaced it with a CiliumEndpoint identity query.
- The policy mismatch troubleshooting command relied on grepping `kubectl describe` output for a field that is not a stable interface. Replaced it with a JSON status query.

## Review Notes
The Hubble dropped-flow command and the `CiliumClusterwideNetworkPolicy` `nodeSelector` host-policy pattern are consistent with official Cilium documentation. For large clusters, the report script may still need batching or API pagination for operational reasons, but the commands and field paths are technically valid.
