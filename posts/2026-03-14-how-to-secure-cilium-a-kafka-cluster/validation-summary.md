# Validation Summary: Securing Kafka Cluster in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- Kafka
- Hubble
- Helm
- kubectl
- cilium CLI and cilium-dbg

## Sources Consulted
- Cilium Layer 7 Policies documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Securing a Kafka Cluster documentation: https://docs.cilium.io/en/stable/security/kafka/
- Cilium Policy Enforcement Modes documentation: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium Upgrade Guide: https://docs.cilium.io/en/stable/operations/upgrade/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium config view command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium cilium-dbg monitor command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium cilium-dbg policy get command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_policy_get/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Hubble CLI / observability documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The post described Kafka-aware Cilium policy as generally available for Cilium v1.14+ without caveats. I changed the prerequisite to Cilium v1.14 through v1.19 for Kafka-aware Layer 7 policies and added a note that Kafka policy support is deprecated in Cilium v1.19 and scheduled for removal in v1.20.
- The introduction implied all fine-grained enforcement happens at the kernel level. I corrected this to distinguish Cilium's eBPF network-layer enforcement from Layer 7 policy enforcement, which is proxied through Envoy.
- Several examples mixed `kafka` and `production` namespaces. I aligned the policy verification, default-deny policy, Hubble drop observation, and troubleshooting commands to the `kafka` namespace used by the main policy.
- The post used `cilium policy get`, `cilium endpoint list`, and `cilium monitor --output json` as if they were current Cilium Kubernetes CLI commands. I replaced them with current Kubernetes CRD inspection commands or `cilium-dbg` commands executed in the Cilium agent pod.
- The `cilium policy get` command is documented as deprecated, so I replaced the "list policies" example with `kubectl get cnp -A`.
- The cross-namespace Hubble analysis pipeline emitted multi-line JSON objects and then sorted them line-by-line. I changed it to emit tab-separated rows with `jq -r ... | @tsv` before sorting and counting.

## Review Notes
The Kafka policy YAML structure, including `rules.kafka`, `role`, `topic`, and `clientID`, matches the Cilium Layer 7 policy schema for versions that still support Kafka policy. The default-deny behavior is consistent with Cilium's per-direction default-deny model when a policy selects endpoints with ingress or egress sections. Future revisions should consider replacing Kafka Layer 7 policy guidance if the target Cilium version is v1.20 or newer.
