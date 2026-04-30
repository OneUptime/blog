# Validation Summary: How to Configure GCP Cloud NAT with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Platform (GCP)
- Google Cloud NAT / Public NAT
- NAT64
- DNS64 / Cloud DNS
- Google Cloud VPC
- Compute Engine
- `gcloud` CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud NAT overview: https://cloud.google.com/nat/docs/overview
- Public NAT: https://cloud.google.com/nat/docs/public-nat
- Quickstart: Set up and manage network address translation with Public NAT: https://cloud.google.com/nat/docs/set-up-manage-network-address-translation
- DNS64 and NAT64 for 6to4 connectivity: https://cloud.google.com/vpc/docs/ipv6-to-ipv4-overview
- Configure IPv6-only subnets and instances with DNS64 and NAT64: https://cloud.google.com/vpc/docs/connect-ipv6-to-ipv4
- Configure DNS64: https://cloud.google.com/dns/docs/configure-dns64
- `gcloud compute routers nats create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/routers/nats/create
- `gcloud compute networks subnets create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/create
- `gcloud dns policies create` reference: https://cloud.google.com/sdk/gcloud/reference/dns/policies/create
- `gcloud compute routers get-status` reference: https://cloud.google.com/sdk/gcloud/reference/compute/routers/get-status
- `gcloud compute routers get-nat-ip-info` reference: https://cloud.google.com/sdk/gcloud/reference/compute/routers/get-nat-ip-info
- Cloud NAT logs and metrics: https://cloud.google.com/nat/docs/monitoring
- Cloud NAT tuning guidance for port usage metrics: https://cloud.google.com/nat/docs/tune-nat-configuration
- Terraform Google provider `google_compute_router_nat` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_router_nat.html.markdown

## Issues Found
- The post described Cloud NAT IPv6 support as outbound IPv6-to-IPv6 NAT for internal ULA addresses. Current Google Cloud documentation describes Cloud NAT IPv6 support here as Public NAT NAT64, which enables IPv6-only VMs to reach IPv4 destinations. I corrected the introduction, description, and conclusion to reflect NAT64 accurately.
- The primary `gcloud compute routers nats create` example used `--nat-all-subnet-ip-ranges` for IPv6 and implied endpoint-independent mapping was part of the required IPv6 setup. For NAT64, the correct flags are `--nat64-all-v6-subnet-ip-ranges` or `--nat64-custom-v6-subnet-ip-ranges`, and endpoint-independent mapping is optional. I updated the commands accordingly.
- The NAT64-specific example incorrectly created a `PRIVATE` NAT gateway and omitted the required DNS64 configuration. NAT64 is part of Public NAT, and DNS64 must be configured for IPv6-only VMs to resolve IPv4-only destinations. I replaced the NAT command with a Public NAT64 configuration and added the DNS64 policy command.
- The Terraform example used only IPv4 NAT fields, claimed endpoint-independent mapping was required for IPv6, referenced an undefined network resource, and attempted to output `nat_ips` for an auto-allocated NAT. I replaced the undefined network reference with a variable, added `source_subnetwork_ip_ranges_to_nat64 = "ALL_IPV6_SUBNETWORKS"`, removed the incorrect endpoint-independent mapping claim, and changed the output to the NAT gateway identifier.
- The testing section validated IPv6-to-IPv6 egress with `ping6` and `curl -6 https://ipv6.icanhazip.com`, which does not test Cloud NAT NAT64 behavior. I changed the example to validate DNS64 synthesis and NAT64 egress to an IPv4-only destination.
- The monitoring section used an invalid Cloud Monitoring CLI pattern and the wrong metric namespace for `nat/port_usage`. I replaced that with a supported NAT IP info command and corrected the metric names to `compute.googleapis.com/nat/port_usage` for per-VM usage and `router.googleapis.com/nat/allocated_ports` for gateway-level usage.

## Review Notes
- NAT64 applies to IPv6-only Compute Engine VM instances. In dual-stack subnets, NAT64 only applies to IPv6-only VMs, not to dual-stack VMs using their IPv6 addresses.
- If you use `ipv6-access-type=INTERNAL`, the VPC network must already have an internal `/48` ULA IPv6 range assigned before you create the subnet.
