# Validation Summary: How to Configure GCP Cloud Interconnect IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Interconnect
- Google Cloud Router
- BGP / MP-BGP
- IPv6 and dual-stack networking
- `gcloud` CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud Interconnect, Dedicated: https://cloud.google.com/network-connectivity/docs/interconnect/how-to/dedicated/creating-vlan-attachments
- Google Cloud Interconnect, Partner: https://cloud.google.com/network-connectivity/docs/interconnect/how-to/partner/creating-vlan-attachments
- Cloud Router BGP configuration: https://cloud.google.com/network-connectivity/docs/router/how-to/configuring-bgp
- Cloud Router MP-BGP configuration: https://cloud.google.com/network-connectivity/docs/router/how-to/configuring-mp-bgp
- `gcloud compute interconnects attachments dedicated update`: https://cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/dedicated/update
- `gcloud compute interconnects attachments partner update`: https://cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/partner/update
- `gcloud compute interconnects attachments describe`: https://cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/describe
- `gcloud compute routers add-bgp-peer`: https://cloud.google.com/sdk/gcloud/reference/compute/routers/add-bgp-peer
- `gcloud compute routers update-bgp-peer`: https://cloud.google.com/sdk/gcloud/reference/compute/routers/update-bgp-peer
- Terraform `google_compute_interconnect_attachment`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_interconnect_attachment
- Terraform `google_compute_router_interface`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router_interface
- Terraform `google_compute_router_peer`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router_peer

## Issues Found
- The post treated subnet dual-stack configuration as the mechanism that enables Cloud Interconnect IPv6. I changed this to attachment-level configuration because IPv6 for Cloud Interconnect is enabled on the VLAN attachment with `stack_type` / `--stack-type`, while dual-stack subnets are only needed if Google Cloud workloads also need internal IPv6 addresses.
- The original `gcloud compute networks subnets update ... --stack-type IPV4_IPV6 --ipv6-access-type INTERNAL` example was not the correct operation for enabling IPv6 on a Cloud Interconnect attachment. I replaced it with the current Dedicated and Partner VLAN attachment update commands and an attachment verification command.
- The BGP example manually assigned `2001:db8::1` and `2001:db8::2` to a Cloud Router peer. That is incorrect for Cloud Interconnect: the attachment and peer addresses are allocated from Google-managed ranges, and `peer_ip_address` on the router peer resource is IPv4-only. I replaced the example with the documented Interconnect router-interface flow and `--enable-ipv6` on the BGP peer.
- The Terraform example omitted the dual-stack VLAN attachment configuration and did not enable IPv6 on the BGP peer. I replaced it with a Dedicated Interconnect example that sets `stack_type = "IPV4_IPV6"`, attaches the router interface to the VLAN attachment, and sets `enable_ipv6 = true` on the peer.
- The conclusion said Cloud Interconnect IPv6 is enabled at the subnet level. I corrected that to attachment-level and BGP-session-level configuration.

## Review Notes
- The corrected CLI flow uses MP-BGP to exchange IPv6 routes over an IPv4 BGP session, which is supported for dual-stack VLAN attachments and is simpler than showing a separate IPv6-only BGP session.
- Partner Interconnect behaves differently from Dedicated Interconnect in one important way: Google automatically adds the Cloud Router interface and BGP peer for the attachment. The revised post reflects that distinction in the attachment step and avoids the previous implication that both modes use the same manual peer-address workflow.
