# How to Create and Manage Custom Static Routes in a GCP VPC Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, VPC, Static Routes, Networking, Routing

Description: Learn how to create, manage, and troubleshoot custom static routes in GCP VPC networks to control traffic flow between subnets, VPNs, and network appliances.

---

Every VPC network in GCP has a set of system-generated routes that handle basic connectivity - routes to each subnet and a default route to the internet. But when you need traffic to flow through a network appliance, reach an on-premises network via VPN, or follow a specific path for compliance reasons, you need custom static routes.

In this post, I will cover how static routes work in GCP, how to create and manage them, and common patterns for routing traffic through firewalls and VPN tunnels.

## Understanding GCP Routes

GCP VPC routes come in three flavors:

1. **System-generated routes**: Created automatically for each subnet (local routes) and a default route (0.0.0.0/0) pointing to the default internet gateway.
2. **Custom static routes**: Routes you create manually with specific destinations and next hops.
3. **Dynamic routes**: Routes learned automatically via Cloud Router using BGP (used with Cloud VPN and Cloud Interconnect).

Each route has:
- **Destination range**: The CIDR block this route applies to
- **Next hop**: Where to send matching traffic (a VM instance, a VPN tunnel, an IP address, etc.)
- **Priority**: When multiple routes match, lower priority number wins
- **Network tags**: Optional tags to apply the route only to tagged instances

## Viewing Existing Routes

Before creating new routes, see what is already there:

```bash
# List all routes in the VPC network
gcloud compute routes list \
  --filter="network=production-vpc" \
  --format="table(name, destRange, nextHopGateway, nextHopInstance, nextHopIp, priority, tags[])"
```

You will see the system-generated routes for each subnet and the default internet gateway route.

## Creating a Static Route to a Network Appliance

One of the most common use cases is routing traffic through a firewall appliance or NAT instance. Here is how to route all outbound traffic through a firewall VM:

```bash
# Route all internet-bound traffic through a firewall VM
# This replaces the default internet gateway for tagged instances
gcloud compute routes create route-through-firewall \
  --network=production-vpc \
  --destination-range=0.0.0.0/0 \
  --next-hop-instance=firewall-vm \
  --next-hop-instance-zone=us-central1-a \
  --priority=900 \
  --tags=route-via-firewall \
  --description="Route internet traffic through firewall VM"
```

The `--tags` flag is crucial here. Only VMs tagged with `route-via-firewall` use this route. VMs without the tag continue using the default internet gateway.

Make sure the firewall VM has IP forwarding enabled:

```bash
# Enable IP forwarding on the firewall VM (required for routing)
gcloud compute instances create firewall-vm \
  --zone=us-central1-a \
  --machine-type=e2-standard-4 \
  --subnet=production-subnet \
  --can-ip-forward \
  --image-family=debian-12 \
  --image-project=debian-cloud
```

If the VM already exists, you need to stop it, enable IP forwarding, and start it again. This flag cannot be changed on a running instance.

## Creating a Route to an On-Premises Network

When you have a Cloud VPN tunnel to your data center, create routes for your on-premises CIDR blocks:

```bash
# Route traffic to on-premises network through VPN tunnel
gcloud compute routes create route-to-onprem-10 \
  --network=production-vpc \
  --destination-range=10.200.0.0/16 \
  --next-hop-vpn-tunnel=vpn-tunnel-to-onprem \
  --next-hop-vpn-tunnel-region=us-central1 \
  --priority=1000 \
  --description="Route to on-premises 10.200.0.0/16 via VPN"
```

```bash
# Route traffic to another on-premises subnet
gcloud compute routes create route-to-onprem-172 \
  --network=production-vpc \
  --destination-range=172.16.0.0/12 \
  --next-hop-vpn-tunnel=vpn-tunnel-to-onprem \
  --next-hop-vpn-tunnel-region=us-central1 \
  --priority=1000 \
  --description="Route to on-premises 172.16.0.0/12 via VPN"
```

## Creating a Route Using Next Hop IP

Instead of specifying a next hop instance by name, you can use an IP address. This is useful when the next hop might be a load balancer or a floating IP:

```bash
# Route traffic to a specific range via a next-hop IP address
gcloud compute routes create route-to-shared-services \
  --network=production-vpc \
  --destination-range=10.50.0.0/16 \
  --next-hop-address=10.10.0.100 \
  --priority=800 \
  --description="Route to shared services via internal LB"
```

The next-hop IP must be an address within one of the VPC's subnets. The instance at that IP must have IP forwarding enabled.

## Route Priority and Specificity

When multiple routes match a destination, GCP uses two criteria:

1. **Longest prefix match**: A route for 10.10.0.0/24 is preferred over 10.10.0.0/16 for traffic to 10.10.0.5.
2. **Priority**: Among routes with the same prefix length, lower priority number wins.

This lets you set up failover routing:

```bash
# Primary route through VPN tunnel 1 (lower priority number = preferred)
gcloud compute routes create primary-vpn-route \
  --network=production-vpc \
  --destination-range=10.200.0.0/16 \
  --next-hop-vpn-tunnel=vpn-tunnel-1 \
  --next-hop-vpn-tunnel-region=us-central1 \
  --priority=100

# Backup route through VPN tunnel 2 (higher priority number = fallback)
gcloud compute routes create backup-vpn-route \
  --network=production-vpc \
  --destination-range=10.200.0.0/16 \
  --next-hop-vpn-tunnel=vpn-tunnel-2 \
  --next-hop-vpn-tunnel-region=us-central1 \
  --priority=200
```

If VPN tunnel 1 goes down, GCP automatically uses tunnel 2 because the primary route becomes inactive.

## Using Network Tags for Selective Routing

Tags let you apply routes to specific VMs. This is powerful for environments where different workloads need different routing:

```bash
# Route database traffic through a dedicated secure path
gcloud compute routes create db-traffic-route \
  --network=production-vpc \
  --destination-range=10.50.0.0/24 \
  --next-hop-instance=secure-proxy \
  --next-hop-instance-zone=us-central1-a \
  --priority=500 \
  --tags=needs-secure-db-route

# Apply the tag to VMs that need this route
gcloud compute instances add-tags app-server-1 \
  --zone=us-central1-a \
  --tags=needs-secure-db-route
```

VMs without the tag use the default route to reach 10.50.0.0/24, while tagged VMs route through the secure proxy.

## Deleting the Default Internet Route

For fully private VPCs where no VM should reach the internet directly, delete the default route:

```bash
# Delete the default internet gateway route
# Warning: VMs will lose internet access unless routed through NAT or VPN
gcloud compute routes delete default-internet-gateway \
  --quiet
```

After deleting this, configure Cloud NAT or a proxy for any outbound internet access your VMs need.

## Troubleshooting Routes

When traffic is not flowing as expected, use these tools:

```bash
# List all effective routes for a specific VM
gcloud compute routes list \
  --filter="network=production-vpc" \
  --format="table(name, destRange, nextHopGateway, nextHopInstance, nextHopIp, priority)"

# Use Connectivity Tests to check if a route exists between two endpoints
gcloud network-management connectivity-tests create test-route \
  --source-instance=projects/my-project/zones/us-central1-a/instances/vm-a \
  --destination-instance=projects/my-project/zones/us-central1-a/instances/vm-b \
  --protocol=TCP \
  --destination-port=443
```

Common issues:
- **Next-hop instance does not have IP forwarding enabled**: Traffic gets dropped silently.
- **Conflicting priorities**: Two routes with the same priority and prefix length create ambiguity. GCP selects one based on internal criteria, which might not be what you expect.
- **Firewall rules blocking traffic**: Routes get traffic to the next hop, but the next hop's firewall rules might drop it. Check both routes and firewall rules.
- **Next-hop instance is stopped**: Routes pointing to stopped instances become inactive. Traffic falls through to the next matching route.

## Wrapping Up

Custom static routes give you fine-grained control over traffic flow in your GCP VPC. Use them to route through network appliances, connect to on-premises networks, and create isolated routing for different workloads. The combination of route priorities and network tags provides flexibility that covers most routing scenarios. Just remember to enable IP forwarding on any VM acting as a next hop, and always test your routing changes with connectivity tests before relying on them in production.
