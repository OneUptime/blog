# Validation Summary: How to Configure MTU Settings to Prevent Packet Fragmentation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud VPC
- Google Cloud VPN
- IPsec ESP
- MTU and Path MTU Discovery
- ICMP
- Linux iproute2
- Linux iptables TCPMSS
- Netplan
- Cisco IOS
- tcpdump

## Sources Consulted
- Google Cloud VPN MTU considerations: https://docs.cloud.google.com/network-connectivity/docs/vpn/concepts/mtu-considerations
- Google Cloud VPC MTU documentation: https://docs.cloud.google.com/vpc/docs/mtu
- Google Cloud SDK `gcloud compute networks update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/update
- Google Cloud SDK `gcloud compute firewall-rules create`: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- RFC 1191, Path MTU Discovery: https://www.rfc-editor.org/rfc/rfc1191
- RFC 4303, IP Encapsulating Security Payload: https://www.rfc-editor.org/rfc/rfc4303
- Cisco IOS `ip tcp adjust-mss` command reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipapp/command/iap-cr-book/iap-i2.html
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Linux iputils `ping(8)` manual: https://man7.org/linux/man-pages/man8/ping.8%40%40iputils.html
- Wireshark/libpcap filter manual: https://www.wireshark.org/docs/man-pages/pcap-filter.html

## Issues Found
- The Cloud VPN MTU table used outdated/simplified values for HA VPN, NAT-T, and Classic VPN. Updated it to distinguish Cloud VPN gateway MTU from payload MTU, including current Google Cloud values for Classic VPN, HA VPN, HA VPN over Cloud Interconnect, AEAD ciphers, non-AEAD ciphers, and IPv6 gateway interfaces.
- The IPsec overhead range was too narrow for current Cloud VPN payload MTU values. Updated the explanation to reflect overhead implied by Google Cloud's documented payload MTUs.
- The VPC MTU change note said VMs must be restarted. Updated it to say affected VMs must be stopped and started because a guest OS reboot does not update the advertised MTU.
- The VM, Linux host, Cisco, MSS clamping, and ping examples used 1440 MTU and 1400 MSS as generic Cloud VPN values. Updated them to use the documented 1406-byte Cloud VPN payload MTU for AEAD ciphers on IPv4 gateway interfaces and the corresponding 1366-byte IPv4 TCP MSS.
- The VPC MTU options section said GCP VPC networks support only 1460 and 1500. Updated it to the current supported range of 1300 through 8896, with 1460 as the default.
- The final recommendation used 1440 as a blanket safe value. Updated it to recommend matching the peer VPN gateway to Cloud VPN gateway MTU and using the documented payload MTU for traffic inside the tunnel.

## Review Notes
Google Cloud's Cloud VPN documentation states that Cloud VPN performs MSS clamping for TCP traffic. The post's router-side MSS clamping guidance is still valid as a practical peer-side control, but readers should verify the exact payload MTU for their cipher suite and whether their tunnel uses IPv4 or IPv6 gateway interfaces.
