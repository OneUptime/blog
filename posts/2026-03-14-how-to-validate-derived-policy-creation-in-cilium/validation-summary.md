# Validation Summary: Validating Derived Policy Creation in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- CiliumEndpoint
- Cilium CLI / cilium-dbg
- jq
- Bash

## Sources Consulted
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Cilium command reference for `cilium-dbg endpoint get`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium command reference for `cilium-dbg bpf policy get`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_get.html
- Cilium command reference for deprecated `cilium-dbg policy get`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_policy_get.html
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium API reference for endpoint policy fields: https://docs.cilium.io/en/stable/api.html
- Cilium endpoint lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/

## Issues Found
- The post used `cilium endpoint list`, `cilium endpoint get`, and `cilium policy get`. Current Cilium documentation exposes endpoint inspection through the agent debug CLI as `cilium-dbg endpoint ...`, while the external `cilium` CLI is for Kubernetes cluster management operations such as install, status, and sysdump. I changed the examples to execute `cilium-dbg` inside Cilium agent pods with `kubectl exec`.
- The post described validating every endpoint in the cluster, but a single `cilium-dbg endpoint list` call only lists endpoints known to one Cilium agent. I changed the scripts to iterate over all `k8s-app=cilium` pods in `kube-system`.
- The verification section used `cilium policy get`, which Cilium now documents as deprecated. I replaced it with `cilium-dbg bpf policy get --all` for datapath policy-map inspection and `kubectl get ciliumendpoints --all-namespaces` for cluster-wide endpoint visibility.
- The first jq check treated policy presence as a boolean based on `.status.policy != null`, which is not the useful validation target for Cilium endpoint policy state. I changed it to inspect the documented desired and realized `policy-enabled` fields and report endpoints where either field is missing.

## Review Notes
The corrected examples validate Cilium's endpoint policy state and realized policy data, but they still require the reviewer to compare rule counts against the expected policy intent for their application. In real clusters, the Cilium DaemonSet label or namespace can differ from the default `k8s-app=cilium` and `kube-system` values.
