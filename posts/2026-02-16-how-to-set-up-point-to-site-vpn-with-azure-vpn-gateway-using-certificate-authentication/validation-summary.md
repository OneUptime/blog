# Validation Summary: How to Set Up Point-to-Site VPN with Azure VPN Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure VPN Gateway
- Azure Virtual Network
- Azure CLI
- Point-to-Site VPN
- OpenVPN
- Certificate-based authentication
- OpenSSL

## Sources Consulted
- Microsoft Learn: About Point-to-Site VPN - https://learn.microsoft.com/en-us/azure/vpn-gateway/point-to-site-about
- Microsoft Learn: Configure VPN Gateway P2S certificate authentication - https://learn.microsoft.com/en-us/azure/vpn-gateway/point-to-site-certificate-gateway
- Microsoft Learn: Generate and export certificates - Linux - OpenSSL - https://learn.microsoft.com/en-us/azure/vpn-gateway/point-to-site-certificates-linux-openssl
- Microsoft Learn: Azure CLI `az network vnet-gateway` reference - https://learn.microsoft.com/en-us/cli/azure/network/vnet-gateway
- Microsoft Learn: Azure CLI `az network vnet-gateway root-cert` reference - https://learn.microsoft.com/en-us/cli/azure/network/vnet-gateway/root-cert
- Microsoft Learn: Azure CLI `az network vnet-gateway vpn-client` reference - https://learn.microsoft.com/en-us/cli/azure/network/vnet-gateway/vpn-client
- Microsoft Learn: About VPN Gateway SKUs - https://learn.microsoft.com/en-us/azure/vpn-gateway/about-gateway-skus
- Microsoft Learn: Azure CLI `az network vnet update` reference - https://learn.microsoft.com/en-us/cli/azure/network/vnet

## Issues Found
- The OpenSSL client certificate signing command did not include the client authentication extended key usage or subject alternative name used in Microsoft's OpenSSL guidance. Added `-extfile <(printf "subjectAltName=DNS:P2SClient1\nextendedKeyUsage=clientAuth\n")`.
- The Point-to-Site gateway update command configured the root certificate and tunnel type but did not explicitly set certificate authentication. Added `--vpn-auth-type Certificate`.
- The prerequisites implied that a built-in VPN client was sufficient for the OpenVPN configuration. Updated the wording to distinguish OpenVPN clients from native IKEv2/SSTP clients.
- The Windows client instructions suggested running the native VPN installer for an OpenVPN-only configuration. Clarified that the native installer applies when IKEv2 or SSTP is configured instead.
- The DNS troubleshooting command used `az network vnet-gateway update --dns-servers`, which is not a valid Azure CLI parameter for virtual network gateways. Replaced it with `az network vnet update --dns-servers` for the VNet and noted that the VPN profile should be regenerated and reimported.

## Review Notes
- Azure CLI was not installed in the local environment, so CLI validation was performed against Microsoft Learn CLI references rather than local `az --help` output.
- The patched OpenSSL client certificate command was smoke-tested locally with OpenSSL 3.0.13 and produced a certificate with `subjectAltName` and `TLS Web Client Authentication`.
