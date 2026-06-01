# Validation Summary: How to Configure AKS API Server Authorized IP Ranges for Secure Cluster Access

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes API server access control
- Azure CLI
- Azure Monitor diagnostic settings and KQL
- Microsoft Entra ID authentication for AKS
- Azure virtual machines and public IP addresses

## Sources Consulted
- Microsoft Learn: API Server Authorized IP Ranges in Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/api-server-authorized-ip-ranges
- Microsoft Learn: Azure CLI `az aks` reference: https://learn.microsoft.com/en-us/cli/azure/aks
- Microsoft Learn: Monitor Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/monitor-aks
- Microsoft Learn: Azure CLI `az monitor diagnostic-settings` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Microsoft Learn: AKSAudit table reference and sample queries: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/aksaudit and https://learn.microsoft.com/en-us/azure/azure-monitor/reference/queries/aksaudit
- Microsoft Learn: Microsoft Entra ID authentication for the AKS control plane: https://learn.microsoft.com/en-gb/azure/aks/entra-id-control-plane-authentication
- Microsoft Learn: Azure DevOps allowed IP addresses and domain URLs: https://learn.microsoft.com/en-us/azure/devops/organizations/security/allow-list-ip-url
- GitHub REST API meta endpoint: https://api.github.com/meta

## Issues Found
- The post said unauthorized requests receive a connection refused error. Microsoft documents this as blocked access, so the wording was corrected to avoid promising a specific client-side network error.
- The AKS node networking section implied node/API-server traffic goes through an internal network and usually does not need egress allow-listing. Microsoft recommends including the cluster egress IP, and documents automatic allowance only for the standard load balancer outbound public IP during cluster creation. The section was corrected to describe cluster egress IPs, NAT gateways, firewalls, and outbound configuration changes.
- Several example ranges used private RFC 1918 addresses for authorized IP ranges. AKS API server authorized IP ranges require public IP ranges and are not compatible with private clusters, so those placeholders were changed to documentation public ranges.
- The jump box example referenced an `OFFICE` shell variable that was not defined in that snippet. It was replaced with an explicit example office CIDR.
- The Cloud Shell guidance implied it can be whitelisted by broad Microsoft ranges for kubectl access. The text was narrowed to management-plane recovery use and cautions against broad Microsoft allow-listing.
- The audit logging example used the default AzureDiagnostics-style query. Microsoft recommends resource-specific AKS logs and provides AKSAudit examples, so the diagnostic setting now enables `--export-to-resource-specific true` and the KQL query uses `AKSAudit` with `SourceIps`.
- The limitations section said propagation takes 2-5 minutes and that private ranges can be used with private clusters. Microsoft documents up to two minutes for rule propagation and that the feature is not compatible with private clusters, so both limitations were corrected.

## Review Notes
The Azure CLI flags used for `az aks create`, `az aks update`, `az aks show`, `az vm create`, Microsoft Entra ID integration, and diagnostic settings are current in Microsoft Learn as of 2026-06-01. The GitHub Actions and Azure DevOps IP-range links point to the expected official sources, but CI/CD hosted-agent IP ranges remain operationally hard to whitelist precisely because they can change.
