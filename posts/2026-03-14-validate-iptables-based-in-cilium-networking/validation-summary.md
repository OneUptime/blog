# Validation Summary: Validating iptables-Based Masquerading in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- iptables masquerading
- Cilium CLI and cilium-dbg
- Hubble observability
- Helm
- BusyBox wget

## Sources Consulted
- Cilium Masquerading documentation: https://docs.cilium.io/en/latest/network/concepts/masquerading.html
- Cilium iptables usage documentation: https://docs.cilium.io/en/latest/network/ebpf/iptables/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- cilium-dbg endpoint list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- cilium-dbg metrics list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium Hubble observability documentation: https://docs.cilium.io/en/stable/observability/hubble/
- BusyBox wget help output from local BusyBox 1.36.1

## Issues Found
- The iptables validation commands were shown as local host commands. Changed them to run through a Cilium agent pod with `kubectl exec -n kube-system ds/cilium -c cilium-agent -- ...`, because Cilium installs the relevant `CILIUM_POST_nat` rules on cluster nodes.
- The post used `cilium endpoint list` and `cilium metrics list`, but current Cilium documentation exposes those in-agent inspection commands through `cilium-dbg`. Updated the examples to use `cilium-dbg endpoint list` and `cilium-dbg metrics list`.
- The endpoint-count check claimed Cilium endpoints should match running pod count. Updated it to compare the selected agent's endpoint count with cluster `CiliumEndpoint` resources, because CiliumEndpoint objects include Cilium-managed endpoints and Cilium health endpoints rather than being a simple count of all running pods.
- The BusyBox `wget` examples used `--timeout=5`, which is not supported by the checked BusyBox wget implementation. Replaced it with `-T 5`.
- The connectivity examples focused on pod-to-pod and service traffic, which do not directly exercise masqueraded egress. Added `pod-to-world` and a custom pod egress check so the validation better matches iptables-based masquerading behavior.
- The DNS connectivity test selector was changed to `'/dns-only'`, matching Cilium's documented `--test` regular-expression selector examples.

## Review Notes
The guide is version-flexible and does not pin a Cilium version. Some command output and exact test names can vary by Cilium CLI version, but the corrected examples align with current official Cilium documentation.
