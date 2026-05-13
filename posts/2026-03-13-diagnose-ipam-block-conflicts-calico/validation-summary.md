# Validation Summary: How to Diagnose IPAM Block Conflicts in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico IPAM
- calicoctl
- Kubernetes pods and nodes
- Calico BlockAffinity and IPAMBlock resources
- Shell commands with awk, grep, sort, and uniq

## Sources Consulted
- Calico documentation: Get started with IP address management - https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico documentation: calicoctl ipam check - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: BlockAffinity resource - https://docs.tigera.io/calico/latest/reference/resources/blockaffinity
- Calico API reference: IPAMBlockSpec - https://pkg.go.dev/github.com/projectcalico/api/pkg/apis/projectcalico/v3
- Kubernetes documentation: kubectl get - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The post described `calicoctl ipam show --show-blocks` as listing block affiliations. Official Calico documentation describes this flag as showing detailed IP usage for IP blocks and pools; affinity is represented by BlockAffinity resources and IPAMBlock affinity fields. Changed the step heading to "List all IPAM blocks and usage."
- The post described pods as "failing to schedule" due to IPAM allocation errors. IPAM allocation happens during pod networking setup after the scheduler has assigned the pod to a node, so this is more accurately a pod start/sandbox creation failure. Changed the wording to "failing to start" in the introduction and symptoms.

## Review Notes
- The commands and flags for `calicoctl ipam check`, `calicoctl ipam check --show-all-ips`, and `calicoctl ipam show --show-blocks` match current Calico documentation.
- Calico documentation confirms the default IPAM block size is 64 addresses, `/26` for IPv4 and `/122` for IPv6; the post's "typically /26" wording is accurate for IPv4.
- The BlockAffinity resource fields used by the post are consistent with the documented `spec.node` and `spec.cidr` fields.
