# Validation Summary: Validating Interface and Subnet Cache in Cilium IPAM

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNode CRD
- Cilium IPAM
- Azure IPAM
- AWS ENI IPAM
- kubectl
- jq
- Azure CLI
- AWS CLI

## Sources Consulted
- Cilium Azure IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/azure/
- Cilium AWS ENI IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/eni/
- Cilium CRD-backed IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/crd/
- Cilium cluster-scope IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/cluster-pool/
- Cilium CiliumNode API source: https://github.com/cilium/cilium/blob/main/pkg/k8s/apis/cilium.io/v2/types.go
- Cilium IPAM API source: https://github.com/cilium/cilium/blob/main/pkg/ipam/types/types.go
- Cilium AWS ENI API source: https://github.com/cilium/cilium/blob/main/pkg/aws/eni/types/types.go
- Cilium Azure API source: https://github.com/cilium/cilium/blob/main/pkg/azure/types/types.go

## Issues Found
- The interface discovery examples read Azure interfaces and AWS ENIs from `.spec.azure.interfaces` and `.spec.eni.enis`. Those fields are published as observed CiliumNode status, not spec configuration. Updated the examples to use `.status.azure.interfaces` and `.status.eni.enis`.
- The prerequisites listed `gcloud`, but the post only covers Azure IPAM and AWS ENI cache validation. Updated the cloud CLI prerequisite to `az or aws`.
- The cache freshness example used `.metadata.managedFields[-1].time`, which assumes the last managedFields entry is the newest one. Updated it to calculate the maximum timestamp from managedFields entries.

## Review Notes
The commands are example validation checks and still require environment-specific values such as Azure resource group names and AWS tag filters. Cilium Azure IPAM is documented as legacy in current Cilium documentation, so future revisions should clarify which Cilium IPAM mode the guide targets.
