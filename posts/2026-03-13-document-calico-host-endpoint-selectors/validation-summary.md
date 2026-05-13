# Validation Summary: Document Calico Host Endpoint Selectors for Operators

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico HostEndpoint resources
- Calico GlobalNetworkPolicy resources
- Calico label selectors
- calicoctl
- Kubernetes node labels
- Bash and Python JSON processing

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico host endpoints overview: https://docs.tigera.io/calico/latest/reference/host-endpoints/overview
- Calico creating host endpoint objects: https://docs.tigera.io/calico/latest/reference/host-endpoints/objects
- Calico selector-based host endpoint policies: https://docs.tigera.io/calico/latest/reference/host-endpoints/selector
- Calico protect Kubernetes nodes with host endpoints: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The runbook used `calicoctl get hep --selector="node-role == 'old-value'" -o wide`, but the official `calicoctl get` reference lists output, namespace, file, config, export, and related flags, not a `--selector` flag. I replaced it with `calicoctl get hep -o json` piped to a small Python filter that selects HostEndpoint objects by `metadata.labels["node-role"]`.
- The runbook was inside a Markdown code fence but also contained nested triple-backtick command blocks, which would prematurely close the outer fence. I changed the outer fence to four backticks and marked the inner command fences as `bash`.

## Review Notes
The selector examples such as `node-role == 'control-plane'`, `has(node-role)`, and `node-role == 'worker' && workload-type == 'gpu'` match Calico's documented selector language. The use of HostEndpoint labels and GlobalNetworkPolicy selectors is consistent with Calico's host endpoint documentation. The export script uses valid pluralized Calico resource names; `calicoctl` documents resource types as case-insensitive and pluralizable.
