# How to Configure Network Connectivity Center for Hub-and-Spoke Topology on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Network Connectivity Center, Hub and Spoke, Networking, Hybrid Cloud, Google Cloud

Description: Learn how to set up Google Cloud Network Connectivity Center to build a hub-and-spoke network topology connecting VPCs, on-premises networks, and other clouds.

---

As organizations grow their Google Cloud presence, they often end up with a tangled web of VPC peering connections, VPN tunnels, and interconnects. Each new network connection adds complexity, and the operational overhead of managing point-to-point links grows quadratically. Network Connectivity Center (NCC) brings order to this chaos by providing a centralized hub that connects all your spokes - VPCs, on-premises sites, and even other clouds - through a single management point.

This guide walks through setting up a hub-and-spoke topology using NCC, covering the most common spoke types and practical considerations for production deployments.

## What Network Connectivity Center Does

NCC operates as a hub that connects multiple spokes. A spoke can be a VPC network, an on-premises site connected via HA VPN or Interconnect, or a remote cloud connected via VPN. The hub handles route exchange between spokes, so traffic can flow between connected spokes over Google's network.

The major advantage over traditional VPC peering is transitivity. With peering, if VPC-A peers with VPC-B and VPC-B peers with VPC-C, VPC-A cannot reach VPC-C. NCC solves this by exchanging routes through a central hub.

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
gcloud network-connectivity spokes linked-vpc-network create shared-services-spoke \
  --hub=projects/hub-project/locations/global/hubs/my-network-hub \
  --global \
  --vpc-network=projects/shared-services-project/global/networks/shared-vpc \
  --description="Shared services VPC spoke" \
  --project=shared-services-project
```

### Connect Application VPCs

```bash
# Connect the production application VPC
gcloud network-connectivity spokes linked-vpc-network create prod-app-spoke \
  --hub=projects/hub-project/locations/global/hubs/my-network-hub \
  --global \
  --vpc-network=projects/prod-project/global/networks/prod-vpc \
  --description="Production application VPC" \
  --project=prod-project

# Connect the development VPC
gcloud network-connectivity spokes linked-vpc-network create dev-spoke \
  --hub=projects/hub-project/locations/global/hubs/my-network-hub \
  --global \
  --vpc-network=projects/dev-project/global/networks/dev-vpc \
  --description="Development VPC" \
  --project=dev-project
```

With these three spokes connected and accepted by the hub administrator, resources in any of the three VPCs can reach each other through the hub. Routes are exchanged automatically.

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

# Define the on-premises VPN gateway
gcloud compute external-vpn-gateways create onprem-external-gateway \
  --interfaces=0=203.0.113.10,1=203.0.113.11 \
  --project=hub-project

# Create VPN tunnels (two for HA)
gcloud compute vpn-tunnels create onprem-tunnel-0 \
  --vpn-gateway=onprem-vpn-gateway \
  --interface=0 \
  --peer-external-gateway=onprem-external-gateway \
  --peer-external-gateway-interface=0 \
  --region=us-central1 \
  --ike-version=2 \
  --shared-secret=YOUR_SHARED_SECRET \
  --router=hub-router \
  --project=hub-project

gcloud compute vpn-tunnels create onprem-tunnel-1 \
  --vpn-gateway=onprem-vpn-gateway \
  --interface=1 \
  --peer-external-gateway=onprem-external-gateway \
  --peer-external-gateway-interface=1 \
  --region=us-central1 \
  --ike-version=2 \
  --shared-secret=YOUR_SHARED_SECRET \
  --router=hub-router \
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
gcloud network-connectivity spokes linked-vpn-tunnels create onprem-dc1-spoke \
  --hub=my-network-hub \
  --region=us-central1 \
  --vpn-tunnels=onprem-tunnel-0,onprem-tunnel-1 \
  --site-to-site-data-transfer \
  --include-import-ranges=ALL_IPV4_RANGES \
  --description="On-premises data center 1" \
  --project=hub-project
```

The `--site-to-site-data-transfer` flag enables traffic between this hybrid spoke and other hybrid spokes to transit through the hub. The `--include-import-ranges=ALL_IPV4_RANGES` flag lets the hybrid spoke import VPC spoke subnet ranges from the hub and advertise them to its BGP peers.

## Adding Interconnect Spokes

For high-bandwidth on-premises connections, use Dedicated or Partner Interconnect as spokes.

```bash
# Attach an existing Interconnect VLAN attachment as a spoke
gcloud network-connectivity spokes linked-interconnect-attachments create interconnect-dc1-spoke \
  --hub=my-network-hub \
  --region=us-central1 \
  --interconnect-attachments=dc1-vlan-attachment-0,dc1-vlan-attachment-1 \
  --site-to-site-data-transfer \
  --include-import-ranges=ALL_IPV4_RANGES \
  --description="Interconnect to DC1" \
  --project=hub-project
```

## Route Exchange and Filtering

NCC automatically exchanges eligible routes between spokes. VPC subnet routes and IPv4 dynamic routes learned via BGP can be exchanged with other spokes. You can filter which subnet ranges are exported from VPC spokes using include and exclude export ranges, and you can control which hub subnet ranges are imported by hybrid spokes using include import ranges.

```bash
# View the effective routes for a specific spoke
gcloud network-connectivity hubs describe my-network-hub \
  --project=hub-project \
  --format="yaml(routingVpcs)"

# Check spoke status and connectivity
gcloud network-connectivity hubs list-spokes my-network-hub \
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
  project  = "shared-services-project"

  linked_vpc_network {
    uri = "projects/shared-services-project/global/networks/shared-vpc"
  }
}

# VPC spoke for production
resource "google_network_connectivity_spoke" "production" {
  name     = "prod-spoke"
  hub      = google_network_connectivity_hub.main.id
  location = "global"
  project  = "prod-project"

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
    include_import_ranges      = ["ALL_IPV4_RANGES"]
  }
}
```

## Monitoring and Troubleshooting

Monitor the hub and spokes using Cloud Monitoring.

```bash
# Check the status of all spokes
gcloud network-connectivity hubs list-spokes my-network-hub \
  --project=hub-project \
  --format="table(name, state, linkedVpcNetwork.uri, linkedVpnTunnels.uris)"
```

Common issues to watch for:

IP address overlap between spokes causes route conflicts. Plan your IP address space carefully before connecting VPCs to the hub. Each VPC connected as a spoke should have non-overlapping CIDR ranges.

BGP session flapping on VPN spokes indicates unstable tunnel connections. Check your VPN tunnel status and on-premises router health.

Missing routes usually mean a spoke is not in the ACTIVE state. Check the spoke status and verify that the underlying resources (VPN tunnels, Interconnect attachments, or VPCs) are properly configured.

## Cost Considerations

NCC charges for active spoke hours and for data processed through the hub. Data transfer and general networking charges vary by spoke type, source, and destination. Plan your spoke placement to minimize cross-region data transfer where possible.

There is no charge for the hub resource itself, but active spokes can incur hourly charges. You also pay for the underlying resources, such as Cloud VPN tunnels or Interconnect VLAN attachments, and for applicable data transfer.

Network Connectivity Center transforms complex multi-network architectures into a manageable hub-and-spoke topology. The automatic route exchange eliminates manual route management, and the centralized view makes it much easier to understand how traffic flows across your organization.
