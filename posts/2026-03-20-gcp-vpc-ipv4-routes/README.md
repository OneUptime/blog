# How to Configure IPv4 Routes in GCP VPC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, VPC, Routing, IPv4, Cloud Networking, Static Routes

Description: Create and manage custom IPv4 static routes in a GCP VPC to direct traffic to specific next-hops, including instances, gateways, and VPN tunnels.

## Introduction

GCP VPCs have system-generated routes for subnets and a default internet gateway route. You can add custom static routes to direct traffic to specific next-hops - such as a NAT instance, Classic VPN tunnel, or virtual appliance - based on destination specificity and route priority.

## Route Types in GCP

| Route Type | Description |
|------------|-------------|
| Subnet routes | Auto-created for each VPC subnet |
| Default route | 0.0.0.0/0 → default internet gateway |
| Static custom routes | Manually created, point to a next-hop |
| Dynamic routes | Learned by Cloud Router via BGP |

## Creating a Custom Static Route

```bash
# Route traffic to 192.168.0.0/16 through a Classic VPN tunnel

gcloud compute routes create route-to-onprem \
  --network my-vpc \
  --destination-range 192.168.0.0/16 \
  --next-hop-vpn-tunnel my-vpn-tunnel \
  --next-hop-vpn-tunnel-region us-east1 \
  --priority 1000 \
  --description "Route to on-premises datacenter via VPN"
```

## Routing Through a NAT Instance

```bash
# Route internet-bound traffic from a private subnet through a NAT VM
gcloud compute routes create nat-route \
  --network my-vpc \
  --destination-range 0.0.0.0/0 \
  --next-hop-instance nat-instance \
  --next-hop-instance-zone us-east1-b \
  --priority 800 \
  --tags private-vm                  # Only applies to VMs with this network tag
```

The NAT instance must have IP forwarding enabled and be configured with any required OS-level NAT or firewall rules.

## Routing to a Virtual Appliance by Internal IP

```bash
# Route through a virtual firewall appliance by its primary internal IPv4 address
gcloud compute routes create route-via-fw \
  --network my-vpc \
  --destination-range 10.100.0.0/16 \
  --next-hop-address 10.0.1.100 \
  --priority 900
```

The appliance VM must have IP forwarding enabled, and the next-hop address must be the VM's primary internal IPv4 address.

## Listing Routes

```bash
# List all routes in the VPC
gcloud compute routes list \
  --filter="network=my-vpc" \
  --format="table(name,destRange,priority,tags)"

# Show details of a specific route
gcloud compute routes describe route-to-onprem
```

## Deleting a Route

```bash
gcloud compute routes delete route-to-onprem --quiet
```

## Terraform Configuration

```hcl
resource "google_compute_route" "to_onprem" {
  name             = "route-to-onprem"
  network          = google_compute_network.vpc.name
  dest_range       = "192.168.0.0/16"
  priority         = 1000
  next_hop_vpn_tunnel = google_compute_vpn_tunnel.main.id

  tags = ["internal"]   # Apply only to tagged instances
}
```

## Selective Routing with Tags

GCP static routes support network tags to apply routes selectively:

```bash
# Create a route that only applies to VMs tagged "backend"
gcloud compute routes create backend-route \
  --network my-vpc \
  --destination-range 10.200.0.0/16 \
  --next-hop-address 10.0.1.100 \
  --priority 900 \
  --tags backend
```

Only instances with the `backend` network tag will use this route.

## Troubleshooting Routes with Connectivity Tests

Use GCP's Connectivity Tests to verify routing:

```bash
# Test connectivity from a VM to a destination IP
gcloud network-management connectivity-tests create test-route \
  --source-instance projects/PROJECT_ID/zones/us-east1-b/instances/vm-a \
  --destination-ip-address 192.168.1.50 \
  --protocol TCP \
  --destination-port 443
```

## Conclusion

GCP static routes give you precise control over traffic paths within and out of your VPC. Use tags for selective routing, set appropriate priorities, and leverage Cloud Router for dynamic BGP routes in hybrid connectivity scenarios.
