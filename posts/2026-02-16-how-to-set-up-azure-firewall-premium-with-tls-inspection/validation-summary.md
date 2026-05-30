# Validation Summary: How to Set Up Azure Firewall Premium with TLS Inspection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Firewall Premium
- Azure Firewall Policy
- TLS inspection
- Azure Key Vault
- Azure managed identities
- Azure CLI
- OpenSSL
- IDPS

## Sources Consulted
- Microsoft Learn: Azure Firewall Premium features implementation guide, https://learn.microsoft.com/en-us/azure/firewall/premium-features
- Microsoft Learn: Azure Firewall Premium certificates, https://learn.microsoft.com/en-us/azure/firewall/premium-certificates
- Microsoft Learn: Azure Firewall performance, https://learn.microsoft.com/en-gb/azure/firewall/firewall-performance
- Microsoft Learn: Azure CLI `az network firewall policy`, https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy
- Microsoft Learn: Azure CLI `az network firewall`, https://learn.microsoft.com/en-us/cli/azure/network/firewall
- Microsoft Learn: Azure CLI `az network firewall policy rule-collection-group collection`, https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy/rule-collection-group/collection
- Microsoft Learn: Azure CLI `az network firewall policy intrusion-detection`, https://learn.microsoft.com/en-us/cli/azure/network/firewall/policy/intrusion-detection

## Issues Found
- The firewall policy TLS inspection command used non-current Azure CLI parameters (`--identity-type`, `--user-assigned-identity`, and `--transport-security-certificate-authority-*`). Updated it to the current documented parameters: `--identity`, `--cert-name`, and `--key-vault-secret-id`.
- The Key Vault access policy granted certificate permissions to the firewall managed identity. Azure Firewall retrieves the CA certificate through the Key Vault secrets interface, so the example now grants only `get` and `list` secret permissions.
- The IDPS example used `--mode "Alert"` to enable policy-level IDPS and `--signature-overrides`, which is not a documented parameter for the current Azure CLI command. Updated the policy-level example to `--idps-mode "Deny"` and the signature override example to `--signature-id 2024897 --mode "Deny"`.
- The troubleshooting section claimed Azure Firewall Premium TLS inspection throughput is up to 250 Mbps per instance. Current Azure Firewall performance documentation lists 250 Mbps for Basic, while Premium TLS inspection throughput guidance is much higher and depends on IDPS mode. Updated the statement with the current documented Premium figures.

## Review Notes
Azure CLI was not installed in the local environment, so command verification was performed against current Microsoft Learn CLI reference pages rather than local `az --help` output.
