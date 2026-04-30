# Validation Summary: How to Configure IPv6-Only Subnets with DNS64/NAT64 on GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud VPC
- Google Cloud DNS64
- Google Cloud Public NAT / NAT64
- Compute Engine IPv6-only instances
- `gcloud` CLI
- Terraform Google provider
- IPv6 transition mechanisms

## Sources Consulted
- Google Cloud: Configure IPv6-only subnets and instances with DNS64 and NAT64
  https://cloud.google.com/vpc/docs/connect-ipv6-to-ipv4
- Google Cloud: DNS64 and NAT64 for 6to4 connectivity
  https://cloud.google.com/vpc/docs/ipv6-to-ipv4-overview
- Google Cloud: Configure DNS64
  https://cloud.google.com/dns/docs/configure-dns64
- Google Cloud: Public NAT
  https://cloud.google.com/nat/docs/public-nat
- Google Cloud SDK reference: `gcloud compute routers nats create`
  https://cloud.google.com/sdk/gcloud/reference/compute/routers/nats/create
- Google Cloud: Quickstart: Create and manage VPC networks
  https://cloud.google.com/vpc/docs/create-modify-vpc-networks
- Google Cloud: Create an instance that uses IPv6 addresses
  https://cloud.google.com/compute/docs/instances/create-ipv6-instance
- Terraform provider docs source: `google_compute_router_nat`
  https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_router_nat.html.markdown
- Terraform provider docs source: `google_compute_subnetwork`
  https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_subnetwork.html.markdown
- Terraform provider docs source: `google_compute_network`
  https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_network.html.markdown
- Terraform provider docs source: `google_dns_policy`
  https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/dns_policy.html.markdown
- RFC 8880: Special Use Domain Name `ipv4only.arpa`
  https://www.rfc-editor.org/rfc/rfc8880.html

## Issues Found
- The post said DNS64 was provided automatically by the VPC DNS resolver for IPv6-only subnets. That was incorrect. Google Cloud requires a Cloud DNS DNS64 server policy. I added the `gcloud dns policies create ... --enable-dns64-all-queries` step and the Terraform `google_dns_policy` resource.
- The Cloud NAT example enabled ordinary subnet NAT but not NAT64 for IPv6 source ranges. I changed the `gcloud` command to use `--nat64-all-v6-subnet-ip-ranges` and the Terraform example to use `source_subnetwork_ip_ranges_to_nat64 = "ALL_IPV6_SUBNETWORKS"`.
- The subnet examples claimed an IPv4 subnet range was still required for an IPv6-only subnet. Current Google Cloud documentation shows IPv6-only subnets are created without `--range`, and the Terraform resource can omit `ip_cidr_range` for this case. I removed those fields.
- The original example used `ipv6-access-type=INTERNAL` while also using VM and testing commands that fit an external IPv6 setup better. I made the example consistent by using an external IPv6-only subnet, keeping the external IPv6 access config on the VM, and adding an IPv6 SSH firewall rule for the test flow.
- The test hostnames `ipv4only.example.com` and `ipv4only-site.com` were placeholders, not reliable real targets. I replaced the DNS64 synthesis check with `ipv4only.arpa` and updated the reachability tests to use a synthesized NAT64 address and `ipv4.google.com`.
- Some wording implied NAT64/DNS64 would reach generic IPv4-only services. Google Cloud documents this path for IPv4 destinations on the internet, not private IPv4 destinations in VPCs or on-premises networks. I narrowed the wording to IPv4-only internet services/destinations.

## Review Notes
- The added SSH firewall rule uses `::/0` for testability. That is workable for a tutorial, but in production it should be restricted to trusted source ranges.
- DNS64 server policies apply to IPv6-only VMs; Google Cloud documents that they do not apply to dual-stack or IPv4-only VMs.
- The tutorial uses Debian 12, which is compatible with Google Cloud's documented IPv6-only VM support.
