# Validation Summary: How to Set Up AKS HTTP Application Routing Add-On for Development Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- AKS Application Routing add-on
- Kubernetes Ingress
- NGINX Ingress Controller
- Azure CLI
- kubectl
- DNS

## Sources Consulted
- Microsoft Learn: Managed NGINX ingress with the application routing add-on for AKS - https://learn.microsoft.com/en-us/azure/aks/app-routing
- Microsoft Learn: Migrate from HTTP application routing to the application routing add-on - https://learn.microsoft.com/en-us/azure/aks/app-routing-migration
- Microsoft Learn: Azure CLI `az aks approuting` reference - https://learn.microsoft.com/en-us/cli/azure/aks/approuting
- Microsoft Learn: Azure CLI `az aks approuting defaultdomain` reference - https://learn.microsoft.com/en-us/cli/azure/aks/approuting/defaultdomain
- Microsoft Learn: Azure CLI `az aks approuting zone` reference - https://learn.microsoft.com/en-us/cli/azure/aks/approuting/zone
- Microsoft Learn: Set up custom domain and SSL certificate with the application routing add-on - https://learn.microsoft.com/en-us/azure/aks/app-routing-dns-ssl
- Kubernetes documentation: Ingress - https://kubernetes.io/docs/concepts/services-networking/ingress/
- Azure/AKS release notes: HTTP Application Routing retirement notices - https://github.com/Azure/AKS/releases

## Issues Found
- The post centered on the retired `http_application_routing` add-on. Microsoft retired HTTP Application Routing on March 3, 2025 and blocks new cluster creation with that retired add-on. Updated the post to use the current AKS Application Routing add-on.
- Replaced retired Azure CLI commands using `--enable-addons http_application_routing`, `az aks enable-addons`, and `az aks disable-addons` with current `--enable-app-routing`, `az aks approuting enable`, and `az aks approuting disable` commands.
- Added the `aks-preview` extension installation command because the default domain commands and flags are documented as part of the extension.
- Replaced the old `kubernetes.io/ingress.class: addon-http-application-routing` annotation with `spec.ingressClassName: webapprouting.kubernetes.azure.com`, matching current AKS and Kubernetes guidance.
- Replaced references to the old `kube-system` add-on pods and external-dns checks with current `app-routing-system` verification commands.
- Removed Azure DNS record-set verification against the AKS node resource group because the current default domain flow is managed through App Routing default domain commands rather than the old HTTP Application Routing DNS zone.
- Corrected the migration section. The previous text described "Web Application Routing" as a future replacement and used `--addons web_application_routing`; current documentation uses the Application Routing add-on and `az aks approuting` commands.
- Fixed the namespaced environment example by removing hard-coded `namespace: default` fields from reusable sample manifests, so `kubectl apply -n <namespace>` works as described.
- Updated the disabling section. The old claim that disabling removes old add-on pods but leaves its Azure DNS zone no longer matches the current App Routing behavior; current docs note that some resources may remain in `app-routing-system` to avoid traffic disruption.

## Review Notes
The NGINX-based Application Routing add-on is supported for production workloads through November 2026, but Microsoft recommends planning migration to the Gateway API-based Application Routing implementation. The post remains framed around development usage, which is reasonable, but future updates should revisit the guidance as AKS App Routing and upstream Ingress NGINX support timelines change.
