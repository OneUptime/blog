# Validation Summary: Troubleshooting gRPC Traffic in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- Hubble
- gRPC
- eBPF datapath troubleshooting

## Sources Consulted
- Cilium Troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium gRPC security policy documentation: https://docs.cilium.io/en/stable/security/grpc/
- Cilium Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium Endpoint Lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg endpoint get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium `cilium-dbg endpoint health` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_health/
- Cilium API reference for endpoint policy status fields: https://docs.cilium.io/en/stable/api/
- Hubble setup and troubleshooting documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Hubble CLI flow inspection documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/

## Issues Found
- The post used `cilium endpoint ...` and `cilium identity ...` as local commands. Current Cilium documentation exposes endpoint and identity inspection through the agent-local `cilium-dbg` command, typically run inside a Cilium pod in Kubernetes. Updated examples to use `kubectl -n kube-system exec ds/cilium -- cilium-dbg ...`.
- The realized policy jq example referenced non-existent fields `status.policy.realized."l4-ingress"` and `status.policy.realized."l4-egress"`. Updated them to the documented `status.policy.realized.l4.ingress` and `status.policy.realized.l4.egress` paths.
- The verification step used `cilium endpoint health` without the required endpoint ID and as the wrong CLI. Replaced it with `kubectl -n kube-system exec ds/cilium -- cilium-health status --verbose`, matching Cilium troubleshooting guidance for health validation.
- The troubleshooting section recommended `cilium endpoint regenerate all`, which is not present in the current documented command reference. Replaced it with guidance to inspect endpoint regeneration state and agent logs, noting that Cilium regenerates endpoints automatically after policy, identity, or configuration changes.
- The Hubble relay pod selector used `app.kubernetes.io/name=hubble-relay`; official Cilium troubleshooting examples use `k8s-app=hubble-relay`. Updated the selector.

## Review Notes
The gRPC CiliumNetworkPolicy example is consistent with Cilium's documented approach of matching gRPC methods as HTTP POST paths such as `/package.Service/Method`. Hubble commands and JSON fields are consistent with documented Hubble flow output. Local Cilium and Hubble CLIs were not installed in the review environment, so CLI behavior was verified against official documentation rather than local `--help` output.
