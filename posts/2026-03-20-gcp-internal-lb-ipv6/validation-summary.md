# Validation Summary: How to Configure GCP Internal Load Balancer with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud VPC networking
- Google Cloud internal passthrough Network Load Balancer
- Google Cloud internal HTTP(S) / Application Load Balancer
- IPv6 and dual-stack subnets
- `gcloud` CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud: Internal passthrough Network Load Balancer overview — https://cloud.google.com/load-balancing/docs/internal
- Google Cloud: Set up an internal passthrough Network Load Balancer with VM instance group backends — https://cloud.google.com/load-balancing/docs/internal/setting-up-internal
- Google Cloud: IPv6 for Application Load Balancers and proxy Network Load Balancers — https://cloud.google.com/load-balancing/docs/ipv6
- Google Cloud: Convert Application Load Balancer to IPv6 — https://cloud.google.com/load-balancing/docs/https/convert-applb-dualstack
- Google Cloud: Subnets — https://cloud.google.com/vpc/docs/subnets
- Google Cloud: Reserve a static internal IP address — https://cloud.google.com/vpc/docs/reserve-static-internal-ip-address
- Google Cloud: Firewall rules for load balancers — https://cloud.google.com/load-balancing/docs/firewall-rules
- Google Cloud SDK: `gcloud compute networks update` — https://cloud.google.com/sdk/gcloud/reference/compute/networks/update
- Google Cloud SDK: `gcloud compute networks subnets update` — https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update
- Google Cloud SDK: `gcloud compute forwarding-rules create` — https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- Terraform Registry: `google_compute_forwarding_rule` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_forwarding_rule
- Terraform Registry: `google_compute_network` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network
- Terraform Registry: `google_compute_subnetwork` — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork

## Issues Found
- The post originally treated internal HTTP(S) Load Balancer as if it supported IPv6 frontends. I corrected this to match current Google Cloud behavior: regional and cross-region internal HTTP(S) / Application Load Balancers support dual-stack backends only, not IPv6 frontends.
- The post omitted the VPC-level prerequisite for internal IPv6. I added the required ULA internal IPv6 enablement step for the VPC and the matching Terraform network setting.
- The Terraform examples mixed product capabilities and included an IPv6 frontend pattern that was not valid for internal HTTP(S) load balancing. I replaced that section with a dual-stack-backend example and kept the IPv6 frontend example scoped to the internal passthrough Network Load Balancer.
- The `gcloud compute addresses create` example included `--address-type=INTERNAL`, which is not part of the documented CLI flow for reserving an internal IPv6 address from a subnet. I removed it and corrected the forwarding-rule example to include the IPv6-specific subnet, protocol, and backend-service region flags.
- The firewall rule guidance incorrectly suggested allowing `fd20::/20` as the source range for backend traffic. For an internal passthrough Network Load Balancer, backends see the original client source IP, so the firewall rule must allow the actual client IPv6 ranges instead.
- The access example used an IPv6 literal with `curl` without disabling curl globbing and did not show how to retrieve the reserved address. I fixed the example to look up the reserved address first and use `curl -g -6`.
- The post did not explain that the internal IPv6 frontend is a private `/96` range allocated from a subnet's internal `/64`. I corrected the introductory explanation to reflect the documented address model.

## Review Notes
- As of 2026-04-30, internal passthrough Network Load Balancers support IPv6 frontends, while internal HTTP(S) / Application Load Balancers still use IPv4 frontends even when their backends are dual-stack.
- The Terraform snippets are illustrative and assume an existing backend instance group and workload configuration.
