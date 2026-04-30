# Validation Summary: Internal vs External IPv6 in Google Cloud

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud VPC
- Google Compute Engine
- Google Cloud NAT / Public NAT
- Google Cloud DNS / DNS64
- IPv6
- `gcloud` CLI
- RFC 4193 ULA addressing

## Sources Consulted
- Google Cloud VPC subnet documentation: https://cloud.google.com/vpc/docs/subnets
- Google Cloud guide for IPv6-only to IPv4 connectivity (DNS64/NAT64): https://cloud.google.com/vpc/docs/connect-ipv6-to-ipv4
- Google Cloud Public NAT documentation: https://cloud.google.com/nat/docs/public-nat
- Google Cloud DNS64 documentation: https://cloud.google.com/dns/docs/configure-dns64
- Google Cloud firewall rules documentation: https://cloud.google.com/firewall/docs/using-firewalls
- `gcloud compute networks subnets create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/create
- `gcloud compute networks update` reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/update
- `gcloud compute routers nats create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/routers/nats/create
- Compute Engine instances API reference: https://cloud.google.com/compute/docs/reference/rest/v1/instances
- RFC 4193: https://www.rfc-editor.org/rfc/rfc4193

## Issues Found
- The post omitted a prerequisite that IPv6 subnet ranges require a custom mode VPC network. I added that assumption to the introduction because the examples would fail on an auto mode network.
- The introduction implied that external IPv6 always comes from Google's public ranges. I corrected it to note that Google-provided ranges are the default, but BYOIP-provided IPv6 ranges are also supported.
- The internal IPv6 example omitted the required VPC-level ULA setup. I added `gcloud compute networks update vpc-main --enable-ula-internal-ipv6` because internal IPv6 subnets require a VPC `/48` ULA range first.
- The post described Google Cloud internal IPv6 space too loosely and misstated external subnet sizing. I corrected the text to reflect a VPC-level `/48` from Google's `fd20::/20` ULA space, a subnet `/64`, and `/96` prefixes per VM interface.
- The internal subnet inspection command used `ipv6CidrRange`. I changed it to `internalIpv6Prefix`, which is the documented subnet field for internal IPv6 prefixes.
- The VM inspection example used the wrong field for external IPv6. I corrected it to use `networkInterfaces[].ipv6AccessConfigs[].externalIpv6` and `externalIpv6PrefixLength`, while keeping `ipv6Address` and `internalIpv6PrefixLength` for internal IPv6.
- The internet connectivity section implied that internal IPv6 generally uses Cloud NAT for internet access. I corrected it to show DNS64 plus NAT64 for IPv6-only instances reaching IPv4 destinations and clarified that internal IPv6 addresses are not directly internet-routable.
- The Cloud NAT command used `--nat-all-subnet-ip-ranges`, which configures IPv4 NAT, not NAT64 for IPv6 subnet ranges. I changed it to `--nat64-all-v6-subnet-ip-ranges` and added the missing DNS64 configuration.
- Both firewall examples used invalid `gcloud` syntax because they relied on `--rules` without the required `--action` or `--allow` pattern, and the internal rule also had a broken line continuation. I fixed the commands and scoped the internal IPv6 source range to the VPC's actual `internalIpv6Range`.
- The switching section was slightly overbroad. I clarified that `ipv6-access-type` cannot be changed after IPv6 is already configured on the subnet, which matches current Google Cloud behavior.

## Review Notes
- External IPv6 in Google Cloud uses Premium Tier only. The post is still accurate without that detail, but it could be added later if the article expands into deployment prerequisites.
- NAT64 applies to IPv6-only Compute Engine instances reaching IPv4 destinations. It does not make internal IPv6 addresses directly reachable from, or directly routable to, the public IPv6 internet.
