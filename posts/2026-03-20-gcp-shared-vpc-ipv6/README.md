# How to Configure GCP Shared VPC IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Shared VPC, IPv6, Host Project, Service Project, Dual-Stack

Description: Configure GCP Shared VPC to allocate IPv6 subnets from the host project to service projects for centralized IPv6 management.

## Introduction

In GCP Shared VPC, service projects use subnets that are defined in the host project. To use internal IPv6, enable dual-stack on the shared subnet in the host project. If you also need IPv6 connectivity to on-premises networks or another VPC through HA VPN or Cloud Interconnect, enable IPv6 route exchange on the relevant Cloud Router BGP session.

## Prerequisites

- A custom-mode Shared VPC host VPC network and a service project attached to it
- An existing GCP account with appropriate IAM permissions
- If you use internal IPv6, a `/48` ULA IPv6 range assigned to the host VPC network
- If you need hybrid IPv6 routing, an existing HA VPN or Cloud Interconnect attachment with Cloud Router

## Step 1: Verify IPv6 Prerequisites

```bash
# Check whether the host VPC already has an internal IPv6 /48 range
gcloud compute networks describe my-network \
    --project HOST_PROJECT_ID \
    --format="value(internalIpv6Range)"
```

## Step 2: Enable IPv6 on the Shared Subnet

```bash
# Enable internal IPv6 on the host VPC if it is not already enabled
gcloud compute networks update my-network \
    --project HOST_PROJECT_ID \
    --enable-ula-internal-ipv6

# Enable dual-stack with internal IPv6 on the shared subnet in the host project
gcloud compute networks subnets update my-subnet \
    --project HOST_PROJECT_ID \
    --region us-central1 \
    --stack-type IPV4_IPV6 \
    --ipv6-access-type INTERNAL

# Verify
gcloud compute networks subnets describe my-subnet \
    --project HOST_PROJECT_ID \
    --region us-central1 \
    --format="value(stackType,ipv6AccessType,ipv6CidrRange)"
```

## Step 3: Configure IPv6 BGP for Hybrid Connectivity

```bash
# If you use HA VPN or Cloud Interconnect, enable IPv6 route exchange
# on an existing Cloud Router BGP peer
gcloud compute routers update-bgp-peer my-router \
    --project HOST_PROJECT_ID \
    --region us-central1 \
    --peer-name my-bgp-peer \
    --enable-ipv6
```

## Step 4: Add Custom IPv6 Route Advertisements

```bash
# Advertise a custom IPv6 prefix while continuing to advertise subnets
gcloud compute routers update-bgp-peer my-router \
    --project HOST_PROJECT_ID \
    --region us-central1 \
    --peer-name my-bgp-peer \
    --enable-ipv6 \
    --advertisement-mode custom \
    --set-advertisement-groups=all_subnets \
    --set-advertisement-ranges '2001:db8:abcd:12::/64'
```

## Step 5: Test IPv6 Connectivity and Routes

```bash
# Test from a VM in the service project that uses the shared subnet
ping -6 -c 3 <ipv6-address>

# Verify IPv6 routes advertised to the BGP peer
gcloud compute routers list-bgp-routes my-router \
    --project HOST_PROJECT_ID \
    --region us-central1 \
    --peer my-bgp-peer \
    --address-family IPV6 \
    --route-direction OUTBOUND
```

## Step 6: Terraform Example

```hcl
# Terraform for a dual-stack shared subnet in the host project
resource "google_compute_network" "shared_vpc" {
  project                  = var.host_project_id
  name                     = "shared-vpc"
  auto_create_subnetworks  = false
  enable_ula_internal_ipv6 = true
}

resource "google_compute_subnetwork" "shared_subnet" {
  project          = var.host_project_id
  name             = "shared-subnet"
  region           = var.region
  network          = google_compute_network.shared_vpc.id
  ip_cidr_range    = "10.0.0.0/24"
  stack_type       = "IPV4_IPV6"
  ipv6_access_type = "INTERNAL"
}
```

## Conclusion

GCP Shared VPC IPv6 starts with enabling dual-stack on the shared subnet in the host project. If you also need on-premises or inter-VPC IPv6 routing, enable IPv6 route exchange on the relevant Cloud Router BGP session and validate the advertised or learned IPv6 routes. Use Terraform for declarative, repeatable deployments. Monitor IPv6 BGP session state and route advertisement with OneUptime's network health checks.
