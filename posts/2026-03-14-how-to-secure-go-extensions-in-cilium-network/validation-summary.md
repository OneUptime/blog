# Validation Summary: Securing Go Extensions in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- Hubble
- eBPF
- Envoy Go Extensions/proxylib
- Helm

## Sources Consulted
- Cilium policy enforcement modes: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Kubernetes policy constructs: https://docs.cilium.io/en/stable/security/policy/kubernetes/
- Cilium Layer 4 policy reference: https://docs.cilium.io/en/latest/security/policy/layer4/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium v1.19 upgrade guide: https://docs.cilium.io/en/stable/operations/upgrade/
- Cilium Go Extensions/proxylib documentation: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium debug CLI endpoint list reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Cilium debug CLI identity list reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_identity_list/
- Cilium debug CLI monitor reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html

## Issues Found
- The post described Go extension development as generally supported for Cilium v1.14+ without noting that Envoy Go Extensions/proxylib support was removed in Cilium v1.19. Updated the prerequisite and wording so the guidance is accurate for pre-v1.19 Go extensions and for securing replacement Kubernetes workloads on v1.19+.
- The post used `cilium policy get -o json` to list active policies. The current Cilium debug policy command is deprecated and the regular Cilium CLI does not expose this as the recommended Kubernetes policy inventory command. Replaced it with `kubectl get cnp -A -o json`.
- The post used `cilium identity list`, `cilium endpoint list`, and `cilium monitor --type drop --output json` as if they were regular Cilium CLI commands. In current Cilium, these are in-agent debug CLI workflows via `cilium-dbg`, and monitor uses `--json` instead of `--output json`. Updated the examples to run `cilium-dbg` through `kubectl exec ds/cilium`.
- Updated the troubleshooting endpoint-label command to use `cilium-dbg endpoint list -o json` through `kubectl exec`, matching the corrected verification command.

## Review Notes
The CiliumNetworkPolicy examples use valid `apiVersion: cilium.io/v2`, selector, ingress, egress, and `toPorts` structures. `policyEnforcementMode=always` is a valid Helm value, but operators should test it carefully because it enables policy enforcement on all endpoints.
