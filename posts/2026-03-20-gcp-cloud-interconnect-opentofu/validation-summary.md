# Validation Summary: How to Create GCP Cloud Interconnect Attachments with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Google Cloud Interconnect
- Google Cloud Router
- Google provider resources for OpenTofu/Terraform
- BGP
- Hybrid cloud networking

## Sources Consulted
- Google provider `google_compute_interconnect_attachment` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_interconnect_attachment
- Google provider `google_compute_router` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router
- Google provider `google_compute_router_interface` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router_interface
- Google provider `google_compute_router_peer` resource docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router_peer
- Dedicated Interconnect overview: https://cloud.google.com/network-connectivity/docs/interconnect/concepts/dedicated-overview
- Create VLAN attachments for Dedicated Interconnect: https://cloud.google.com/network-connectivity/docs/interconnect/how-to/dedicated/creating-vlan-attachments
- Create VLAN attachments for Partner Interconnect: https://cloud.google.com/network-connectivity/docs/interconnect/how-to/partner/creating-vlan-attachments
- Create a Cloud Router to connect a VPC network to a peer network: https://cloud.google.com/network-connectivity/docs/router/how-to/create-router-vpc-network
- Configure on-premises routers for Dedicated Interconnect: https://cloud.google.com/network-connectivity/docs/interconnect/how-to/dedicated/configuring-onprem-routers
- OpenTofu `init` docs: https://opentofu.org/docs/cli/init/
- OpenTofu `plan` docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` docs: https://opentofu.org/docs/cli/commands/apply/

## Issues Found
1. **Incorrect Dedicated Interconnect description**: Changed "uses your own fiber at colocation facilities" to "uses direct physical connections at colocation facilities" to match Google Cloud's Dedicated Interconnect documentation.

2. **Misleading Cloud Router ASN comment**: Updated the `asn = 16550` comment to explain that `16550` is required for Partner Interconnect and is also valid for Dedicated Interconnect, instead of calling it a generic reserved ASN.

3. **Invalid `bandwidth` argument for `PARTNER` attachments**: Removed `bandwidth = "BPS_1G"` from the Partner Interconnect example because the provider documents `bandwidth` as output-only for `PARTNER` attachments.

4. **Incorrect Partner Interconnect key name**: Replaced the "activation key" comment with `pairing_key`, which is the value Google Cloud generates and that you share with the service provider.

5. **Incorrect BGP peer IP value**: Changed `peer_ip_address` to strip the `/29` suffix from `customer_router_ip_address`, because the attachment exports an address with prefix length while `google_compute_router_peer.peer_ip_address` expects only the peer IP address.

## Review Notes
- The `tofu init`, `tofu plan -out=tfplan`, and `tofu apply tfplan` workflow is consistent with the current OpenTofu CLI documentation.
- For Partner Interconnect, Google Cloud automatically creates the Cloud Router interface and BGP peer when you create a VLAN attachment associated with a Cloud Router.
- For Dedicated Interconnect, Google Cloud allows either ASN `16550` or a private ASN on the Cloud Router. The post keeps `16550` so the shared router example remains valid for Partner Interconnect.
