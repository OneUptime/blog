# Validation Summary: Set Up AKS Confidential Containers with AMD SEV-SNP Encrypted Virtual Machines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- AKS Confidential Containers
- AMD SEV-SNP
- Kata Containers / Kata CoCo
- Kubernetes RuntimeClass
- Azure CLI
- Azure Key Vault Premium
- Azure Key Vault Secure Key Release
- Microsoft Azure Attestation

## Sources Consulted
- Microsoft Learn: Deploy an AKS cluster with Confidential Containers and an automatically generated policy - https://learn.microsoft.com/en-us/azure/aks/deploy-confidential-containers-default-policy
- Microsoft Learn: Confidential Containers on Azure Kubernetes Service - https://learn.microsoft.com/en-us/azure/confidential-computing/confidential-containers-on-aks-preview
- Microsoft Learn: az confcom CLI reference - https://learn.microsoft.com/en-us/cli/azure/confcom
- Microsoft Learn: Azure Key Vault Secure Key Release with Azure Confidential Computing - https://learn.microsoft.com/en-us/azure/confidential-computing/concept-skr-attestation
- Microsoft Learn: az keyvault key CLI reference - https://learn.microsoft.com/en-us/cli/azure/keyvault/key
- Microsoft Learn: DCas_cc_v5 size series - https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dcasccv5-series
- AMD: Secure Encrypted Virtualization / confidential computing documentation - https://www.amd.com/en/products/processors/server/epyc/confidential-computing.html

## Issues Found
- The post listed `Standard_DC2as_v5`, `Standard_DC4as_v5`, and `Standard_DC8as_v5` as AKS confidential container node sizes. Updated the examples and node pool command to use the documented confidential-child-capable `Standard_DC*as_cc_v5` sizes.
- The prerequisite section omitted the AKS preview and `confcom` CLI extensions. Added `az extension add --name aks-preview` and `az extension add --name confcom` because the official AKS workflow requires them for preview support and policy generation.
- The cluster creation command omitted OIDC issuer and workload identity enablement, which the official AKS confidential containers flow requires for the attestation and Key Vault integration path. Added `--enable-oidc-issuer` and `--enable-workload-identity`.
- The runtime class was shown as `kata-cc`. Updated it to `kata-cc-isolation`, matching the current AKS documentation.
- The security policy example used a handwritten JSON policy with fields such as `allowed_images` and `allowed_env_vars`. Replaced it with the `az confcom katapolicygen --yaml` flow and a base64 policy annotation placeholder, matching the supported AKS policy generation model.
- The post said the security policy is enforced by hardware attestation. Clarified that the Kata agent enforces the policy inside the guest and that the policy is measured for attestation.
- The attestation example modeled the SKR container as an init container running `/skr`. Updated it to a sidecar container using `/bin/skr`, matching Microsoft examples for secure key release with confidential containers.
- The AMD SEV-SNP memory encryption description claimed AES-256 specifically. Removed the algorithm-size claim and described hardware memory encryption more generally to avoid an inaccurate or generation-dependent statement.

## Review Notes
The post still presents performance overhead numbers as approximate guidance. Those values are workload-dependent and should be treated as estimates rather than service guarantees.
