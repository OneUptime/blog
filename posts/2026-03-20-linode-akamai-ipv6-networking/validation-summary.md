# Validation Summary: How to Configure Linode Akamai IPv6 Networking

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linode / Akamai Cloud Compute Instances
- Linode / Akamai Cloud NodeBalancers
- IPv6
- SLAAC
- Linux networking with `iproute2`
- `ip6tables`
- DNS and reverse DNS
- Terraform

## Sources Consulted
- Akamai Cloud docs: IPv6 on Linodes: https://techdocs.akamai.com/cloud-computing/docs/an-overview-of-ipv6-on-linode
- Akamai Cloud docs: Manual network configuration on a Linode: https://techdocs.akamai.com/cloud-computing/docs/manual-network-configuration-on-a-compute-instance
- Akamai Cloud docs: Manage IP addresses on a Linode: https://techdocs.akamai.com/cloud-computing/docs/managing-ip-addresses-on-a-compute-instance
- Akamai Cloud docs: Network configuration using NetworkManager: https://techdocs.akamai.com/cloud-computing/docs/network-configuration-using-networkmanager
- Akamai Cloud docs: Network configuration using systemd-networkd: https://techdocs.akamai.com/cloud-computing/docs/network-configuration-using-systemd-networkd
- Akamai Cloud docs: Network configuration using Netplan: https://techdocs.akamai.com/cloud-computing/docs/network-configuration-using-netplan
- Akamai Cloud docs: NodeBalancers: https://techdocs.akamai.com/cloud-computing/docs/nodebalancer
- Akamai Cloud docs: Getting started with NodeBalancers: https://techdocs.akamai.com/cloud-computing/docs/getting-started-with-nodebalancers
- Akamai Cloud docs: Create a domain: https://techdocs.akamai.com/cloud-computing/docs/create-a-domain
- Akamai Cloud docs: Configure rDNS (reverse DNS) on a Linode: https://techdocs.akamai.com/cloud-computing/docs/configure-rdns-reverse-dns-on-a-compute-instance
- Linode Terraform Provider docs: `linode_instance`: https://raw.githubusercontent.com/linode/terraform-provider-linode/dev/docs/resources/instance.md
- Linode Terraform Provider docs: `linode_nodebalancer`: https://raw.githubusercontent.com/linode/terraform-provider-linode/dev/docs/resources/nodebalancer.md
- Linode Terraform Provider docs: `linode_nodebalancer_config`: https://raw.githubusercontent.com/linode/terraform-provider-linode/dev/docs/resources/nodebalancer_config.md
- Local CLI help checked for command syntax: `ip6tables -h`, `ping -h`, `curl --help all`, and `dig -h`

## Issues Found
- The post incorrectly said IPv6 must be enabled on Linode instances. I changed this to reflect Linode’s documented behavior: each Compute instance gets a primary IPv6 address automatically via SLAAC, and NodeBalancers also receive public IPv4 and IPv6 addresses automatically.
- The interface configuration example incorrectly added a default IPv6 route via the host’s own address. I replaced it with guidance that keeps the primary IPv6 address on SLAAC, uses manual configuration only for routed `/64` or `/56` ranges, and uses `fe80::1` as the IPv6 gateway when a manual default route is required.
- The firewall example used an invalid IPv6 source prefix (`2001:db8:admin::/48`). I replaced it with a syntactically valid documentation prefix and updated the established-connection rule to use `conntrack`. I also added an explicit loopback allow rule so the sample rule set is functional with a default-drop input policy.
- The connectivity test used `ping6 -c 3 2600::`, which targets a network prefix rather than a usable host address. I replaced it with `ping -6 -c 3 google.com` and updated the `curl` examples to valid IPv6 syntax.
- The Terraform example used placeholder resource names and unsupported arguments (`example_instance`, `ipv6_enabled`, and `network.ipv6_address`) that do not match the Linode Terraform provider. I replaced it with valid `linode_instance` and `linode_nodebalancer` resources based on the current provider documentation.
- The conclusion incorrectly stated that IPv6 must be enabled at the provider level. I corrected it to reflect Linode’s provider-assigned SLAAC model and optional routed IPv6 ranges.

## Review Notes
- The post now reflects current Linode/Akamai Cloud behavior as documented on April 29, 2026.
- For NodeBalancers, IPv6 is client-facing, but backend nodes for non-VPC NodeBalancers still use private IPv4 or VPC IPv4 according to the current NodeBalancer documentation.
- The post remains intentionally high level. Future revisions could add provider-specific Cloud Manager, API, or Linode CLI examples if deeper operational detail is needed.
