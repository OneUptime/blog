# How to Configure GCP Cloud Interconnect IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Interconnect, IPv6, BGP, Dedicated, Partner, Dual-Stack

Description: Configure GCP Cloud Interconnect VLAN attachments for IPv6 BGP routing between your data center and GCP.

## Introduction

GCP Cloud Interconnect IPv6 enables private IPv6 connectivity between cloud resources and on-premises networks. Proper configuration requires enabling dual-stack on the VLAN attachment, enabling IPv6 route exchange on the BGP session, and configuring route advertisement. If your Google Cloud workloads also need internal IPv6 addresses, their VPC subnets must be dual-stack.

## Prerequisites

- A Dedicated or Partner Interconnect VLAN attachment associated with a Cloud Router in the same region
- An existing GCP account with appropriate IAM permissions
- Dual-stack (IPv4 + IPv6) VPC subnets if the Google Cloud workloads that use the attachment need internal IPv6 addresses

## Step 1: Verify IPv6 Prerequisites

```bash
# Check subnets that already use dual-stack
gcloud compute networks subnets list \
    --filter='stackType=IPV4_IPV6' \
    --format='table(name,region,stackType,ipv6AccessType)'
```

## Step 2: Enable IPv6 on the VLAN Attachment

```bash
# Use the command that matches your attachment type

# Dedicated Interconnect VLAN attachment
gcloud compute interconnects attachments dedicated update my-attachment \
    --region us-central1 \
    --stack-type IPV4_IPV6

# Partner Interconnect VLAN attachment
gcloud compute interconnects attachments partner update my-attachment \
    --region us-central1 \
    --stack-type IPV4_IPV6

# Verify the attachment has IPv6 enabled
gcloud compute interconnects attachments describe my-attachment \
    --region us-central1 \
    --format="value(stackType,cloudRouterIpv6Address,customerRouterIpv6Address)"
```

## Step 3: Configure IPv6 BGP

The example below shows the Dedicated Interconnect `gcloud` flow. For Partner Interconnect, Google automatically adds the Cloud Router interface and BGP peer for the attachment, so enable IPv6 on that existing peer with `gcloud compute routers update-bgp-peer --enable-ipv6`.

```bash
# Dedicated Interconnect: add a router interface for the attachment
gcloud compute routers add-interface my-router \
    --region us-central1 \
    --interface-name my-interface \
    --interconnect-attachment my-attachment

# Create the BGP peer and enable IPv6 route exchange
gcloud compute routers add-bgp-peer my-router \
    --region us-central1 \
    --peer-name ipv6-peer \
    --peer-asn 65001 \
    --interface my-interface \
    --enable-ipv6
```

## Step 4: Add IPv6 Routes

```bash
# Advertise IPv6 prefix from Cloud Router
gcloud compute routers update-bgp-peer my-router \
    --region us-central1 \
    --peer-name ipv6-peer \
    --advertisement-mode custom \
    --set-advertisement-ranges '2001:db8::/48'
```

## Step 5: Test IPv6 Connectivity

```bash
# Test from a dual-stack cloud instance
ping -6 -c 3 <on-premises-ipv6-address>

# Verify route is learned
gcloud compute routers get-status my-router --region us-central1 | grep -i ipv6
```

## Step 6: Terraform Example

```hcl
# Terraform for Dedicated Interconnect IPv6
resource "google_compute_interconnect_attachment" "main" {
  name         = "my-attachment"
  region       = var.region
  type         = "DEDICATED"
  router       = google_compute_router.main.id
  interconnect = google_compute_interconnect.main.id
  stack_type   = "IPV4_IPV6"
}

resource "google_compute_router_interface" "main" {
  name                    = "my-interface"
  router                  = google_compute_router.main.name
  region                  = var.region
  interconnect_attachment = google_compute_interconnect_attachment.main.name
}

resource "google_compute_router_peer" "ipv6_peer" {
  name        = "ipv6-bgp-peer"
  router      = google_compute_router.main.name
  region      = var.region
  peer_asn    = 65001
  interface   = google_compute_router_interface.main.name
  enable_ipv6 = true
}
```

## Conclusion

GCP Cloud Interconnect IPv6 requires enabling dual-stack on the VLAN attachment, enabling IPv6 route exchange on the BGP session, and advertising the IPv6 prefixes that Cloud Router should announce. If your Google Cloud workloads also need internal IPv6 addresses, use dual-stack subnets. Test connectivity end-to-end after configuration. Use Terraform for declarative, repeatable deployments. Monitor IPv6 BGP session state and route advertisement with OneUptime's network health checks.
