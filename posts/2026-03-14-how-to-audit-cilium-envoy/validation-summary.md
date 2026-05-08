# Validation Summary: Auditing Envoy Proxy Integration in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- CiliumEndpoint CRD
- Cilium CLI and cilium-dbg
- Kubernetes
- Hubble
- Envoy proxy integration in Cilium
- jq and shell commands

## Sources Consulted
- Cilium Command Cheatsheet: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium Layer 7 Policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Policy Troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- Cilium Policy Enforcement Modes documentation: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium cilium-dbg command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg/
- Cilium cilium-dbg config command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_config/
- Cilium cilium-dbg identity list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium Hubble exporter/filter documentation: https://docs.cilium.io/en/latest/observability/hubble/configuration/export.html

## Issues Found
- The endpoint policy coverage examples used `cilium endpoint list`, but current Cilium documentation exposes local endpoint inspection through `cilium-dbg endpoint list` inside an agent pod and cluster-wide endpoint inventory through the `CiliumEndpoint` CRD. Updated the cluster-wide audit examples to use `kubectl get cep --all-namespaces -o json`.
- The jq paths for realized L4 policy used `"l4-ingress"` and `"l4-egress"`, but documented Cilium endpoint status uses `.status.policy.realized.l4.ingress` and `.status.policy.realized.l4.egress`. Updated the jq filters accordingly.
- The generated audit report counted endpoint coverage only through the invalid `cilium endpoint list` path and only ingress policy. Updated it to use `CiliumEndpoint` objects and count either realized ingress or egress L4 policy.
- The policy inventory example only listed namespaced CiliumNetworkPolicy objects even though the post describes inventorying all Cilium network policies. Added a CiliumClusterwideNetworkPolicy inventory command.
- The per-node configuration example used `cilium config view` inside Cilium agent pods. The documented local-agent command is `cilium-dbg config --all`; updated the command and matched documented config keys such as `enable-policy` and `enable-l7-proxy`.
- The verification example used `cilium policy get`, which is not the current Kubernetes-facing Cilium CLI command. Updated it to list CiliumNetworkPolicy resources with `kubectl get cnp --all-namespaces -o json`.
- The identity verification command used `cilium identity list`, but identity inspection is documented under `cilium-dbg identity list`. Updated the command to execute `cilium-dbg identity list` in a Cilium agent pod.

## Review Notes
The CiliumNetworkPolicy YAML structure and HTTP L7 policy fields are consistent with Cilium documentation. The Hubble dropped-flow command uses documented `--verdict DROPPED` filtering and the `drop_reason_desc` field. Future improvements could include explicitly documenting that `cilium-dbg` commands inspect local agent state unless run across multiple Cilium pods.
