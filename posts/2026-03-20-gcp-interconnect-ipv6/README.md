# How to Configure GCP Interconnect with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IPv6, Interconnect, Cloud Interconnect, BGP, Dual-Stack, Hybrid Cloud

Description: Configure Google Cloud Dedicated Interconnect and Partner Interconnect VLAN attachments for IPv6, enable BGP sessions for IPv6 route advertisement, and test dual-stack hybrid connectivity.

## Introduction

Google Cloud Interconnect supports IPv6 on dual-stack VLAN attachments, enabling dual-stack connectivity between on-premises networks and GCP VPCs. To carry IPv6 traffic from GCP workloads, your VPC subnets and VM interfaces must also be configured for internal IPv6. IPv6 over Interconnect requires configuring BGP sessions for IPv6 route exchange. With Dedicated Interconnect, you can use an IPv4 BGP session with MP-BGP or configure a separate IPv6 BGP session. Both Dedicated Interconnect and Partner Interconnect support IPv6.

## Configure VLAN Attachment with IPv6

```bash
PROJECT="my-project"
REGION="us-east1"

# Create Cloud Router for Interconnect

gcloud compute routers create router-interconnect \
    --project="$PROJECT" \
    --network=vpc-main \
    --region="$REGION" \
    --asn=65000

# Create Interconnect VLAN attachment with IPv6
gcloud compute interconnects attachments dedicated create vlan-attachment-1 \
    --project="$PROJECT" \
    --region="$REGION" \
    --router=router-interconnect \
    --interconnect=my-interconnect \
    --vlan=100 \
    --bandwidth=10g \
    --stack-type=IPV4_IPV6

# View the attachment configuration
gcloud compute interconnects attachments describe vlan-attachment-1 \
    --project="$PROJECT" \
    --region="$REGION" \
    --format="json(stackType, cloudRouterIpv6Address, customerRouterIpv6Address)"

# The output shows:
# cloudRouterIpv6Address: Google-assigned IPv6 /125 for the Cloud Router interface
# customerRouterIpv6Address: Google-assigned IPv6 /125 for your on-premises router subinterface
```

## Configure BGP for IPv6 Route Exchange

```bash
# Create a Cloud Router interface for the VLAN attachment
gcloud compute routers add-interface router-interconnect \
    --project="$PROJECT" \
    --region="$REGION" \
    --interface-name=if-interconnect-v4 \
    --interconnect-attachment=vlan-attachment-1

# Create an IPv4 BGP peer and enable IPv6 route exchange with MP-BGP
gcloud compute routers add-bgp-peer router-interconnect \
    --project="$PROJECT" \
    --region="$REGION" \
    --interface=if-interconnect-v4 \
    --peer-name=bgp-peer-1 \
    --peer-asn=65001 \
    --enable-ipv6

# View BGP peer details, including peerIpv6NexthopAddress for on-prem route maps
gcloud compute routers describe router-interconnect \
    --region="$REGION" \
    --project="$PROJECT" \
    --format="json(bgpPeers)"

# Advertise VPC subnets and a custom IPv6 prefix to on-premises via BGP
gcloud compute routers update-bgp-peer router-interconnect \
    --project="$PROJECT" \
    --region="$REGION" \
    --peer-name=bgp-peer-1 \
    --advertisement-mode=CUSTOM \
    --set-advertisement-groups=ALL_SUBNETS \
    --set-advertisement-ranges="2600:1900:4000::/48"

# View BGP session status including IPv6
gcloud compute routers get-status router-interconnect \
    --project="$PROJECT" \
    --region="$REGION" \
    --format="json(result.bgpPeerStatus)"
```

## Terraform Interconnect with IPv6

```hcl
# interconnect_ipv6.tf

variable "project_id" {}
variable "region" { default = "us-east1" }

resource "google_compute_network" "main" {
  name                    = "vpc-main"
  project                 = var.project_id
  auto_create_subnetworks = false
}

# Cloud Router for Interconnect
resource "google_compute_router" "interconnect" {
  name    = "router-interconnect"
  region  = var.region
  network = google_compute_network.main.name
  project = var.project_id

  bgp {
    asn               = 65000
    advertise_mode    = "CUSTOM"
    advertised_groups = ["ALL_SUBNETS"]

    # Advertise IPv6 prefix
    advertised_ip_ranges {
      range = "2600:1900:4000::/48"
    }
  }
}

# Dedicated Interconnect VLAN attachment with IPv6
resource "google_compute_interconnect_attachment" "vlan_1" {
  name          = "vlan-attachment-1"
  region        = var.region
  project       = var.project_id
  type          = "DEDICATED"
  interconnect  = "projects/${var.project_id}/global/interconnects/my-interconnect"
  router        = google_compute_router.interconnect.id
  vlan_tag8021q = 100
  bandwidth     = "BPS_10G"

  # Enable dual-stack on the attachment
  stack_type = "IPV4_IPV6"
}

resource "google_compute_router_interface" "interconnect_v4" {
  name                   = "if-interconnect-v4"
  project                = var.project_id
  region                 = var.region
  router                 = google_compute_router.interconnect.name
  interconnect_attachment = google_compute_interconnect_attachment.vlan_1.name
}

resource "google_compute_router_peer" "interconnect_v4" {
  name        = "bgp-peer-1"
  project     = var.project_id
  region      = var.region
  router      = google_compute_router.interconnect.name
  interface   = google_compute_router_interface.interconnect_v4.name
  peer_asn    = 65001
  enable_ipv6 = true
}

# Output BGP peer addresses for on-prem configuration
output "cloud_router_ipv6_address" {
  value = google_compute_interconnect_attachment.vlan_1.cloud_router_ipv6_address
}

output "customer_router_ipv6_address" {
  value = google_compute_interconnect_attachment.vlan_1.customer_router_ipv6_address
}
```

## On-Premises Router Configuration (Example: Cisco)

```text
! On-premises router configuration for IPv6 MP-BGP over Interconnect
! Interface configuration for VLAN 100
interface GigabitEthernet0/0.100
  encapsulation dot1q 100
  ip address 169.254.1.2 255.255.255.248
  ipv6 address <customer-router-ipv6-address>/125
  ipv6 enable

route-map IPv6-NextHop permit 10
  set ipv6 next-hop <peer-ipv6-nexthop-address>

! BGP configuration with IPv4 session and IPv6 address family via MP-BGP
router bgp 65001
  neighbor 169.254.1.1 remote-as 65000
  neighbor 169.254.1.1 description GCP Cloud Router
  !
  address-family ipv4
    neighbor 169.254.1.1 activate
  exit-address-family
  !
  address-family ipv6
    neighbor 169.254.1.1 activate
    neighbor 169.254.1.1 route-map IPv6-NextHop out
    network 2001:db8::/48
  exit-address-family
```

## Verify IPv6 Interconnect Connectivity

```bash
# Check BGP session status
gcloud compute routers get-status router-interconnect \
    --project="$PROJECT" \
    --region="$REGION" \
    --format="table(result.bgpPeerStatus[].name, result.bgpPeerStatus[].status, result.bgpPeerStatus[].numLearnedRoutes)"

# Check best dynamic routes learned by this Cloud Router, including IPv6 prefixes
gcloud compute routers get-status router-interconnect \
    --project="$PROJECT" \
    --region="$REGION" \
    --format="json(result.bestRoutesForRouter)"

# Test IPv6 connectivity from GCP VM to on-premises
gcloud compute ssh test-vm --project="$PROJECT" --zone=us-east1-b
# Inside VM:
ping -6 -c 3 2001:db8::1  # On-premises IPv6 host
```

## Conclusion

GCP Interconnect VLAN attachments support IPv6 by setting `stack_type = "IPV4_IPV6"` on the attachment resource. For Dedicated Interconnect, create a Cloud Router interface and BGP peer for the VLAN attachment, then enable IPv6 route exchange with `--enable-ipv6` if you're using MP-BGP over an IPv4 session. Configure on-premises routers with the attachment's IPv6 interface address and the BGP peer's `peerIpv6NexthopAddress` for IPv6 advertisements. Verify connectivity with `gcloud compute routers get-status` and `ping -6` tests from dual-stack GCP VMs to on-premises IPv6 addresses.
