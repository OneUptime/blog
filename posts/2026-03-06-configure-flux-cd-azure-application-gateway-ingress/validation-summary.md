# Validation Summary: How to Configure Flux CD with Azure Application Gateway Ingress

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Azure Application Gateway
- Azure Application Gateway Ingress Controller (AGIC)
- Azure Kubernetes Service (AKS)
- Flux CD HelmRelease, OCIRepository, and Kustomization resources
- Kubernetes Deployments, Services, and Ingress resources
- cert-manager and ACME HTTP-01 certificates
- Azure Web Application Firewall (WAF) policies
- Azure CLI and kubectl

## Sources Consulted
- Microsoft Learn: What is Application Gateway Ingress Controller? https://learn.microsoft.com/en-us/azure/application-gateway/ingress-controller-overview
- Microsoft Learn: Application Gateway Ingress Controller annotations https://learn.microsoft.com/en-us/azure/application-gateway/ingress-controller-annotations
- Microsoft Learn: Add health probes to AKS pods with AGIC https://learn.microsoft.com/en-us/azure/application-gateway/ingress-controller-add-health-probes
- Microsoft Learn: Enable AGIC add-on for existing AKS cluster https://learn.microsoft.com/en-us/azure/application-gateway/tutorial-ingress-controller-add-on-existing
- Microsoft Learn: Azure CLI application-gateway commands https://learn.microsoft.com/en-us/cli/azure/network/application-gateway
- Microsoft Learn: Configure Application Gateway WAF with Azure CLI https://learn.microsoft.com/en-us/azure/web-application-firewall/ag/tutorial-restrict-web-traffic-cli
- AGIC official docs: Install AGIC with Helm https://azure.github.io/application-gateway-kubernetes-ingress/setup/install/
- AGIC official docs: Helm values configuration options https://azure.github.io/application-gateway-kubernetes-ingress/helm-values-documenation/
- Flux docs: HelmRelease API reference https://fluxcd.io/flux/components/helm/api/v2/
- Flux docs: Helm releases with OCIRepository chartRef https://fluxcd.io/flux/components/helm/helmreleases/
- cert-manager docs: Helm installation https://cert-manager.io/docs/installation/helm/
- cert-manager docs: HTTP-01 solver configuration https://cert-manager.io/docs/configuration/acme/http01/
- Kubernetes docs: Ingress and IngressClass https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The architecture diagram incorrectly placed the AGIC pod in the runtime traffic path. Updated it so Application Gateway routes traffic to services while AGIC watches Ingress resources and configures Application Gateway.
- The Application Gateway was created with `Standard_v2` while the guide later configures WAF policies. Updated the SKU to `WAF_v2`.
- The AGIC Helm example used the old Blob Storage Helm repository. Updated it to the current MCR OCI chart source with Flux `OCIRepository` and `HelmRelease.spec.chartRef`.
- The AGIC Helm values used separate Application Gateway subscription/resource group/name fields. Updated the example to use `appgw.applicationGatewayID`, matching current AGIC Helm install guidance.
- The custom health-probe ingress set `backend-protocol: "https"` for a sample backend that exposes cleartext HTTP on port 8080. Changed the backend protocol to `http`.
- The cert-manager Helm values used `installCRDs: true`, which is outdated for current cert-manager charts. Updated it to `crds.enabled: true`, set the chart version selector to `v1.x`, and added an explicit `targetNamespace` with namespace creation.
- The AGIC troubleshooting log command assumed the add-on namespace. Changed it to query all namespaces so it also works for the Flux-managed Helm deployment.

## Review Notes
Azure CLI was not installed in the local environment, so Azure command validation was performed against official Azure CLI documentation rather than local `az --help` output. The YAML configuration snippets were parsed successfully with PyYAML, and `git diff --check` passed.
