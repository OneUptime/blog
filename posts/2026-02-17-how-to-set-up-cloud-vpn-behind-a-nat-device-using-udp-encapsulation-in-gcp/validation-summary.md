# Validation Summary: How to Set Up Cloud VPN Behind a NAT Device Using UDP Encapsulation in GCP

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud VPN
- HA VPN
- Classic VPN
- Cloud Router and BGP
- IPsec, IKEv2, ESP, NAT-T, UDP encapsulation
- strongSwan
- iptables NAT forwarding
- gcloud CLI

## Sources Consulted
- Google Cloud VPN advanced configurations: https://docs.cloud.google.com/network-connectivity/docs/vpn/concepts/advanced
- Google Cloud VPN troubleshooting: https://cloud.google.com/network-connectivity/docs/vpn/support/troubleshooting
- Google Cloud VPN overview and specifications: https://docs.cloud.google.com/network-connectivity/docs/vpn/concepts/overview
- Google Cloud HA VPN creation guide: https://docs.cloud.google.com/network-connectivity/docs/vpn/how-to/creating-ha-vpn
- gcloud compute vpn-tunnels create reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/vpn-tunnels/create
- gcloud compute external-vpn-gateways create reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/external-vpn-gateways/create
- Google Cloud Classic VPN static routing guide: https://cloud.google.com/network-connectivity/docs/vpn/how-to/creating-static-vpns
- strongSwan NAT Traversal documentation: https://docs.strongswan.org/docs/latest/features/natTraversal.html
- strongSwan configuration files documentation: https://docs.strongswan.org/docs/latest/config/config.html
- strongSwan ipsec.conf man page reference: https://www.mankier.com/5/strongswan_ipsec.conf

## Issues Found
- The post implied Cloud VPN could work behind port address translation or carrier-grade NAT. Google Cloud documents support only for one-to-one NAT with UDP encapsulation, so the introduction, prerequisites, and wrap-up were corrected.
- The multiple-devices section suggested using different source ports. Cloud VPN does not support multiple peer VPN gateways sharing one external IP address, so that option was removed and the limitation was stated directly.
- The HA VPN recommendation incorrectly said HA VPN handles NAT-T better because it always uses IKEv2. Cloud VPN supports IKEv1 and IKEv2, while HA VPN is recommended for high availability and BGP. The statement was corrected.
- The HA VPN external gateway command used an RFC 5737 documentation address as a literal peer IP. Google Cloud requires a real internet-routable external peer IP, so the command now uses a `NAT_PUBLIC_IP` placeholder.
- The strongSwan example used literal public IP examples that could be mistaken for values to copy. These were replaced with `NAT_PUBLIC_IP` and `GCP_HA_VPN_INTERFACE_IP` placeholders.
- The text referenced only Classic VPN's `--peer-address` when describing peer IP configuration. It now also covers HA VPN's external VPN gateway interface.
- The keepalive troubleshooting note was clarified to refer specifically to NAT-T keepalives.

## Review Notes
The remaining commands and flags match current Google Cloud CLI documentation. The strongSwan example uses the legacy `ipsec.conf` format, which strongSwan documents as deprecated in favor of `swanctl.conf`; the post now labels it as legacy, but the shown `forceencaps=yes` option is valid for that format.
