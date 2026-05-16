# Validation Summary: How to Set Up IPSec VPN on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- IPsec / IPSec
- strongSwan
- Libreswan
- Kubernetes DaemonSets, ConfigMaps, Secrets, host networking, and kubectl
- Linux kernel XFRM/IPsec modules and sysctls
- AWS Site-to-Site VPN
- Azure VPN Gateway

## Sources Consulted
- Talos Linux system extensions documentation: https://www.talos.dev/v1.9/talos-guides/configuration/system-extensions/
- Talos Linux kernel module documentation: https://docs.siderolabs.com/talos/v1.10/build-and-extend-talos/custom-images-and-development/kernel-module
- strongSwan introduction and configuration files documentation: https://docs.strongswan.org/docs/latest/howtos/introduction.html
- strongSwan IKEv2 configuration examples: https://docs.strongswan.org/docs/latest/config/IKEv2.html
- strongSwan IPsec protocol introduction: https://docs.strongswan.org/docs/latest/howtos/ipsecProtocol.html
- strongSwan legacy `ipsec.secrets` private-key format: https://gdch-oss.googlesource.com/third_party/strongswan/strongswan/+/refs/tags/5.8.2rc2/README_LEGACY.md
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes `kubectl debug` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- AWS Site-to-Site VPN documentation: https://docs.aws.amazon.com/vpn/latest/s2svpn/create-vpn-connection.html
- Azure VPN Gateway IPsec/IKE policy documentation: https://learn.microsoft.com/en-us/azure/vpn-gateway/ipsec-ike-policy-howto
- RFC 4301, Security Architecture for the Internet Protocol: https://datatracker.ietf.org/doc/html/rfc4301
- RFC 4303, IP Encapsulating Security Payload: https://datatracker.ietf.org/doc/html/rfc4303
- RFC 7296, Internet Key Exchange Protocol Version 2: https://datatracker.ietf.org/doc/html/rfc7296

## Issues Found
- The system extension example used the deprecated `.machine.install.extensions` configuration path and a placeholder `ghcr.io/siderolabs/ipsec-tools:v1.0.0` image. I changed it to show the modern custom installer image pattern, which matches Talos system extension installation guidance.
- The certificate-based Secret example put certificate and key data in the same Secret as `ipsec.secrets`, but the DaemonSet only mounted the `ipsec.secrets` key and did not place certificates under strongSwan's expected `/etc/ipsec.d` directories. I added an optional `ipsec-certs` Secret volume with `items` paths for `private/server.key`, `certs/server.crt`, and `cacerts/ca.crt`, and split the certificate Secret example accordingly.
- The certificate private-key reference used an absolute path while the corrected mount layout places the key in strongSwan's default private-key directory. I changed the `ipsec.secrets` entry to `: RSA server.key`, which strongSwan resolves relative to `/etc/ipsec.d/private`.
- The `net.core.xfrm_larval_drop` comment said it increases the XFRM state table. That sysctl controls dropping packets while XFRM state acquisition is pending, so I corrected the comment.

## Review Notes
- The strongSwan examples use legacy `ipsec.conf`, `ipsec.secrets`, and `ipsec` CLI flows. strongSwan documents these as deprecated and no longer built by default; the examples remain valid only for container images that include the legacy starter/stroke components. A future revision should consider converting the examples to `swanctl.conf`.
- Cloud VPN examples are necessarily illustrative. AWS and Azure tunnel proposals, traffic selectors, static routes or BGP settings, and lifetimes should be matched to the generated cloud-side VPN configuration for the specific connection.
