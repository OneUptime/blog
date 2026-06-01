# Validation Summary: How to Troubleshoot Non-Transitive Routing Issues with VPC Peering in GCP

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud VPC Network Peering
- Google Cloud VPC routes and static route next hops
- Google Cloud Connectivity Tests
- Compute Engine multi-NIC instances
- Network Connectivity Center
- HA VPN and Cloud Router
- Linux IP forwarding and iptables

## Sources Consulted
- Google Cloud VPC Network Peering documentation: https://cloud.google.com/vpc/docs/vpc-peering
- Google Cloud VPC Network Peering setup guide: https://cloud.google.com/vpc/docs/using-vpc-peering
- Google Cloud static routes documentation: https://cloud.google.com/vpc/docs/static-routes
- Google Cloud routes overview: https://cloud.google.com/vpc/docs/routes
- Google Cloud multiple network interfaces documentation: https://cloud.google.com/vpc/docs/multiple-interfaces-concepts
- Google Cloud create VMs with multiple network interfaces guide: https://cloud.google.com/vpc/docs/create-use-multiple-interfaces
- Google Cloud Network Connectivity Center VPC spokes overview: https://cloud.google.com/network-connectivity/docs/network-connectivity-center/concepts/vpc-spokes-overview
- Google Cloud Network Connectivity Center hubs and spokes guide: https://cloud.google.com/network-connectivity/docs/network-connectivity-center/how-to/working-with-hubs-spokes
- Google Cloud CLI reference for VPC peering creation: https://cloud.google.com/sdk/gcloud/reference/compute/networks/peerings/create
- Google Cloud CLI reference for route creation: https://cloud.google.com/sdk/gcloud/reference/compute/routes/create
- Google Cloud CLI reference for Connectivity Tests creation: https://cloud.google.com/sdk/gcloud/reference/network-management/connectivity-tests/create
- Google Cloud CLI reference for Network Connectivity Center VPC spokes: https://cloud.google.com/sdk/gcloud/reference/network-connectivity/spokes/linked-vpc-network/create

## Issues Found
- The proxy VM workaround described the failure too generally. Updated it to state the precise Google Cloud rule: static routes using an instance next-hop IP are only programmed when the next-hop IP is assigned to a VM interface in the same VPC network as the route, not in a peered VPC network.
- The multi-NIC router VM example implied that a VM in `project-b` could directly attach to VPC subnets in `project-a` and `project-c`. Updated the text and sample project flag to make clear that standalone multi-NIC instances require subnets in the same project as the VM, or a supported Shared VPC design for cross-project networks.
- The multi-NIC static route examples used `--project=project-a` and `--project=project-c` while pointing at a next-hop VM in `project-b`. Updated the examples to use a common `network-host-project`, matching Google Cloud's requirement that an instance next hop by name must be in the same project as the route and have a NIC in the route's VPC network.
- The Network Connectivity Center VPC spoke examples used `--location=global`. Updated them to use the documented `--global` flag for `gcloud network-connectivity spokes linked-vpc-network create`.

## Review Notes
The core explanation that VPC Network Peering is non-transitive is correct. Network Connectivity Center VPC spokes are a valid managed option for inter-VPC connectivity, but static route exchange across VPC spokes is not supported and VPC plus VPC peering combinations remain non-transitive; this is worth keeping in mind for future expansion of the post.
