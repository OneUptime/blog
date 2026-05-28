# Validation Summary: How to Create and Manage Custom Static Routes in a GCP VPC Network

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud VPC routes
- Google Cloud custom static routes
- Google Cloud CLI (`gcloud`)
- Compute Engine VM next-hop routing
- Classic VPN static routing
- Cloud NAT and default internet gateway routes
- Network Intelligence Center Connectivity Tests

## Sources Consulted
- Google Cloud VPC Routes overview: https://cloud.google.com/vpc/docs/routes
- Google Cloud Static routes: https://cloud.google.com/vpc/docs/static-routes
- Google Cloud Use routes: https://cloud.google.com/vpc/docs/using-routes
- Google Cloud CLI `gcloud compute routes create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/routes/create
- Google Cloud CLI `gcloud compute routes delete` reference: https://cloud.google.com/sdk/gcloud/reference/compute/routes/delete
- Google Cloud CLI `gcloud compute instances create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud Classic VPN static routing guide: https://cloud.google.com/network-connectivity/docs/vpn/how-to/creating-static-vpns
- Google Cloud Connectivity Tests guide: https://cloud.google.com/network-intelligence-center/docs/connectivity-tests/how-to/running-connectivity-tests
- Google Cloud CLI `gcloud network-management connectivity-tests create` reference: https://cloud.google.com/sdk/gcloud/reference/network-management/connectivity-tests/create

## Issues Found
- The post said an existing VM must be stopped, updated with IP forwarding, and restarted. Current Google Cloud docs describe updating the instance's `canIpForward` property, so the wording was corrected.
- The post only mentioned enabling IP forwarding on the VM resource. Google Cloud also requires packet forwarding to be enabled in the guest OS, so a short Linux sysctl note was added.
- The VPN static route section referred broadly to Cloud VPN. Static routes with `--next-hop-vpn-tunnel` apply to Classic VPN static routing, while HA VPN normally uses Cloud Router and dynamic routing, so the wording was qualified.
- The next-hop IP section described using `--next-hop-address` for a load balancer. Google Cloud uses `--next-hop-ilb` for an internal passthrough Network Load Balancer next hop, while `--next-hop-address` is for a valid VM-assigned IP address. The example and explanation were corrected.
- The network-tags section said untagged VMs use the default route to reach `10.50.0.0/24`. That is not guaranteed; untagged VMs use the next best applicable route or drop traffic if none exists. The explanation was corrected.
- The default-route deletion command attempted to delete `default-internet-gateway`, which is a next-hop gateway name, not necessarily the route name. The example now lists the matching default route and deletes the returned route name.
- The post said to configure Cloud NAT after deleting the default route. Public Cloud NAT depends on an IPv4 default route with next hop `default-internet-gateway`, so this was corrected.
- The troubleshooting command was labeled as listing all effective routes for a VM, but `gcloud compute routes list` lists VPC route resources and does not provide a VM-specific effective route table. The comment was corrected.

## Review Notes
The local environment did not have `gcloud` installed, so CLI syntax was verified against the official Google Cloud CLI reference instead of local `--help` output.
