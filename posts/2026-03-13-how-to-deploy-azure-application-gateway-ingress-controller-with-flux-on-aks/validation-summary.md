# Validation Summary: How to Deploy Azure Application Gateway Ingress Controller with Flux on AKS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Application Gateway
- Azure Application Gateway Ingress Controller (AGIC)
- Application Gateway for Containers
- Flux CD
- HelmRelease and OCIRepository
- Kubernetes Ingress
- Microsoft Entra Workload ID
- Azure CLI

## Sources Consulted
- Microsoft Learn: What is Application Gateway Ingress Controller? https://learn.microsoft.com/en-us/azure/application-gateway/ingress-controller-overview
- Microsoft Learn: Create an ingress controller by using a new Application Gateway deployment. https://learn.microsoft.com/en-us/azure/application-gateway/ingress-controller-install-new
- Microsoft Learn: Tutorial: Enable ingress controller add-on for existing AKS cluster with existing Application Gateway. https://learn.microsoft.com/en-us/azure/application-gateway/tutorial-ingress-controller-add-on-existing
- Microsoft Learn: What is Application Gateway for Containers? https://learn.microsoft.com/en-us/azure/application-gateway/for-containers/overview
- Microsoft Learn: Use Microsoft Entra Workload ID with AKS. https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Learn: Supported Kubernetes versions in AKS. https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Microsoft Learn: Azure CLI `az identity federated-credential`. https://learn.microsoft.com/en-us/cli/azure/identity/federated-credential
- Microsoft Learn: Azure CLI `az network application-gateway`. https://learn.microsoft.com/en-us/cli/azure/network/application-gateway
- AGIC documentation: Install Application Gateway Ingress Controller. https://azure.github.io/application-gateway-kubernetes-ingress/setup/install/
- AGIC documentation: Deploy AGIC via Helm using Workload Identity. https://azure.github.io/application-gateway-kubernetes-ingress/how-tos/deploy-AGIC-with-Workload-Identity-using-helm/
- AGIC documentation: Helm Values Configuration Options. https://azure.github.io/application-gateway-kubernetes-ingress/helm-values-documenation/
- AGIC documentation: Ingress V1 Support. https://azure.github.io/application-gateway-kubernetes-ingress/ingress-v1/
- Flux documentation: Manage Helm Releases. https://fluxcd.io/flux/guides/helmreleases/
- Flux documentation: Helm API reference v2. https://fluxcd.io/flux/components/helm/api/v2/
- Flux documentation: Source API reference v1. https://fluxcd.io/flux/components/source/api/v1/
- Flux documentation: Frequently asked questions, OCI Helm chart example. https://fluxcd.io/flux/faq/

## Issues Found
- The prerequisite `AKS cluster running Kubernetes 1.24 or later` was outdated because AKS support is based on the current N/N-1/N-2 version policy. Changed it to require a currently supported Kubernetes version.
- The Azure CLI prerequisite was too low for current AKS workload identity documentation. Changed Azure CLI from 2.40 or later to 2.47 or later.
- The AKS add-on command used `--addons`; the official AGIC add-on example uses `--addon`. Updated the command.
- The post could lead readers to install both the managed AGIC add-on and the Helm deployment. Added guidance not to use both at the same time.
- The Flux source used the old AGIC blob Helm repository URL. AGIC charts have moved to MCR as OCI charts, so the source was changed to a Flux `OCIRepository` using `oci://mcr.microsoft.com/azure-application-gateway/charts/ingress-azure`.
- The HelmRelease used a `HelmRepository` chart template and `version: "1.7.*"`. Updated it to use `chartRef` against the Flux `OCIRepository` with an OCI semver range.
- The Flux HelmRelease did not set `releaseName`. Because Flux can derive a release name from the target namespace, this could make the AGIC service account name differ from the federated credential subject. Added `releaseName: ingress-azure`.
- The Helm values referenced `${IDENTITY_CLIENT_ID}` while the setup command created `AGIC_CLIENT_ID`. Updated the HelmRelease value to `${AGIC_CLIENT_ID}`.
- The workload identity commands did not enable the AKS OIDC issuer and workload identity features. Added `az aks update --enable-oidc-issuer --enable-workload-identity`.
- The federated credential command used `--audience`; current Azure CLI documentation uses `--audiences`. Updated the flag.

## Review Notes
The post is technically relevant and valid after the fixes. The AGIC and Microsoft documentation both advise evaluating Application Gateway for Containers for new deployments, while AGIC remains useful for existing Application Gateway-based ingress deployments.
