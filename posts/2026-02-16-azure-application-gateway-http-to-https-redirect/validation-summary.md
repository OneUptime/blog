# Validation Summary: How to Configure Azure Application Gateway with HTTP to HTTPS Redirect

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Application Gateway v2
- Azure CLI
- Azure Key Vault certificates
- Managed identities
- HTTP to HTTPS redirection
- ARM templates
- curl

## Sources Consulted
- Microsoft Learn: Create an application gateway with HTTP to HTTPS redirection using the Azure CLI - https://learn.microsoft.com/en-us/azure/application-gateway/redirect-http-to-https-cli
- Microsoft Learn: Application Gateway redirect overview - https://learn.microsoft.com/en-us/azure/application-gateway/redirect-overview
- Microsoft Learn: Azure CLI `az network application-gateway` reference - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway
- Microsoft Learn: Azure CLI `az network application-gateway http-listener` reference - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/http-listener
- Microsoft Learn: Azure CLI `az network application-gateway redirect-config` reference - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/redirect-config
- Microsoft Learn: Azure CLI `az network application-gateway rule` reference - https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/rule
- Microsoft Learn: TLS termination with Key Vault certificates - https://learn.microsoft.com/en-us/azure/application-gateway/key-vault-certs
- Microsoft Learn: Azure CLI `az keyvault certificate` reference - https://learn.microsoft.com/en-us/cli/azure/keyvault/certificate

## Issues Found
- The Step 3 heading said the gateway was created with both listeners, but the command creates the initial HTTPS listener and Step 4 adds the HTTP listener. Updated the heading to match the actual flow.
- The Key Vault certificate command used the versioned secret ID directly. Microsoft recommends using a versionless Key Vault secret identifier for Application Gateway certificate references so newer certificate versions can be picked up automatically. Updated the command to strip the version segment.
- The redirect configuration and ARM snippet targeted `listener-https`, but the `az network application-gateway create` command creates the default listener as `appGatewayHttpListener` unless a different listener is explicitly created. Updated the target listener references.
- The v2 Application Gateway creation command did not set an initial routing rule priority even though the post later states that rules need unique priorities. Added `--priority 100`.
- The multi-site HTTPS listener sample referenced `port-https`, which was not created in the tutorial. Updated it to use the default `appGatewayFrontendPort` from the initial gateway creation.
- The multi-site HTTPS listener sample referenced an Application Gateway SSL certificate name without ensuring that name existed. Added `--ssl-certificate-name my-ssl-cert` to the gateway creation command and used that same name in the multi-site listener example.

## Review Notes
- The Azure CLI was not installed in the local environment, so CLI options were verified against current Microsoft Learn CLI reference pages instead of local `az --help` output.
- The sample uses HTTPS backend settings on port 443. That is valid when the backend servers serve HTTPS; the existing Common Issues section correctly notes that backend HTTP settings should be changed to HTTP when the backends only serve HTTP internally.
