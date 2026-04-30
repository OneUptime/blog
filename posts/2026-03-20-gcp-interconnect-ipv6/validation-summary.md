# Validation Summary: How to Configure GCP Interconnect with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Dedicated Interconnect
- Google Cloud Partner Interconnect
- Cloud Router
- BGP and MP-BGP
- IPv6 and dual-stack networking
- `gcloud` CLI
- Terraform
- Cisco IOS/IOS-XE style router configuration

## Sources Consulted
- Google Cloud: Create VLAN attachments for Dedicated Interconnect  
  https://cloud.google.com/network-connectivity/docs/interconnect/how-to/dedicated/creating-vlan-attachments
- Google Cloud: Modify Dedicated Interconnect VLAN attachments  
  https://cloud.google.com/network-connectivity/docs/interconnect/how-to/dedicated/modifying-vlan-attachments
- Google Cloud: Configure on-premises routers for Dedicated Interconnect  
  https://cloud.google.com/network-connectivity/docs/interconnect/how-to/dedicated/configuring-onprem-routers
- Google Cloud: Establish BGP sessions  
  https://cloud.google.com/network-connectivity/docs/router/how-to/configuring-bgp
- Google Cloud: Configure multiprotocol BGP for IPv4 or IPv6 BGP sessions  
  https://cloud.google.com/network-connectivity/docs/router/how-to/configuring-mp-bgp
- Google Cloud: Dedicated Interconnect overview  
  https://cloud.google.com/network-connectivity/docs/interconnect/concepts/dedicated-overview
- Google Cloud SDK: `gcloud compute interconnects attachments dedicated create`  
  https://cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/dedicated/create
- Google Cloud SDK: `gcloud compute routers update-bgp-peer`  
  https://cloud.google.com/sdk/gcloud/reference/compute/routers/update-bgp-peer
- Google Cloud SDK: `gcloud compute routes list`  
  https://cloud.google.com/sdk/gcloud/reference/compute/routes/list
- Terraform Google provider docs: `google_compute_interconnect_attachment`  
  https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_interconnect_attachment.html.markdown
- Terraform Google provider docs: `google_compute_router`  
  https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_router.html.markdown
- Terraform Google provider docs: `google_compute_router_interface`  
  https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_router_interface.html.markdown
- Terraform Google provider docs: `google_compute_router_peer`  
  https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_router_peer.html.markdown

## Issues Found
- The post implied that a Dedicated Interconnect attachment already had a BGP peer ready to update. For Dedicated Interconnect, you must first add a Cloud Router interface and then add a BGP peer. I replaced the invalid `update-bgp-peer`-first flow with `add-interface` and `add-bgp-peer`.
- The post described the attachment IPv6 addresses as link-local or suitable for `--ipv6-nexthop-address`. That was incorrect. I corrected the explanation to use the attachment’s Google-assigned IPv6 interface addresses and removed the incorrect `--ipv6-nexthop-address=<link-local-ipv6>` usage.
- The Terraform example was incomplete for Dedicated Interconnect because it created the router and attachment but not the router interface and BGP peer. I added `google_compute_router_interface` and `google_compute_router_peer`.
- The Terraform outputs referenced non-existent attributes: `cloud_router_ipv6_interface_id` and `customer_router_ipv6_interface_id`. I replaced them with the correct computed attributes: `cloud_router_ipv6_address` and `customer_router_ipv6_address`.
- The Terraform snippet referenced an undefined VPC network resource. I added a minimal `google_compute_network` resource so the example is internally consistent.
- The Cisco example was not correct for MP-BGP IPv6 exchange over an IPv4 BGP session. It was missing the route-map used to set the IPv6 next hop, and its IPv4 mask did not match the default `/29` Interconnect peering allocation. I corrected the Cisco sample accordingly.
- The verification section used `gcloud compute routes list` to check learned IPv6 routes. That command lists non-dynamic routes only. I replaced it with `gcloud compute routers get-status`, which is the documented way to inspect dynamic routes learned by Cloud Router.
- The verification example used `ping6` and `traceroute6` as if they were always available. I simplified the example to `ping -6`, which is the safer generic Linux form for a minimal connectivity test.
- The introduction omitted an important prerequisite for end-to-end IPv6 testing from GCP VMs: dual-stack or otherwise IPv6-capable VPC subnet and VM interface configuration. I added that prerequisite.

## Review Notes
- The examples in the post are now technically aligned with Dedicated Interconnect. Partner Interconnect also supports IPv6, but its operational flow differs because Google manages the Cloud Router interface and BGP peer for partner attachments.
