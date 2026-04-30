# Validation Summary: How to Configure IPv4 Routes in GCP VPC

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud VPC static routes
- Google Cloud CLI (`gcloud`)
- Classic VPN
- Cloud Router
- Connectivity Tests
- Terraform Google provider

## Sources Consulted
- Google Cloud VPC static routes overview: https://docs.cloud.google.com/vpc/docs/static-routes
- Google Cloud route management guide: https://cloud.google.com/vpc/docs/using-routes
- `gcloud compute routes create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/routes/create
- `gcloud network-management connectivity-tests create` reference: https://cloud.google.com/sdk/gcloud/reference/network-management/connectivity-tests/create
- Connectivity Tests how-to: https://docs.cloud.google.com/network-intelligence-center/docs/connectivity-tests/how-to/running-connectivity-tests
- Terraform Google provider `google_compute_route` docs source: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_route.html.markdown
- Terraform Google provider `google_compute_vpn_tunnel` docs source: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_vpn_tunnel.html.markdown

## Issues Found
- The post referred to VPN tunnel next hops generically. I updated those references to Classic VPN tunnels because Google Cloud static routes use Classic VPN tunnel next hops for this route type.
- The introduction implied that custom routes simply override default routing. I clarified that route selection is based on destination specificity and route priority.
- Two CLI examples used the wrong flag name, `--next-hop-ip`. I corrected them to `--next-hop-address`, which is the current `gcloud compute routes create` flag for specifying a next hop instance by IP address.
- The virtual appliance example had invalid shell syntax because a line continuation backslash was followed by an inline comment. I removed the broken inline comment and kept the example shell-safe.
- The NAT instance and virtual appliance examples omitted the required IP forwarding prerequisite for instance-based routing. I added the missing requirement and noted the need for appropriate OS-level NAT/firewall configuration.
- The "Policy-Based Routing with Tags" section title was inaccurate. I renamed it because tagged static routes are not the same feature as Google Cloud Policy-based Routes.
- The route listing example used `nextHopType` in the output format, which is not part of the documented Compute Engine route resource fields used in this post. I simplified the format string to documented route fields.
- The Connectivity Tests comment described an instance-to-instance test, but the command models the destination as an IP address. I updated the comment to match the actual command.

## Review Notes
- Static routes with `next-hop-vpn-tunnel` are a Classic VPN concept. For dynamic hybrid routing, Google Cloud documentation recommends HA VPN with Cloud Router.
- `gcloud compute routes list` shows non-dynamic routes. Learned dynamic routes are viewed through Cloud Router status or the Google Cloud console.
