# Validation Summary: Validating Encapsulation in Cilium Networking

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium CLI
- CiliumEndpoint CRDs
- Hubble
- Helm
- VXLAN and Geneve encapsulation

## Sources Consulted
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium System Requirements documentation: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium troubleshooting and Hubble flow observation documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint.html
- Cilium endpoint lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- cilium-dbg endpoint list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- cilium-dbg metrics list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/

## Issues Found
- The introduction said encapsulation has no requirements on the underlying network. Cilium documentation states encapsulation has minimal requirements, but nodes must have node-to-node IP connectivity and the encapsulation UDP port must be allowed. Updated the wording to reflect this.
- The prerequisites did not state that inter-node encapsulation validation needs at least two schedulable nodes. Added that prerequisite.
- The validation workload used preferred pod anti-affinity, which could allow both server replicas to run on the same node. Changed it to required anti-affinity so the workload actually exercises inter-node traffic when the prerequisites are met.
- The endpoint validation used `cilium endpoint list`, which is not the current documented agent-local command. Updated agent-local references to `cilium-dbg` where appropriate.
- The endpoint validation attempted to use an agent-local endpoint list as if it were cluster-wide. Updated the cluster-wide endpoint checks to use `kubectl get ciliumendpoints --all-namespaces`, matching Cilium's CiliumEndpoint CRD documentation.
- The metrics commands used `cilium metrics list` inside Cilium pods. Updated them to the current documented `cilium-dbg metrics list`.
- The `cilium connectivity test --test` examples used category-like names that are not documented as exact test names. Updated them to use regex-style matches consistent with the command reference.

## Review Notes
The guide is technically relevant and remains a useful validation workflow. The endpoint-to-pod count comparison is now framed as a comparison rather than an exact equality check because host-network pods, unmanaged pods, and Cilium health endpoints can make the counts differ.
