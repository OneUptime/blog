# Validation Summary: How to Configure HTTP Ingress and Custom Domains on Azure Container Apps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Container Apps
- Azure CLI
- HTTP ingress
- Internal ingress
- Custom domains
- Managed TLS certificates
- Bring-your-own TLS certificates
- DNS CNAME, A, and TXT records
- CORS
- IP ingress restrictions

## Sources Consulted
- Microsoft Learn: Configure ingress for your app in Azure Container Apps: https://learn.microsoft.com/en-us/azure/container-apps/ingress-how-to
- Microsoft Learn: Ingress in Azure Container Apps: https://learn.microsoft.com/en-us/azure/container-apps/ingress-overview
- Microsoft Learn: Custom domain names and free managed certificates in Azure Container Apps: https://learn.microsoft.com/en-us/azure/container-apps/custom-domains-managed-certificates
- Microsoft Learn: Custom domain names and bring-your-own certificates in Azure Container Apps: https://learn.microsoft.com/en-us/azure/container-apps/custom-domains-certificates
- Microsoft Learn Azure CLI reference: az containerapp hostname: https://learn.microsoft.com/en-us/cli/azure/containerapp/hostname?view=azure-cli-latest
- Microsoft Learn Azure CLI reference: az containerapp env certificate: https://learn.microsoft.com/en-us/cli/azure/containerapp/env/certificate?view=azure-cli-latest
- Microsoft Learn Azure CLI reference: az containerapp ingress access-restriction: https://learn.microsoft.com/en-us/cli/azure/containerapp/ingress/access-restriction?view=azure-cli-latest
- Microsoft Learn Azure CLI reference: az containerapp ingress cors: https://learn.microsoft.com/en-us/cli/azure/containerapp/ingress/cors?view=azure-cli-latest
- Microsoft Learn: Communicate between container apps in Azure Container Apps: https://learn.microsoft.com/en-us/azure/container-apps/connect-apps

## Issues Found
- The IP restriction example mixed `Allow` and `Deny` rules and described rule ordering. Azure CLI documentation states that all IP security restrictions on a container app must use the same action. Removed the deny-all example and explained the allow-list and deny-list behavior accurately.
- The custom domain setup described every flow as uploading a TLS certificate. Updated this to distinguish managed certificate provisioning from uploading a bring-your-own certificate.
- The custom domain section did not show how to retrieve the generated FQDN and domain verification ID used in DNS records. Added official `az containerapp show` queries for `properties.configuration.ingress.fqdn` and `properties.customDomainVerificationId`.
- The bring-your-own certificate flow uploaded an unnamed certificate and then queried by subject name. Updated it to assign a certificate name during upload and bind by that certificate name, matching the current Azure CLI documentation.
- The bring-your-own certificate binding command omitted the environment and validation method. Added `--environment my-env` and `--validation-method CNAME`.
- The architecture diagram identified an Azure Load Balancer as a required ingress component. Updated the label to "Container Apps Environment Endpoint" to avoid implying that users configure or depend on a separate Azure Load Balancer resource.
- The post said there is no way to disable TLS on the external endpoint. Clarified that HTTPS remains available while HTTP can be allowed with `--allow-insecure`.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn Azure CLI reference pages and Azure Container Apps documentation.
