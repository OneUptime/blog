# Validation Summary: How to Create Hetzner Cloud Networks with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform
- Hetzner Cloud
- Hetzner Cloud Terraform/OpenTofu Provider (`hetznercloud/hcloud`)
- HCL configuration language
- Private networking (CIDR, subnets, routes)

## Sources Consulted
- Hetzner Cloud Terraform Provider — `hcloud_network`: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/network.md
- Hetzner Cloud Terraform Provider — `hcloud_network_subnet`: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/network_subnet.md
- Hetzner Cloud Terraform Provider — `hcloud_network_route`: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/network_route.md
- Hetzner Cloud Terraform Provider — `hcloud_server_network`: https://github.com/hetznercloud/terraform-provider-hcloud/blob/main/docs/resources/server_network.md
- Hetzner Cloud Locations documentation: https://docs.hetzner.com/cloud/general/locations/

## Issues Found
- The "Multi-Zone Network Setup" section labelled the eu-central locations as "(Nuremberg, Frankfurt)". Hetzner Cloud's eu-central zone consists of Nuremberg (`nbg1`), Falkenstein (`fsn1`), and Helsinki (`hel1`) — Frankfurt is not a Hetzner Cloud location. Updated the comment to "(Nuremberg, Falkenstein, Helsinki)".

## Review Notes
- The `hcloud_network_subnet.type` attribute also accepts `server` in addition to the documented `cloud` and `vswitch`. The post's comment listing only `cloud` and `vswitch` is accurate for current usage (`cloud` is the standard value for Cloud servers), so no change was made.
- The post lists only `eu-central` and `us-east` as `network_zone` examples in a comment; `us-west` (Hillsboro) and `ap-southeast` (Singapore) also exist. This is illustrative rather than incorrect, so no change was made.
- The route example uses gateway `10.0.1.1`, which is a valid private IP (not the first IP of the network's `ip_range` `10.0.0.0/8`) and is acceptable for a custom router/NAT host.
- The `depends_on = [hcloud_network_subnet.servers]` on `hcloud_server` is the documented best practice when using the inline `network` block, since the subnet must exist before the server is attached.
- All resource attributes (`hcloud_network`, `hcloud_network_subnet`, `hcloud_network_route`, `hcloud_server_network`, and the `network` block on `hcloud_server`) match the official provider schema.
- Server type `cx22`, image `ubuntu-24.04`, and location `nbg1` are all valid current Hetzner Cloud values.
