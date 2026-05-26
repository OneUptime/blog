# Validation Summary: How to Use Ansible to Manage GCP Cloud Router

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Google Cloud `google.cloud` collection
- Google Cloud Router
- Cloud NAT
- HA VPN
- Cloud Interconnect
- BGP

## Sources Consulted
- Ansible `google.cloud.gcp_compute_router` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_router_module.html
- Ansible `google.cloud.gcp_compute_router_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_router_info_module.html
- Ansible `google.cloud.gcp_compute_external_vpn_gateway` module documentation: https://docs.ansible.com/ansible/latest/collections/google/cloud/gcp_compute_external_vpn_gateway_module.html
- Ansible `google.cloud` collection module index: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/index.html
- Google Cloud Router overview: https://docs.cloud.google.com/network-connectivity/docs/router/concepts/overview
- Google Cloud Router creation guide: https://docs.cloud.google.com/network-connectivity/docs/router/how-to/create-router-vpc-network
- Google Cloud `gcloud compute vpn-gateways create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/vpn-gateways/create
- Google Cloud `gcloud compute routers nats create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/nats/create
- Google Cloud `gcloud compute routers nats delete` reference: https://cloud.google.com/sdk/gcloud/reference/compute/routers/nats/delete
- Google Compute Engine routers REST resource reference: https://docs.cloud.google.com/compute/docs/reference/rest/v1/routers

## Issues Found
- The post used `google.cloud.gcp_compute_ha_vpn_gateway`, but that module is not present in the current `google.cloud` collection module index. I changed the HA VPN gateway creation task to use `ansible.builtin.command` with the documented `gcloud compute vpn-gateways create` command and added the Google Cloud CLI prerequisite.
- The post used `google.cloud.gcp_compute_router_nat`, but that module is not present in the current `google.cloud` collection module index. I changed the Cloud NAT create and delete tasks to use documented `gcloud compute routers nats create` and `gcloud compute routers nats delete` commands.
- The post said Classic VPN with dynamic routing depends on Cloud Router. Google documentation now describes Classic VPN dynamic routing as optional and limited to specific scenarios, with other dynamic routing functionality deprecated. I narrowed the wording.
- The post said Cloud Router advertises all subnet routes by default. I changed this to say default subnet advertisement follows the VPC network dynamic routing mode.
- The best practices said every Cloud Router needs an ASN and listed only the 16-bit private ASN range. Google documentation says Cloud NAT does not use ASN information, and Cloud Router supports 16-bit and 32-bit private ASNs for BGP. I updated the guidance to apply to BGP use cases and include both private ranges.
- The post said a router is needed in each region if subnets exist in multiple regions. I narrowed this to regions where Cloud NAT, HA VPN, or Interconnect is needed.
- The multi-region example templated ASN values as strings even though the Ansible module documents `bgp.asn` as an integer. I added an `int` filter.
- The router info example assumed every router has `bgp.asn`. Because Cloud NAT routers can exist without ASN information, I changed the debug expression to print `not configured` when BGP is absent.

## Review Notes
The remaining Cloud Router examples use documented `google.cloud.gcp_compute_router` and `google.cloud.gcp_compute_router_info` parameters. I could not run the Ansible playbooks locally because Ansible is not installed in this environment, so validation was based on official Ansible and Google Cloud documentation.
