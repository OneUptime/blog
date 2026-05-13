# Validation Summary: How to Set Up Flux on AKS with Confidential Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- AKS Confidential Containers
- AMD SEV-SNP confidential VM sizes
- Kata Containers / Kata confidential runtime
- Kubernetes RuntimeClass
- Kubernetes Deployment, Service, Ingress, and CronJob manifests
- Flux CD bootstrap and Flux Kustomizations
- Kustomize bootstrap customization
- Microsoft Azure Attestation
- Azure CLI `aks-preview` and `confcom` extensions

## Sources Consulted
- Microsoft Learn: Deploy an AKS cluster with Confidential Containers and an automatically generated policy, https://learn.microsoft.com/en-us/azure/aks/deploy-confidential-containers-default-policy
- Microsoft Learn: Security policy for Confidential Containers on Azure Kubernetes Service, https://learn.microsoft.com/en-us/azure/confidential-computing/confidential-containers-aks-security-policy
- Microsoft Learn: Confidential Containers on Azure Kubernetes Service overview, https://learn.microsoft.com/en-us/azure/confidential-computing/confidential-containers-on-aks-preview
- Microsoft Learn: Azure CLI `az confcom katapolicygen`, https://learn.microsoft.com/en-us/cli/azure/confcom?view=azure-cli-latest
- Flux documentation: Bootstrap for GitHub, https://fluxcd.io/flux/installation/bootstrap/github/
- Flux documentation: Bootstrap customization, https://fluxcd.io/flux/installation/configuration/bootstrap-customization/
- Flux documentation: Kustomization patches, https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes documentation: RuntimeClass, https://kubernetes.io/docs/concepts/containers/runtime-class/
- Kubernetes documentation: Ingress, https://kubernetes.io/docs/concepts/services-networking/ingress/
- Azure Virtual Machines documentation: DCas_cc_v5 size series, https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dcasccv5-series

## Issues Found
- The prerequisites omitted the Azure CLI extensions used by the official AKS confidential containers workflow. Added `aks-preview` and `confcom`.
- The AKS setup commands omitted the `KataCcIsolationPreview` feature registration and provider refresh flow required by current Microsoft guidance. Added feature registration, status check, and provider registration commands.
- The AKS cluster creation command omitted OIDC issuer and workload identity flags shown in the official confidential containers deployment path. Added `--enable-oidc-issuer` and `--enable-workload-identity`.
- The confidential node pool command omitted `--os-sku AzureLinux`, which Microsoft documents as required for `KataCcIsolation` in the current preview. Added the flag.
- The existing-cluster confidential node pool flow omitted the `az aks update` step from Microsoft guidance. Added it after node pool creation.
- The node verification text incorrectly implied `kubectl get nodes -o wide` would show a runtime class. Updated it to verify the confidential node pool by its `agentpool=confpool` label and kept RuntimeClass verification in the next step.
- The RuntimeClass wording said the name would be `kata-cc-isolation` "or similar." Current AKS examples use `kata-cc-isolation`, so the text now states that exact RuntimeClass name.
- The Flux controller scheduling example used a Flux `Kustomization` custom resource where Flux bootstrap customization should use a `kustomize.config.k8s.io/v1beta1` Kustomization file over `gotk-components.yaml` and `gotk-sync.yaml`. Replaced the snippet with the documented Kustomize patch approach.
- The security policy section used an unrelated ConfigMap containing hand-written Rego that would not be passed to the Kata agent. Replaced it with `az confcom katapolicygen --yaml`, which injects the base64-encoded policy annotation AKS uses.
- The Ingress example used the deprecated `kubernetes.io/ingress.class` annotation. Replaced it with `spec.ingressClassName: nginx`.
- The attestation section implied that merely running a CronJob verifies workloads. Clarified that the verifier image must retrieve AMD SEV-SNP evidence from inside the confidential pod and submit it to Microsoft Azure Attestation.

## Review Notes
- AKS Confidential Containers are still documented as preview, and requirements may change. The post now follows the current Microsoft Learn flow as of 2026-05-13.
- The workload policy must be regenerated when the pod spec or container image changes because the generated policy is specific to the workload manifest.
- The local environment did not have `az` or `flux` installed, so CLI verification was performed against official command documentation rather than local `--help` output.
