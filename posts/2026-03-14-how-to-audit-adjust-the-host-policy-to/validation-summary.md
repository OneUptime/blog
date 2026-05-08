# Validation Summary: Auditing Host Policy Adjustment in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Cilium host firewall and host policies
- CiliumClusterwideNetworkPolicy and CiliumNetworkPolicy
- Kubernetes
- Hubble CLI
- jq
- Bash

## Sources Consulted
- Cilium Host Firewall documentation: https://docs.cilium.io/en/stable/security/host-firewall/
- Cilium Host Policies documentation: https://docs.cilium.io/en/latest/security/policy/host/
- Cilium Network Policy documentation: https://docs.cilium.io/en/latest/network/kubernetes/policy/
- Cilium command cheatsheet: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg config` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_config/
- Cilium `cilium-dbg identity list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting.html
- Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Hubble flow API documentation: https://docs.cilium.io/en/stable/_api/v1/flow/README.html

## Issues Found
- The prerequisites did not mention that host firewall must be enabled for Cilium host policies. Added `hostFirewall.enabled=true` to match Cilium host policy installation requirements.
- The policy inventory command only listed namespaced `CiliumNetworkPolicy` resources. Added `CiliumClusterwideNetworkPolicy` inventory because host policies use clusterwide policies with `nodeSelector`.
- Several examples used `cilium endpoint list`, `cilium config view`, and `cilium identity list` as local commands. Updated daemon-level inspection examples to run `cilium-dbg` inside Cilium agent pods, which matches current Cilium documentation.
- Endpoint policy coverage examples referenced non-existent JSON paths such as `.status.policy.realized."l4-ingress"` and `.status.policy.realized."l4-egress"`. Updated the jq expressions to use `.status.policy.realized.l4.ingress` and `.status.policy.realized.l4.egress`.
- The audit report counted only endpoints with ingress policy. Updated the coverage calculation to count endpoints with either ingress or egress realized L4 policy.
- The verification command used deprecated daemon policy output for policy names. Replaced it with Kubernetes CRD inventory commands for `cnp` and `ccnp`.
- The troubleshooting note suggested grepping for an `Enforcement` string in `kubectl describe cnp -A`, which is not a reliable status check. Replaced it with broader `kubectl describe cnp -A` and `kubectl describe ccnp` guidance.

## Review Notes
The Hubble dropped-flow command and use of `.flow.drop_reason_desc` are consistent with current Hubble documentation. The sample host policy structure is valid for Cilium host policies because `CiliumClusterwideNetworkPolicy` supports `nodeSelector`.
