# Validation Summary: How to Set Up DNSSEC with Azure DNS

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- DNSSEC (Domain Name System Security Extensions)
- Azure DNS (public zones)
- Azure Portal
- Azure CLI (`az network dns dnssec-config`)
- Azure PowerShell (Az.Dns module)
- Terraform (azurerm + azapi providers)
- DNS tooling: `dig`, `delv`, DNSViz, Verisign DNSSEC Debugger/Analyzer

## Sources Consulted
- Azure DNS — How to sign your Azure Public DNS zone with DNSSEC: https://learn.microsoft.com/en-us/azure/dns/dnssec-how-to
- New-AzDnsDnssecConfig (Az.Dns) reference: https://learn.microsoft.com/en-us/powershell/module/az.dns/new-azdnsdnssecconfig
- Get-AzDnsDnssecConfig / Remove-AzDnsDnssecConfig (Az.Dns) reference (Microsoft Learn / azure-powershell repo)
- terraform-provider-azurerm issue #28732 "Support for DNSSec in `azurerm_dns_zone`" (still open): https://github.com/hashicorp/terraform-provider-azurerm/issues/28732
- terraform-provider-azurerm repository (no `dns_zone_dnssec_config` resource or doc present in `internal/services/dns` or `website/docs/r`)
- Microsoft.Network/dnsZones/dnssecConfigs ARM/Bicep/AzAPI reference (API version 2023-07-01-preview only): https://learn.microsoft.com/en-us/azure/templates/microsoft.network/dnszones/dnssecconfigs
- Squarespace Help Center — DNSSEC for Squarespace domains (Google Domains successor): https://support.squarespace.com/hc/en-us/articles/31094668921229-DNSSEC-for-Squarespace-domains

## Issues Found

1. **Incorrect Azure PowerShell cmdlet names (Method 3 and Summary Table).**
   The post used `New-AzDnsSecConfig`, `Get-AzDnsSecConfig`, and `Remove-AzDnsSecConfig`. These cmdlets do not exist. The correct Az.Dns cmdlets are `New-AzDnsDnssecConfig`, `Get-AzDnsDnssecConfig`, and `Remove-AzDnsDnssecConfig`. Fixed all occurrences in the PowerShell examples and the summary table, verified against Microsoft Learn and the azure-powershell repository.

2. **Non-existent Terraform resource (Method 4).**
   The post described `azurerm_dns_zone_dnssec_config`, including invented `signing_keys`/`delegation_signer_info`/`provisioning_state` attributes and a `version = "~> 3.80"` constraint. This resource does not exist in the `azurerm` provider — the feature request (issue #28732) is still open, and there is no DNSSEC resource in the provider's `internal/services/dns` or docs. Rewrote the section to use the real approach: the `azapi` provider against `Microsoft.Network/dnsZones/dnssecConfigs@2023-07-01-preview` (the only available API version, currently preview), with `name = "default"` (required value), `parent_id` set to the zone ID, and a `response_export_values`-based output for the signing keys / DS delegation info. Also updated the `azurerm` constraint to `~> 4.0` and added a note linking the open feature request.

3. **Outdated registrar reference (Method 1, Step 5).**
   The post listed "Google Domains" as a current registrar interface. Google Domains was acquired by Squarespace and shut down in 2024. Replaced with "Squarespace Domains (formerly Google Domains)" and an accurate path (domain dashboard > DNS > DNSSEC > Add record), verified against the Squarespace Help Center.

## Review Notes
- The Azure CLI commands (`az network dns dnssec-config create/show/delete`) were verified correct against Microsoft Learn.
- DNSSEC conceptual content (ZSK/KSK, DS/RRSIG/DNSKEY/NSEC3, flags 256=ZSK / 257=KSK, algorithm 13 ECDSAP256SHA256, digest type 2 SHA-256, chain of trust) is accurate. Azure DNS signs with ECDSA P-256 / SHA-256 and uses NSEC3, matching the post.
- The Terraform `azapi` approach uses a preview API version because Microsoft has not yet published a GA (stable) API version for `dnssecConfigs`; this is the current state and worth re-checking when `azurerm` adds native support (issue #28732) or a stable API version ships.
- Minor unverified item left as-is: the stated Azure CLI minimum "version 2.50.0 or later." Microsoft's DNSSEC docs don't pin an exact minimum; the DNSSEC commands require a reasonably recent CLI, so a newer minimum is plausible, but no authoritative exact version was found to justify a change.
- PowerShell property iteration (`$config.SigningKeys` / `.DelegationSignerInfo` / `.Record`) was left unchanged; it is plausibly correct for the returned object and was not contradicted by the docs (which show both `SigningKey` expansion and the `Record` property).
