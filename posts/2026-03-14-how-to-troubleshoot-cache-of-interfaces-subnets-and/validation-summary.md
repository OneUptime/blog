# Validation Summary: Troubleshooting Interface and Subnet Cache Issues in Cilium IPAM

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium IPAM
- CiliumNode custom resources
- Kubernetes kubectl
- AWS ENI IPAM
- Azure IPAM
- jq

## Sources Consulted
- Cilium AWS ENI IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/eni/
- Cilium Azure IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/azure/
- Cilium CRD-backed IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/crd/
- Cilium CRD-backed IPAM tutorial: https://docs.cilium.io/en/latest/network/kubernetes/ipam-crd.html
- Cilium CLI status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- CiliumNode CRD schema reference: https://manifests.fyi/cilium.io/v2/CiliumNode/

## Issues Found
- The post checked `.spec.azure.interfaces` and `.spec.eni` for cloud interface data. Cilium records Azure interfaces under `.status.azure.interfaces` and AWS ENIs under `.status.eni.enis`, so the commands were updated to use those status fields.
- The post used `.metadata.managedFields[-1].time` as a freshness check. Managed fields are not a reliable single freshness timestamp for Cilium IPAM data, so the command now lists Cilium-managed entries with manager, operation, and time.
- The subnet discovery command treated `.spec.ipam.pool` as subnet information. That field is the IPv4 allocation pool, so the AWS command now checks `.spec.eni["subnet-ids"]`, `.spec.eni["subnet-tags"]`, and `.spec.eni["node-subnet-id"]`; the Azure command now reads reported address subnets from `.status.azure.interfaces[].addresses[].subnet`.
- The credential environment lookup assumed credentials were only in the first container and that every container had an `env` array. The command now iterates all containers and uses `env[]?`.
- The verification command used `cilium status | grep IPAM`, but the documented Cilium CLI `status` output is not the best source for CiliumNode IPAM pool details. It now uses `cilium status --wait` for health and a CiliumNode query for IPAM pool, used IP, and operator status data.
- Operator log commands used the label selector `name=cilium-operator`, which is not guaranteed across Cilium installs. They now target `deployment/cilium-operator`, which matches Cilium's documented operator deployment name and kubectl logs syntax.

## Review Notes
Local `kubectl` and `cilium` binaries were not installed in the review environment, so command behavior was verified against official documentation and the updated `jq` expressions were syntax-tested locally with sample JSON.
