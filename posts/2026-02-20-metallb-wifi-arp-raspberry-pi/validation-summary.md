# Validation Summary: How to Fix MetalLB WiFi ARP Issues on Raspberry Pi Clusters

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes Services and kubectl
- MetalLB Layer 2 mode
- MetalLB BGP mode
- Raspberry Pi networking
- WiFi ARP/proxy ARP behavior
- UniFi wireless settings
- OpenWrt wireless configuration
- Linux ARP tooling

## Sources Consulted
- MetalLB Layer 2 mode documentation: https://metallb.io/concepts/layer2/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB advanced L2 configuration documentation: https://metallb.io/configuration/_advanced_l2_configuration/
- MetalLB API reference: https://metallb.io/apis/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes labels documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- RFC 9119, Multicast Considerations over IEEE 802 Wireless Media: https://www.rfc-editor.org/rfc/rfc9119.html
- Cisco wireless ARP proxy documentation: https://www.cisco.com/c/en/us/td/docs/wireless/controller/9800/17-11/config-guide/b_wl_17_eleven_cg/m_arp_proxy.html
- Ubiquiti UniFi broadcast traffic documentation: https://help.ui.com/hc/en-us/articles/27384925962647-Managing-Broadcast-Traffic-with-UniFi
- OpenWrt WiFi configuration documentation: https://openwrt.org/docs/guide-user/network/wifi/basic
- OpenWrt network configuration documentation: https://openwrt.org/docs/guide-user/network/network_configuration

## Issues Found
- The post stated that ARP was "almost always" the root cause and that most APs have ARP proxy or client isolation features that interfere with MetalLB. I softened this to "a common root cause" and "some" APs because the behavior is vendor and configuration dependent.
- The ARP suppression explanation said APs only forward requests for known clients. I clarified that this specifically applies to proxy ARP or ARP optimization behavior, where the AP uses known associated-client mappings.
- The post described the issue as "MAC filtering." I changed this to "IP/MAC binding or ARP inspection," which more accurately describes network features that can reject unexpected gratuitous ARP or IP-to-MAC mappings.
- The `arping` example hard-coded `eth0` on the client. I changed it to `<client-interface>` because the correct interface depends on the client machine.
- The wired-node MetalLB example used a node selector but did not constrain the announcement interface. I added `interfaces: [eth0]` to match the recommendation to announce from the Ethernet interface.
- The UniFi section used Linux `/proc/sys/net/ipv4/conf/br0/proxy_arp` commands as if they were a reliable UniFi AP configuration method. I replaced that with UniFi Network SSID settings for Client Device Isolation and Multicast and Broadcast Control.
- The OpenWrt section disabled `igmp_snooping` as an ARP-related fix. IGMP snooping is multicast-specific, not an ARP broadcast control, so I removed that command and kept the wireless client isolation setting.
- The Solution 3 heading and flowchart label referred only to disabling ARP proxy. I changed them to adjusting AP broadcast and isolation settings to match the corrected advice.
- The conclusion said WiFi access points filter ARP traffic categorically. I changed it to say they can filter or optimize ARP traffic.

## Review Notes
The MetalLB `IPAddressPool`, `L2Advertisement`, `BGPPeer`, and `BGPAdvertisement` examples use current CRD API versions according to the MetalLB documentation. The BGP example is syntactically valid, but it still requires a router that is actually configured to peer with MetalLB and route the advertised service IPs.
