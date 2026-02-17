# How to Configure Network Connectivity Center for Hub-and-Spoke Topology on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Network Connectivity Center, Hub and Spoke, Networking, Hybrid Cloud, Google Cloud

Description: Learn how to set up Google Cloud Network Connectivity Center to build a hub-and-spoke network topology connecting VPCs, on-premises networks, and other clouds.

---

As organizations grow their Google Cloud presence, they often end up with a tangled web of VPC peering connections, VPN tunnels, and interconnects. Each new network connection adds complexity, and the operational overhead of managing point-to-point links grows quadratically. Network Connectivity Center (NCC) brings order to this chaos by providing a centralized hub that connects all your spokes - VPCs, on-premises sites, and even other clouds - through a single management point.

This guide walks through setting up a hub-and-spoke topology using NCC, covering the most common spoke types and practical considerations for production deployments.

## What Network Connectivity Center Does

NCC operates as a hub that connects multiple spokes. A spoke can be a VPC network, an on-premises site connected via HA VPN or Interconnect, or a remote cloud connected via VPN. The hub handles route exchange between spokes, so traffic can flow between any two spokes through Google's backbone network.

The major advantage over traditional VPC peering is transitivity. With peering, if VPC-A peers with VPC-B and VPC-B peers with VPC-C, VPC-A cannot reach VPC-C. NCC solves this by routing all traffic through the hub.

## Creating the Hub

Start by enabling the API and creating the hub resource.

```bash
# Enable the Network Connectivity API
gcloud services enable networkconnectivity.googleapis.com \
  --project=hub-project

# Create the Network Connectivity Center hub
gcloud network-connectivity hubs create my-network-hub \
  --description="Central hub for all network connectivity" \
  --project=hub-project
```

The hub itself is a logical resource - it does not consume any IP address space or create any physical infrastructure.

## Adding VPC Spokes

VPC spokes connect your Google Cloud VPC networks to the hub. This is useful when you have multiple VPCs that need to communicate.

### Connect a Shared Services VPC

```bash
# Create a VPC spoke for the shared services network
gcloud network-connectivity spokes create shared-services-spoke \
  --hub=my-network-hub \
  --location=global \
  --linked-vpc-network=projects/shared-services-project/global/networks/shared-vpc \
  --description="Shared services VPC spoke" \
  --project=hub-project
```

### Connect Application VPCs

```bash
# Connect the production application VPC
gcloud network-connectivity spokes create prod-app-spoke \
  --hub=my-network-hub \
  --location=global \
  --linked-vpc-network=projects/prod-project/global/networks/prod-vpc \
  --description="Production application VPC" \
  --project=hub-project

# Connect the development VPC
gcloud network-connectivity spokes create dev-spoke \
  --hub=my-network-hub \
  --location=global \
  --linked-vpc-network=projects/dev-project/global/networks/dev-vpc \
  --description="Development VPC" \
  --project=hub-project
```

With these three spokes connected, resources in any of the three VPCs can reach each other through the hub. Routes are exchanged automatically.

## Adding VPN Spokes for On-Premises Connectivity

To connect on-premises data centers, create HA VPN tunnels and attach them as spokes.

### Create the HA VPN Gateway

```bash
# Create an HA VPN gateway in the hub VPC
gcloud compute vpn-gateways create onprem-vpn-gateway \
  --network=hub-vpc \
  --region=us-central1 \
  --project=hub-project

# Create a Cloud Router for BGP
gcloud compute routers create hub-router \
  --network=hub-vpc \
  --region=us-central1 \
  --asn=65001 \
  --project=hub-project

# Create VPN tunnels (two for HA)
gcloud compute vpn-tunnels create onprem-tunnel-0 \
  --vpn-gateway=onprem-vpn-gateway \
  --peer-gcp-gateway=PEER_GATEWAY_OR_EXTERNAL_IP \
  --region=us-central1 \
  --ike-version=2 \
  --shared-secret=YOUR_SHARED_SECRET \
  --router=hub-router \
  --vpn-gateway-interface=0 \
  --project=hub-project

gcloud compute vpn-tunnels create onprem-tunnel-1 \
  --vpn-gateway=onprem-vpn-gateway \
  --peer-gcp-gateway=PEER_GATEWAY_OR_EXTERNAL_IP \
  --region=us-central1 \
  --ike-version=2 \
  --shared-secret=YOUR_SHARED_SECRET \
  --router=hub-router \
  --vpn-gateway-interface=1 \
  --project=hub-project
```

### Configure BGP Sessions

```bash
# Add BGP interfaces and peers for each tunnel
gcloud compute routers add-interface hub-router \
  --interface-name=onprem-bgp-if-0 \
  --vpn-tunnel=onprem-tunnel-0 \
  --ip-address=169.254.0.1 \
  --mask-length=30 \
  --region=us-central1 \
  --project=hub-project

gcloud compute routers add-bgp-peer hub-router \
  --peer-name=onprem-peer-0 \
  --interface=onprem-bgp-if-0 \
  --peer-ip-address=169.254.0.2 \
  --peer-asn=65002 \
  --region=us-central1 \
  --project=hub-project

gcloud compute routers add-interface hub-router \
  --interface-name=onprem-bgp-if-1 \
  --vpn-tunnel=onprem-tunnel-1 \
  --ip-address=169.254.1.1 \
  --mask-length=30 \
  --region=us-central1 \
  --project=hub-project

gcloud compute routers add-bgp-peer hub-router \
  --peer-name=onprem-peer-1 \
  --interface=onprem-bgp-if-1 \
  --peer-ip-address=169.254.1.2 \
  --peer-asn=65002 \
  --region=us-central1 \
  --project=hub-project
```

### Attach VPN as a Spoke

```bash
# Create a VPN spoke connecting the on-premises network through the HA VPN
gcloud network-connectivity spokes create onprem-dc1-spoke \
  --hub=my-network-hub \
  --location=us-central1 \
  --linked-vpn-tunnels=onprem-tunnel-0,onprem-tunnel-1 \
  --site-to-site-data-transfer \
  --description="On-premises data center 1" \
  --project=hub-project
```

The `--site-to-site-data-transfer` flag enables traffic between this spoke and other spokes to transit through the hub. Without it, the spoke can only communicate with the hub VPC itself.

## Adding Interconnect Spokes

For high-bandwidth on-premises connections, use Dedicated or Partner Interconnect as spokes.

```bash
# Attach an existing Interconnect VLAN attachment as a spoke
gcloud network-connectivity spokes create interconnect-dc1-spoke \
  --hub=my-network-hub \
  --location=us-central1 \
  --linked-interconnect-attachments=dc1-vlan-attachment-0,dc1-vlan-attachment-1 \
  --site-to-site-data-transfer \
  --description="Interconnect to DC1" \
  --project=hub-project
```

## Route Exchange and Filtering

NCC automatically exchanges routes between spokes. All VPC subnets and on-premises routes learned via BGP are distributed to all other spokes. You can filter which routes are shared using export and import policies.

```bash
# View the effective routes for a specific spoke
gcloud network-connectivity hubs describe my-network-hub \
  --project=hub-project \
  --format="yaml(routingVpcs)"

# Check spoke status and connectivity
gcloud network-connectivity spokes list \
  --hub=my-network-hub \
  --project=hub-project
```

## Terraform Configuration

Here is a Terraform configuration for a complete hub-and-spoke setup.

```hcl
# Network Connectivity Center hub
resource "google_network_connectivity_hub" "main" {
  name        = "my-network-hub"
  description = "Central network hub"
  project     = "hub-project"
}

# VPC spoke for shared services
resource "google_network_connectivity_spoke" "shared_services" {
  name     = "shared-services-spoke"
  hub      = google_network_connectivity_hub.main.id
  location = "global"
  project  = "hub-project"

  linked_vpc_network {
    uri = "projects/shared-services-project/global/networks/shared-vpc"
  }
}

# VPC spoke for production
resource "google_network_connectivity_spoke" "production" {
  name     = "prod-spoke"
  hub      = google_network_connectivity_hub.main.id
  location = "global"
  project  = "hub-project"

  linked_vpc_network {
    uri = "projects/prod-project/global/networks/prod-vpc"
  }
}

# VPN spoke for on-premises
resource "google_network_connectivity_spoke" "onprem" {
  name     = "onprem-spoke"
  hub      = google_network_connectivity_hub.main.id
  location = "us-central1"
  project  = "hub-project"

  linked_vpn_tunnels {
    uris                 = [
      google_compute_vpn_tunnel.tunnel_0.self_link,
      google_compute_vpn_tunnel.tunnel_1.self_link,
    ]
    site_to_site_data_transfer = true
  }
}
```

## Monitoring and Troubleshooting

Monitor the hub and spokes using Cloud Monitoring.

```bash
# Check the status of all spokes
gcloud network-connectivity spokes list \
  --hub=my-network-hub \
  --project=hub-project \
  --format="table(name, state, linkedVpcNetwork.uri, linkedVpnTunnels.uris)"
```

Common issues to watch for:

IP address overlap between spokes causes route conflicts. Plan your IP address space carefully before connecting VPCs to the hub. Each VPC connected as a spoke should have non-overlapping CIDR ranges.

BGP session flapping on VPN spokes indicates unstable tunnel connections. Check your VPN tunnel status and on-premises router health.

Missing routes usually mean a spoke is not in the ACTIVE state. Check the spoke status and verify that the underlying resources (VPN tunnels, Interconnect attachments, or VPCs) are properly configured.

## Cost Considerations

NCC charges for data transfer between spokes. Intra-region traffic (spoke to spoke within the same region) is cheaper than inter-region traffic. Plan your spoke placement to minimize cross-region data transfer where possible.

There is no charge for the hub resource itself or for the spoke configuration. You only pay for the data that actually transits between spokes.

Network Connectivity Center transforms complex multi-network architectures into a manageable hub-and-spoke topology. The automatic route exchange eliminates manual route management, and the centralized view makes it much easier to understand how traffic flows across your organization.
