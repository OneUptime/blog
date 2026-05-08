# Validation Summary: Validating Host Policy Adjustment in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Cilium host firewall and host policies
- CiliumClusterwideNetworkPolicy
- Kubernetes
- kubectl
- Hubble
- Bash
- jq

## Sources Consulted
- Cilium Host Firewall documentation: https://docs.cilium.io/en/stable/security/host-firewall/
- Cilium Host Policies documentation: https://docs.cilium.io/en/latest/security/policy/host/
- Cilium Network Policy documentation: https://docs.cilium.io/en/latest/network/kubernetes/policy/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium Troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium command reference for `cilium` CLI: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium command reference for `cilium-dbg endpoint get`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium command reference for `cilium-dbg endpoint health`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_health/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run

## Issues Found
- The prerequisites did not mention that Cilium's host firewall must be enabled for host policies. Added `hostFirewall.enabled=true` to make the requirement explicit.
- The post used `cilium endpoint list` and `cilium endpoint health`, but current Cilium documentation exposes endpoint inspection through `cilium-dbg` on the agent or through Kubernetes `CiliumEndpoint` resources. Updated those examples to use `kubectl exec ds/cilium -- cilium-dbg ...` and `kubectl get ciliumendpoints.cilium.io`.
- The post used `cilium policy get` in the validation script. Updated the script to count Kubernetes-distributed Cilium policy resources with `kubectl get cnp` and `kubectl get ccnp`, which matches the documented Kubernetes policy distribution path.
- The post implied the `nodeSelector` host policy would block an ordinary pod-to-service request from an unauthorized pod. Cilium host policies apply to the selected nodes' host namespace, including host-networking pods, and do not apply to normal pod-to-pod or pod-to-service traffic. Updated the wording so the workload request is treated as a non-host-policy sanity check and the Hubble drop query is used for failed validation investigation.
- The validation script used post-increment arithmetic such as `((PASS++))` with `set -e`. In Bash, this can return a non-zero status when the previous value is zero and terminate the script early. Replaced those increments with `((PASS+=1))` and `((FAIL+=1))`.

## Review Notes
The host policy YAML is syntactically consistent with Cilium's documented `CiliumClusterwideNetworkPolicy` host policy shape, but the label selector and allowed CIDRs/ports remain environment-specific examples. The Hubble examples assume Hubble Relay or an equivalent Hubble CLI connection is already available.
