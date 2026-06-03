# Validation Summary: How to Configure VPN Redundancy with Dual Tunnels

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Site-to-Site VPN
- AWS Virtual Private Gateway
- AWS Transit Gateway
- AWS Customer Gateway
- IPsec/IKEv2 tunnel options
- BGP routing and failover
- FRRouting
- Amazon CloudWatch VPN metrics
- AWS CLI

## Sources Consulted
- AWS Site-to-Site VPN User Guide: What is AWS Site-to-Site VPN? https://docs.aws.amazon.com/vpn/latest/s2svpn/VPC_VPN.html
- AWS Site-to-Site VPN User Guide: Tunnel options for your AWS Site-to-Site VPN connection https://docs.aws.amazon.com/vpn/latest/s2svpn/VPNTunnels.html
- AWS Site-to-Site VPN User Guide: Configure tunnel options for AWS Site-to-Site VPN https://docs.aws.amazon.com/vpn/latest/s2svpn/tunnel-configure.html
- AWS Site-to-Site VPN User Guide: Route tables and AWS Site-to-Site VPN route priority https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-route-priority.html
- AWS Site-to-Site VPN User Guide: AWS Site-to-Site VPN quotas https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-limits.html
- AWS Site-to-Site VPN User Guide: Monitor AWS Site-to-Site VPN tunnels using Amazon CloudWatch https://docs.aws.amazon.com/vpn/latest/s2svpn/monitoring-cloudwatch-vpn.html
- AWS CLI Command Reference: ec2 create-vpn-connection https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpn-connection.html
- AWS CLI Command Reference: ec2 create-customer-gateway https://docs.aws.amazon.com/cli/latest/reference/ec2/create-customer-gateway.html
- AWS CLI Command Reference: cloudwatch put-metric-alarm https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- FRRouting BGP documentation https://docs.frrouting.org/en/latest/bgp.html

## Issues Found
- The custom tunnel pre-shared key examples used hyphens. AWS custom PSKs allow alphanumeric characters, periods, and underscores only, so the examples were changed to `YourStrongPskTunnel1_2026` and `YourStrongPskTunnel2_2026`.
- The FRRouting BGP timer comment said the default hold timer is 90 seconds, while the post text correctly described the standard default as 60/180. The comment was corrected to 180 seconds.
- The FRRouting examples placed peer timers inside the IPv4 address-family and the outbound route-map directly under `router bgp`. The timers were moved to the global neighbor context, and the route-map application was moved under `address-family ipv4 unicast`.
- The second customer gateway example used `--public-ip`, which is deprecated in the current AWS CLI documentation. It was changed to `--ip-address`.
- The active/active description implied all dual-tunnel setups carry traffic simultaneously and provide instant failover. AWS documents that ECMP is needed to use more than one tunnel for equal-cost forwarding, and failover depends on routing convergence, so the wording was narrowed to ECMP-capable transit gateway/customer gateway setups and "faster failover after routing reconverges."
- The AS path prepending section did not include AWS's route-priority caveat. AWS recommends allowing asymmetric routing where supported and only using AS path prepending/Local Preference for devices that do not support asymmetric routing, so the introductory sentence was updated.

## Review Notes
- The AWS CLI command structures, tunnel option field names, CloudWatch `TunnelState` metric and dimensions, and `describe-vpn-connections` telemetry query are consistent with AWS documentation.
- The FRRouting examples are conceptual and assume the tunnel interfaces and inside addresses are configured elsewhere.
