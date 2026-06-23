# Validation Summary: How to Configure Private Network Connectivity Between Cloud and Bare Metal

## Status
validated

## Post Type
Guide / Tutorial (hands-on configuration walkthrough for hybrid cloud networking)

## Technologies Covered
- IPsec Site-to-Site VPN (strongSwan)
- AWS Site-to-Site VPN (Customer Gateway, Virtual Private Gateway, VPN Connection)
- AWS Direct Connect (Direct Connect Gateway, Private Virtual Interface)
- GCP Cloud VPN (HA VPN Gateway, Cloud Router, External VPN Gateway)
- GCP Cloud Interconnect (Partner Interconnect / VLAN attachments)
- WireGuard VPN (on-prem gateway + AWS EC2 gateway via CloudFormation)
- BGP dynamic routing with BIRD
- Terraform (AWS and GCP providers)
- Keepalived (VRRP for gateway HA)
- Prometheus monitoring (ipsec/wireguard/blackbox exporters)
- iptables / netplan / sysctl IP forwarding

## Sources Consulted
- AWS Site-to-Site VPN tunnel options and quotas — https://docs.aws.amazon.com/vpn/latest/s2svpn/VPNTunnels.html and https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-limits.html (confirmed 1.25 Gbps per-tunnel default; 5 Gbps "Large" mode is TGW/Cloud WAN only)
- strongSwan Algorithm Proposals documentation — https://docs.strongswan.org/docs/latest/config/proposals.html (confirmed `esp=aes256-sha256-modp2048!` syntax and that an ESP modp group enables PFS for CHILD_SA rekeying)
- strongSwan ipsec.conf(5) man page — https://linux.die.net/man/5/strongswan_ipsec.conf (verified conn parameters: keyexchange, ikelifetime, dpdaction, forceencaps, leftsubnet, etc.)
- AWS EC2 CLI reference for create-customer-gateway / create-vpn-gateway / create-vpn-connection / enable-vgw-route-propagation and the vpn-connection-available waiter
- AWS Direct Connect CLI reference for create-direct-connect-gateway, create-private-virtual-interface, create-direct-connect-gateway-association
- gcloud compute reference for vpn-gateways, routers, external-vpn-gateways, vpn-tunnels, and interconnects attachments partner create
- Terraform AWS provider (aws_vpn_connection tunnel phase1/phase2 options) and Google provider (google_compute_ha_vpn_gateway, google_compute_router_peer)

## Issues Found
- **Architecture diagram — incorrect cross-cloud link label.** The first Mermaid diagram labeled the connection between the AWS Virtual Private Gateway and the GCP Cloud VPN Gateway as "VPC Peering". VPC peering (AWS VPC Peering / GCP VPC Network Peering) is an intra-provider construct and cannot connect two different cloud providers; cross-cloud connectivity must be a VPN or interconnect. Changed the label to "Cross-Cloud VPN" to reflect a technically valid topology.

## Review Notes
- AWS VPN throughput claim ("Up to 1.25 Gbps") is correct as the default/Standard per-tunnel maximum. AWS now also offers a "Large" 5 Gbps-per-tunnel mode, but only on Transit Gateway / Cloud WAN attachments (not Virtual Private Gateway), so the post's figure remains accurate for the VGW-based architecture shown.
- The example EC2 AMI (`ami-0c55b159cbfafe1f0`) is a placeholder/illustrative ID and is region- and time-specific; readers must supply a current AMI for their region. On Amazon Linux 2 the WireGuard kernel module availability depends on kernel version (built-in on newer 5.x kernels); `wireguard-tools` provides the userspace utilities. This is a deployment caveat, not an error.
- strongSwan's classic (policy-based) IPsec does not create `ipsecN` interfaces by default, so the static-route example using `dev ipsec0`/`ipsec1` assumes route-based/VTI tunnels. This is illustrative and the BGP/netplan alternatives in the same section cover the policy-based case; left as-is.
- BIRD config uses the 169.254.100.x APIPA range for the AWS VPN BGP peer, which overlaps the Direct Connect VIF example range; with real AWS Site-to-Site VPN the tunnel inside addresses are AWS-assigned. Illustrative and internally consistent across the post's examples.
- The strongSwan service name (`strongswan-starter`) is correct for the ipsec.conf-based setup on Debian/Ubuntu; newer swanctl-based deployments would use the `strongswan` unit. Both are valid depending on configuration style.
- Encryption/integrity choices (IKEv2, AES-256, SHA2-256, DH group 14/modp2048) are current and align with cloud provider supported proposals.
