# Validation Summary: How to Create Azure Point-to-Site VPN with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure VPN Gateway Point-to-Site VPN
- Microsoft Entra ID authentication
- Certificate-based VPN authentication
- OpenTofu CLI
- AzureRM provider / HCL
- OpenSSL

## Sources Consulted
- AzureRM provider docs for `azurerm_virtual_network_gateway`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/virtual_network_gateway.html.markdown
- About Point-to-Site VPN - Azure VPN Gateway: https://learn.microsoft.com/en-us/azure/vpn-gateway/point-to-site-about
- Configure P2S VPN gateway for Microsoft Entra ID authentication: https://learn.microsoft.com/en-us/azure/vpn-gateway/point-to-site-entra-gateway
- Configure server settings for P2S VPN Gateway certificate authentication - PowerShell: https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-howto-point-to-site-rm-ps
- Generate and export certificates for point-to-site: Linux - OpenSSL: https://learn.microsoft.com/en-ca/azure/vpn-gateway/point-to-site-certificates-linux-openssl
- Initializing Working Directories - OpenTofu: https://opentofu.org/docs/cli/init/
- Command: plan - OpenTofu: https://opentofu.org/docs/cli/commands/plan/
- Command: apply - OpenTofu: https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The VPN gateway example used `enable_bgp`, which is from older AzureRM provider documentation. The current provider argument is `bgp_enabled`, so I updated the HCL to match the current resource schema.
- The Microsoft Entra ID example used the older manually registered Azure VPN Client audience value `41b23e61-6c1e-4545-b367-cd054e0ed4b4`. Current Azure VPN Gateway guidance recommends the Microsoft-registered audience `c632b3df-fb67-4d84-bdcf-b95ad541b5c8` for Azure Public, so I replaced the value and updated the surrounding terminology to Microsoft Entra ID.
- The post showed two `azurerm_virtual_network_gateway` resources against the same VNet and gateway subnet without saying they were alternatives. Current provider documentation notes that each virtual network can contain at most one virtual network gateway, so I clarified that the Entra ID example should be used instead of the certificate-based example, not alongside it.
- The certificate section generated only the root certificate but the text implied that was the whole certificate setup. Azure’s P2S certificate-auth documentation requires each VPN client to also have a client certificate signed by the trusted root, so I corrected the wording to make that requirement explicit.

## Review Notes
- Microsoft Entra ID authentication for Azure VPN Gateway P2S supports only the OpenVPN tunnel type; the example already used `vpn_client_protocols = ["OpenVPN"]`, which is correct.
- The `public_cert_data` value for `root_certificate` must be Base64-encoded X.509 certificate data without PEM headers or embedded newlines.
- The OpenSSL export example follows Azure’s Linux/OpenSSL guidance and uses GNU `base64 -w 0` syntax.
- The OpenTofu deployment commands were validated against official OpenTofu documentation because the `tofu` binary is not installed in this review environment.
