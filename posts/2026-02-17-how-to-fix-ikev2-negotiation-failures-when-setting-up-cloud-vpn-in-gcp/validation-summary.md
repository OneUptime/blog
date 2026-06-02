# Validation Summary: How to Fix IKEv2 Negotiation Failures When Setting Up Cloud VPN in GCP

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud VPN
- HA VPN
- Classic VPN
- IKEv2
- IPsec ESP
- NAT-T
- Dead Peer Detection
- Google Cloud CLI
- Cloud Logging
- Cisco IOS IPsec configuration

## Sources Consulted
- Google Cloud documentation: Supported IKE ciphers - https://docs.cloud.google.com/network-connectivity/docs/vpn/concepts/supported-ike-ciphers
- Google Cloud documentation: Cloud VPN overview - https://docs.cloud.google.com/network-connectivity/docs/vpn/concepts/overview
- Google Cloud documentation: Networks and tunnel routing - https://docs.cloud.google.com/network-connectivity/docs/vpn/concepts/choosing-networks-routing
- Google Cloud documentation: Configure the peer VPN gateway - https://docs.cloud.google.com/network-connectivity/docs/vpn/how-to/configuring-peer-gateway
- Google Cloud documentation: Configure HA VPN over Cloud Interconnect - https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/configure-ha-vpn-interconnect
- Google Cloud documentation: View logs and metrics - https://docs.cloud.google.com/network-connectivity/docs/vpn/how-to/viewing-logs-metrics
- Google Cloud Compute Engine API reference: vpnTunnels resource - https://docs.cloud.google.com/compute/docs/reference/rest/v1/vpnTunnels
- Google Cloud SDK reference: gcloud compute vpn-tunnels describe - https://docs.cloud.google.com/sdk/gcloud/reference/compute/vpn-tunnels/describe
- RFC 7296: Internet Key Exchange Protocol Version 2 (IKEv2) - https://www.rfc-editor.org/rfc/rfc7296
- RFC 3706: A Traffic Liveness Test for IKE - https://www.rfc-editor.org/rfc/rfc3706

## Issues Found
- The post said to retrieve the plaintext shared secret with `gcloud compute vpn-tunnels describe --format="value(sharedSecret)"` and compare it byte-for-byte. Google Cloud documentation indicates the relevant returned field is `sharedSecretHash`, and Google Cloud guidance notes pre-shared keys must be recorded because they cannot be retrieved after tunnel creation. I changed the command to retrieve `sharedSecretHash` and changed the advice to compare the recorded pre-shared key with the peer configuration.
- The IKEv2 cipher tables omitted several currently supported Google Cloud values and included some inaccurate values. I updated the Phase 1 and Phase 2 tables to match the current supported IKEv2 cipher documentation, including AES-CBC-192, AES-GCM-16-192, 3DES-CBC for Phase 1, additional PRFs, supported DH/PFS groups, and the correct Phase 2 integrity values.
- The Cisco example recommended DH/PFS group 14 but only showed the transform set. I added a short Cisco-style note that PFS group 14 is configured in the crypto map or IPsec profile depending on platform.
- The post said HA VPN only supports IKEv2. Current Google Cloud documentation says Cloud VPN supports IKEv1 and IKEv2, with IKEv2 required for IPv6 traffic on HA VPN. I corrected that section.
- The DPD section gave specific interval and retry values as if they were Google Cloud requirements. Google Cloud documentation says the Cloud VPN DPD interval is not configurable and recommends aggressive DPD on the peer device. I replaced the specific interval/retry values with that guidance.
- The logging section said to enable VPN tunnel logging. Google Cloud documentation describes Cloud VPN gateway logs in Cloud Logging, so I changed the wording to checking Cloud VPN logs rather than enabling tunnel logging.
- The quick checklist said both sides must use IKEv2. Because Cloud VPN can use IKEv1 or IKEv2, I changed it to say both sides must use the same IKE version.

## Review Notes
The `nc -vzu` UDP checks are syntactically valid, but UDP port testing can produce inconclusive results because UDP has no handshake and firewall behavior varies. The Cloud Logging query uses the documented `vpn_gateway` monitored resource type; exact payload fields can vary by log entry.
