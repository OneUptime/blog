# Validation Summary: Securing gRPC Traffic in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- gRPC
- Hubble
- Envoy L7 policy enforcement

## Sources Consulted
- Cilium Securing gRPC documentation: https://docs.cilium.io/en/stable/security/grpc.html
- Cilium Policy Enforcement Modes documentation: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium Layer 7 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Helm Reference for `policyEnforcementMode`: https://docs.cilium.io/en/stable/helm-reference/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg/
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium Hubble observability documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Cilium Hubble exporter filter examples: https://docs.cilium.io/en/stable/observability/hubble/configuration/export/
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint/

## Issues Found
- The introduction implied all fine-grained security enforcement happens at the kernel level. Cilium uses eBPF for datapath visibility and enforcement, but L7 gRPC-aware policy is enforced through Cilium's Envoy proxy integration, so the wording was corrected.
- Several diagnostics used agent-local commands as if they were part of the workstation `cilium` Kubernetes CLI, including `cilium identity list`, `cilium endpoint list`, and `cilium monitor`. These were changed to run `cilium-dbg` inside the Cilium DaemonSet with `kubectl -n kube-system exec ds/cilium -- ...`.
- The drop-monitoring command used `--output json`, which is not the documented flag for `cilium-dbg monitor`. It now uses `--json`.
- The post recommended `cilium policy get -o json` to list active policies. That command is part of `cilium-dbg`, is documented as deprecated, and is not the best Kubernetes-facing way to list installed policy resources. It was replaced with `kubectl get cnp,ccnp -A`.
- The troubleshooting command for endpoint labels used the wrong CLI surface. It now queries `CiliumEndpoint` CRDs with `kubectl get ciliumendpoints -n production -o json | jq '.items[].status.identity.labels'`.

## Review Notes
The CiliumNetworkPolicy examples use current `cilium.io/v2` policy syntax and the gRPC path mapping through HTTP `POST` rules matches Cilium's official gRPC documentation. The examples assume Hubble CLI access is already configured, which is consistent with the prerequisites.
