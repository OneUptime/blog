# Validation Summary: How to Set Up Application Gateway Ingress Controller (AGIC) on AKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Application Gateway
- Application Gateway Ingress Controller (AGIC)
- Kubernetes Ingress, Deployment, and Service resources
- Azure CLI
- Azure Web Application Firewall (WAF)
- Azure Key Vault certificates

## Sources Consulted
- Microsoft Learn: What is Application Gateway Ingress Controller? https://learn.microsoft.com/en-us/azure/application-gateway/ingress-controller-overview
- Microsoft Learn: Enable AGIC add-on for an existing AKS cluster with an existing Application Gateway. https://learn.microsoft.com/en-us/azure/application-gateway/tutorial-ingress-controller-add-on-existing
- Microsoft Learn: Enable AGIC add-on for a new AKS cluster with a new Application Gateway. https://learn.microsoft.com/en-us/azure/application-gateway/tutorial-ingress-controller-add-on-new
- Microsoft Learn: Azure CLI `az network application-gateway create`. https://learn.microsoft.com/en-us/cli/azure/network/application-gateway
- Microsoft Learn: Azure CLI `az network application-gateway waf-config set`. https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/waf-config
- Microsoft Learn: AGIC annotations. https://learn.microsoft.com/en-us/azure/application-gateway/ingress-controller-annotations
- AGIC documentation: Annotations. https://azure.github.io/application-gateway-kubernetes-ingress/annotations/
- AGIC documentation: AppGw SSL certificate. https://azure.github.io/application-gateway-kubernetes-ingress/features/appgw-ssl-certificate/
- AGIC documentation: Probes. https://azure.github.io/application-gateway-kubernetes-ingress/features/probes/
- Kubernetes documentation: Ingress. https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The Application Gateway creation command used the VNet name and subnet name even though the VNet resource group was discovered separately from the Application Gateway resource group. Azure CLI requires a subnet ID when the existing subnet is in another resource group or subscription, so the subnet creation now captures `APPGW_SUBNET_ID` and the Application Gateway command passes `--subnet "$APPGW_SUBNET_ID"`.
- The WAF description said Application Gateway v2 includes a WAF based on OWASP ModSecurity rules. WAF is specific to WAF-capable SKUs and Azure now documents managed rule sets including OWASP CRS and Microsoft DRS, so the wording was corrected.
- The Key Vault TLS section implied AGIC directly references a Key Vault certificate from the Ingress annotation. The `appgw-ssl-certificate` annotation references an SSL certificate name already configured on Application Gateway, which may be backed by Key Vault, so the wording and comments were corrected.
- The WAF CLI example omitted `--rule-set-type OWASP`; it was added to match the documented Azure CLI pattern for selecting CRS 3.2.
- The health probe section only mentioned readiness probes. AGIC can derive probe settings from readiness or liveness HTTP probes, so the wording was corrected.

## Review Notes
The post uses the AGIC ingress class annotation because AGIC documentation still requires `kubernetes.io/ingress.class: azure/application-gateway` for resources to be observed, even though Kubernetes generally recommends `ingressClassName` for newer controllers. Microsoft documentation now recommends considering Application Gateway for Containers for new Kubernetes ingress deployments, but AGIC remains documented and usable.
