# Validation Summary: Auditing Network Security Overview in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- CiliumClusterwideNetworkPolicy
- CiliumEndpoint
- Cilium identities
- Hubble
- kubectl
- jq

## Sources Consulted
- Cilium Network Policy documentation: https://docs.cilium.io/en/latest/network/kubernetes/policy/
- Cilium policy enforcement modes: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Kubernetes policy examples: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- CiliumEndpoint documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium API reference for endpoint policy and identity fields: https://docs.cilium.io/en/stable/api/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg config` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_config/
- Cilium `cilium-dbg identity list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/latest/observability/hubble/setup/
- Hubble CLI observe flag reference issue, from the official Cilium Hubble repository: https://github.com/cilium/hubble/issues/1280

## Issues Found
- The policy inventory only listed namespaced CiliumNetworkPolicy resources. Added CiliumClusterwideNetworkPolicy inventory so the command matches the "all Cilium network policies" wording.
- The endpoint policy coverage commands used invalid realized-policy JSON paths such as `l4-ingress` and `l4-egress`. Replaced them with CiliumEndpoint queries using the documented `status.policy.realized."policy-enabled"` field.
- The endpoint label output used an incorrect `.status.labels.id` path. Replaced it with documented identity fields: `.status.identity.id` and `.status.identity.labels`.
- The audit report script used `cilium endpoint list`, which is not part of the current Kubernetes-facing Cilium CLI. Replaced it with `kubectl get ciliumendpoints --all-namespaces -o json`.
- The node configuration check executed `cilium config view` inside Cilium agent pods. Current agent-local inspection is through `cilium-dbg`, so the command now uses `cilium-dbg config --all`.
- The example policy claimed to include audit annotations but did not define any annotations. Added minimal audit annotations under `metadata.annotations`.
- The kube-dns endpoint selector used label keys without the Cilium `k8s:` prefix. Updated them to match official Cilium policy examples.
- The verification commands used `cilium policy get` and `cilium identity list`, which are not current Kubernetes-facing Cilium CLI commands. Replaced them with Kubernetes resource queries for CNP/CCNP and CiliumIdentity resources.
- The troubleshooting command relied on grepping `kubectl describe` output for an `Enforcement` string. Replaced it with a JSON status query that is more reliable and machine-readable.

## Review Notes
The post is technically relevant and now aligns with current Cilium documentation for Cilium 1.14+ and current stable docs. The Hubble drop-statistics command uses documented `hubble observe` filters and JSON output; exact JSON fields can vary by Hubble/Cilium release, so users may need to inspect a sample event if their deployment emits a different drop reason field.
