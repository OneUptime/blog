# Validation Summary: How to Set Up Custom Domains and SSL Certificates for Azure Static Web Apps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Static Web Apps
- Azure DNS
- Custom domains
- DNS records: CNAME, TXT, ALIAS, ANAME, flattened CNAME, A
- SSL/TLS certificate provisioning
- Azure CLI
- HTTP redirects

## Sources Consulted
- Microsoft Learn: Custom domains with Azure Static Web Apps: https://learn.microsoft.com/en-us/azure/static-web-apps/custom-domain
- Microsoft Learn: Set up a custom domain with external providers in Azure Static Web Apps: https://learn.microsoft.com/en-us/azure/static-web-apps/custom-domain-external
- Microsoft Learn: Set up an apex domain in Azure Static Web Apps: https://learn.microsoft.com/en-us/azure/static-web-apps/apex-domain-external
- Microsoft Learn: Set up an apex domain with Azure DNS in Azure Static Web Apps: https://learn.microsoft.com/en-us/azure/static-web-apps/apex-domain-azure-dns
- Microsoft Learn: Manage the default domain in Azure Static Web Apps: https://learn.microsoft.com/en-us/azure/static-web-apps/custom-domain-default
- Microsoft Learn: Azure CLI az staticwebapp hostname reference: https://learn.microsoft.com/en-us/cli/azure/staticwebapp/hostname?view=azure-cli-latest
- Microsoft Learn: Azure CLI az network dns record-set a reference: https://learn.microsoft.com/en-us/cli/azure/network/dns/record-set/a?view=azure-cli-latest
- Microsoft Learn: Azure DNS alias records overview: https://learn.microsoft.com/en-us/azure/dns/dns-alias
- Microsoft Learn: Configure Azure Static Web Apps: https://learn.microsoft.com/en-us/azure/static-web-apps/configuration

## Issues Found
- The post said apex domains use an ALIAS record or Azure DNS zone delegation. Updated this to include the current supported options: Azure DNS, ALIAS/ANAME, CNAME flattening, or A records.
- The Azure DNS apex-domain section showed a manual Azure CLI `az network dns record-set a create --target-resource` example pointing an A alias directly at the Static Web App resource. Microsoft Static Web Apps documentation describes adding an apex domain through the Azure portal with "Custom Domain on Azure DNS," which automatically creates the necessary TXT and ALIAS records. Replaced the unsupported/manual command flow with the documented portal flow.
- The external DNS apex-domain section described creating a CNAME at the apex and then adding the hostname with the default CLI validation method. Updated this to ALIAS/ANAME/flattened CNAME and added `--validation-method dns-txt-token`, matching the Azure CLI reference for root domains.
- The fallback options for DNS providers without apex aliasing omitted the documented A record option and its performance caveat. Added the A record option and noted that it points traffic to a single regional Static Web Apps host.
- The WWW redirect section included a `staticwebapp.config.json` snippet that did not configure a www-to-apex redirect and said to handle the redirect with a DNS record. Replaced it with the documented Static Web Apps default-domain redirect behavior and clarified that DNS records alone do not perform HTTP redirects.
- The certificate verification text said the custom domain should appear in the certificate subject. Modern certificates often place domain names in the Subject Alternative Name extension rather than the subject. Reworded the sentence to say the certificate should be valid for the custom domain.

## Review Notes
- Azure CLI was not installed in the local environment, so CLI syntax was checked against the official Microsoft Learn Azure CLI reference instead of local `az --help` output.
- Microsoft documentation notes that custom domain validation for Enterprise Grade Edge Static Web Apps requires TXT token validation for new domains; the post is accurate for standard Static Web Apps flows but could add this edge-specific caveat in a future update.
