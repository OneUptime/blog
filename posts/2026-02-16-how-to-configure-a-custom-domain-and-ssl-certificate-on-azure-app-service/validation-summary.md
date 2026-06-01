# Validation Summary: How to Configure a Custom Domain and SSL Certificate on Azure App Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure App Service
- Azure CLI
- Azure DNS records
- TLS/SSL certificates
- App Service Managed Certificates
- Azure Key Vault certificates
- Express.js HTTPS redirect middleware

## Sources Consulted
- Microsoft Learn: Set up an existing custom domain in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/app-service-web-tutorial-custom-domain
- Microsoft Learn: Add and manage TLS/SSL certificates in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/configure-ssl-certificate
- Microsoft Learn: Enable HTTPS for a custom domain in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/configure-ssl-bindings
- Microsoft Learn: Azure CLI `az webapp config ssl` reference - https://learn.microsoft.com/en-us/cli/azure/webapp/config/ssl
- Microsoft Learn: Azure CLI `az webapp` reference - https://learn.microsoft.com/en-us/cli/azure/webapp
- Microsoft Learn: Azure CLI `az keyvault certificate` reference - https://learn.microsoft.com/en-us/cli/azure/keyvault/certificate
- Microsoft Azure: App Service pricing - https://azure.microsoft.com/en-us/pricing/details/app-service/windows/

## Issues Found
- The prerequisite incorrectly stated that Shared tier does not support custom domains. Updated it to distinguish custom domain support from custom TLS/SSL binding support: Basic B1 or higher is required for custom TLS/SSL bindings, Free tier does not support custom domains, and Shared tier does not support custom SSL bindings.
- The managed certificate limitations incorrectly said App Service Managed Certificates only support subdomains and not root/apex domains. Updated the limitations to reflect current Microsoft documentation: apex domains are supported when they meet the A-record and public reachability prerequisites; wildcard certificates remain unsupported.
- The managed certificate limitations omitted current constraints around private DNS, App Service Environment, direct CNAME requirements for subdomains, and approximate six-month validity. Added those details.
- The Key Vault example described `az keyvault certificate get-default-policy` as creating a certificate request, but the Azure CLI documentation identifies that default policy as self-signed. Updated the wording to say it creates a self-signed certificate for testing, and added a production warning that public HTTPS certificates must be signed by a trusted CA.
- The Key Vault import workflow omitted the required App Service resource provider access to Key Vault. Added the documented `Key Vault Certificate User` role assignment for the App Service service principal before importing the certificate.
- The HTTPS enforcement command used the generic `--set httpsOnly=true` form. Replaced it with the current documented `az webapp update --https-only true` option.
- The post stated App Service returns a 301 redirect for HTTPS-only mode. Microsoft documentation describes HTTP-to-HTTPS redirection but does not specify a status code in the cited CLI/reference docs, so the wording was generalized to avoid overclaiming.
- The root/www guidance and conclusion implied managed certificates are unsuitable for root domains. Updated both to reflect current managed certificate support for root and `www` domains when prerequisites are met.

## Review Notes
- The Azure CLI was not installed in the local environment, so command syntax was verified against Microsoft Learn CLI references rather than local `az --help` output.
- DNS examples remain provider-dependent: some DNS providers expect relative host names such as `asuid`, while others display fully qualified names such as `asuid.myapp.com`.
