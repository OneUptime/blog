# Validation Summary: How to Configure Azure Application Gateway with SSL Termination

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Application Gateway
- Azure CLI
- TLS/SSL termination
- HTTPS listeners and HTTP backend settings
- Application Gateway backend pools
- Application Gateway health probes
- Application Gateway HTTP-to-HTTPS redirects
- Application Gateway TLS/SSL policies
- OpenSSL PFX certificate generation

## Sources Consulted
- Microsoft Learn: Create an application gateway with HTTP to HTTPS redirection using the Azure CLI - https://learn.microsoft.com/en-us/azure/application-gateway/redirect-http-to-https-cli
- Microsoft Learn: Azure CLI reference for `az network application-gateway` - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway
- Microsoft Learn: Azure CLI reference for `az network application-gateway probe` - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/probe
- Microsoft Learn: Azure CLI reference for `az network application-gateway ssl-policy` - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/ssl-policy
- Microsoft Learn: Application Gateway TLS policy overview - https://learn.microsoft.com/en-us/azure/application-gateway/application-gateway-ssl-policy-overview
- Microsoft Learn: Application gateway components - https://learn.microsoft.com/en-us/azure/application-gateway/application-gateway-components
- Microsoft Learn: Health monitoring overview for Azure Application Gateway - https://learn.microsoft.com/en-us/azure/application-gateway/application-gateway-probe-overview
- Microsoft Learn: Configure end-to-end TLS with Azure Application Gateway - https://learn.microsoft.com/en-us/azure/application-gateway/application-gateway-end-to-end-ssl-powershell

## Issues Found
- The SSL policy command used `--policy-name AppGwSslPolicy20220101S`, but the current Azure CLI reference documents the SSL policy name option as `--name` or `-n`. Changed it to `--name AppGwSslPolicy20220101S`.
- The backend pool section said the shown `address-pool update --servers` command could be used for VMs, VM scale sets, or FQDN addresses. The `--servers` list is appropriate for IP or FQDN backend targets, while VM scale sets are associated through VM scale set or network interface configuration. Updated the wording to avoid implying VM scale sets are added with that command.

## Review Notes
- Azure CLI was not installed in the local environment, so CLI syntax was verified against Microsoft Learn CLI reference pages and Application Gateway tutorials rather than local `az --help` output.
- The self-signed certificate example is suitable for Application Gateway testing. For browser testing with a real hostname, a production certificate should include the appropriate subject alternative name and be issued by a trusted CA.
