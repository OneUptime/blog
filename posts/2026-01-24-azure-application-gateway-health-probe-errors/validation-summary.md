# Validation Summary: How to Fix 'Application Gateway' Health Probe Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Application Gateway
- Azure Application Gateway health probes
- Azure CLI
- Azure Resource Manager templates
- Azure Network Security Groups
- Azure Monitor and Log Analytics
- Node.js with Express.js
- ASP.NET Core health checks

## Sources Consulted
- Azure Application Gateway health probes overview: https://learn.microsoft.com/en-us/azure/application-gateway/application-gateway-probe-overview
- Troubleshoot backend health issues in Azure Application Gateway: https://learn.microsoft.com/en-us/troubleshoot/azure/application-gateway/application-gateway-backend-health-troubleshooting
- Application Gateway backend settings configuration: https://learn.microsoft.com/en-us/azure/application-gateway/configuration-http-settings
- Azure CLI reference for Application Gateway probes: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/probe
- Azure CLI reference for Application Gateway HTTP settings: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/http-settings
- Azure CLI reference for Application Gateway trusted root certificates: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/root-cert
- Azure CLI reference for NSG rules: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule
- Azure CLI reference for Azure Monitor diagnostic settings: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Diagnostic logs for Application Gateway: https://learn.microsoft.com/en-us/azure/application-gateway/application-gateway-diagnostics
- Microsoft.Network/applicationGateways ARM template reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.network/applicationgateways

## Issues Found
- The probe timeout command comment said it increased the timeout from the default 30 seconds. Azure CLI documentation lists a different custom probe default, while the 30-second value applies to default probe behavior. Changed the comment to say only that the command sets the probe timeout to 60 seconds.
- The HTTPS certificate mismatch explanation referred only to CN validation. Current Application Gateway documentation describes validation against probe or backend setting hostnames and SNI, with SAN taking precedence when present. Updated the wording to "certificate name" and host/SNI.
- The NSG section incorrectly said Application Gateway health probes originate from the GatewayManager service tag or 168.63.129.16. Official documentation states probes to private backends originate from the Application Gateway subnet address space, and probes to public backends use the frontend public IP. Updated the explanation and NSG rule example to allow the Application Gateway subnet CIDR.
- The debugging instructions said to deploy a test VM in the Application Gateway subnet. Application Gateway requires a dedicated subnet and other resources should not be deployed there. Updated the instructions to use a VM in the same virtual network with equivalent routing and NSG access.
- The diagnostic logging example enabled ApplicationGatewayPerformanceLog without noting that performance logs are v1-only in current documentation. Removed that category from the generic example and kept ApplicationGatewayAccessLog.
- The log-query section implied access logs directly query health probe failures. Reworded it to query backend errors that often accompany probe failures.
- The Express.js health endpoint used `db` and `redis` without showing that those clients must be provided by the application. Added comments clarifying that they are configured application clients.
- The ASP.NET Core snippet used health check and JSON types without required using directives. Added the relevant `using` statements.

## Review Notes
The Azure CLI was not installed in the local workspace, so CLI commands were validated against official Microsoft Learn CLI reference pages instead of local `az --help` output. The remaining snippets are illustrative and still require real resource names, IDs, package references, and application-specific database/cache client setup.
