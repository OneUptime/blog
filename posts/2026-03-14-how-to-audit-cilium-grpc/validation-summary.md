# Validation Summary: Auditing gRPC Traffic in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- CiliumEndpoint
- Hubble
- gRPC
- jq

## Sources Consulted
- Cilium Securing gRPC documentation: https://docs.cilium.io/en/stable/security/grpc.html
- Cilium Kubernetes Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium API reference for endpoint policy status fields: https://docs.cilium.io/en/stable/api.html
- Cilium command reference for cilium-dbg endpoint, policy, identity, and config commands: https://docs.cilium.io/en/stable/cmdref/
- Cilium CLI configuration command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config.html
- Cilium policy enforcement mode documentation: https://docs.cilium.io/en/latest/security/policy/intro/
- Hubble CLI flow inspection documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Hubble exporter examples and flow JSON field documentation: https://docs.cilium.io/en/latest/observability/hubble/configuration/export.html

## Issues Found
- The policy coverage examples used `cilium endpoint list` as a cluster-wide command and checked non-existent flattened fields such as `l4-ingress` and `l4-egress`. I changed these examples to query the Kubernetes `CiliumEndpoint` CRD and use the documented `.status.policy.realized."policy-enabled"` field.
- The audit report script counted endpoints with `cilium endpoint list`, which is agent-local debug CLI behavior rather than a reliable cluster-wide Kubernetes audit source. I changed it to count `CiliumEndpoint` objects across all namespaces.
- The per-node configuration check used `cilium config view` inside agent pods and grepped for `policy-enforcement`, which is not the documented agent option name. I changed the per-agent check to use `cilium-dbg config get` for `enable-policy`, `enable-l7-proxy`, and `enable-hubble`.
- The example policy claimed to include audit annotations but did not include any annotations. I added minimal audit annotations under `metadata.annotations`.
- The verification commands used `cilium policy get` and `cilium identity list` as if they were Kubernetes-facing Cilium CLI commands. I changed them to use `cilium-dbg policy get` and `cilium-dbg identity list` inside a Cilium agent pod.
- The troubleshooting command grepped `kubectl describe cnp -A` for `Enforcement`, which is not a reliable CiliumNetworkPolicy status check. I changed it to inspect the structured `.status` field from `kubectl get cnp -A -o json`.

## Review Notes
The gRPC CiliumNetworkPolicy example is consistent with Cilium's documented approach of matching gRPC methods as HTTP POST paths. Hubble `observe --verdict DROPPED --last 100 -o json` and the `.flow.drop_reason_desc` field are consistent with Hubble examples and flow JSON documentation.
