# How to Configure IPv6-Only Subnets with DNS64/NAT64 on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IPv6, DNS64, NAT64, IPv6-Only, Google Cloud, VPC

Description: Configure IPv6-only subnets on Google Cloud with DNS64 and NAT64 to allow IPv6-only VMs to communicate with IPv4-only services using protocol translation.

## Introduction

GCP supports IPv6-only subnets (`stack-type=IPV6_ONLY`) where VMs receive only IPv6 addresses. To allow these VMs to reach IPv4-only internet services, configure Cloud DNS DNS64 and Public NAT NAT64: DNS64 synthesizes AAAA records for IPv4-only domains by using the well-known NAT64 prefix `64:ff9b::/96`, and NAT64 translates outbound IPv6 packets to IPv4. This lets new workloads avoid dual-stack complexity while maintaining compatibility with IPv4 internet services.

## Create IPv6-Only Subnet

```bash
PROJECT="my-project"
REGION="us-east1"

# Create VPC with custom mode

gcloud compute networks create vpc-ipv6only \
    --project="$PROJECT" \
    --subnet-mode=custom

# Create IPv6-only subnet with external IPv6 addresses
gcloud compute networks subnets create subnet-ipv6only \
    --project="$PROJECT" \
    --network=vpc-ipv6only \
    --region="$REGION" \
    --stack-type=IPV6_ONLY \
    --ipv6-access-type=EXTERNAL

# Allow SSH over IPv6 for testing
gcloud compute firewall-rules create allow-ssh-ipv6 \
    --project="$PROJECT" \
    --network=vpc-ipv6only \
    --direction=INGRESS \
    --action=ALLOW \
    --rules=tcp:22 \
    --source-ranges=::/0

# View the IPv6-only subnet
gcloud compute networks subnets describe subnet-ipv6only \
    --region="$REGION" \
    --project="$PROJECT" \
    --format="json(stackType, externalIpv6Prefix, ipv6AccessType)"

# Create VM in IPv6-only subnet
gcloud compute instances create vm-ipv6only \
    --project="$PROJECT" \
    --zone=us-east1-b \
    --machine-type=n2-standard-2 \
    --network-interface=subnet=subnet-ipv6only,stack-type=IPV6_ONLY,ipv6-network-tier=PREMIUM \
    --image-family=debian-12 \
    --image-project=debian-cloud
```

## Configure Cloud NAT for NAT64

```bash
# Cloud Router is required for Cloud NAT
gcloud compute routers create router-ipv6only \
    --project="$PROJECT" \
    --network=vpc-ipv6only \
    --region="$REGION"

# Configure Cloud NAT with NAT64 support for IPv6 source ranges
gcloud compute routers nats create nat-nat64 \
    --project="$PROJECT" \
    --router=router-ipv6only \
    --region="$REGION" \
    --auto-allocate-nat-external-ips \
    --nat64-all-v6-subnet-ip-ranges

# Verify NAT configuration
gcloud compute routers nats describe nat-nat64 \
    --router=router-ipv6only \
    --region="$REGION" \
    --project="$PROJECT"
```

## DNS64 Configuration

```bash
# Create a DNS64 server policy for the VPC network
gcloud dns policies create dns64-ipv6only \
    --project="$PROJECT" \
    --description="DNS64 for IPv6-only workloads" \
    --networks=vpc-ipv6only \
    --enable-dns64-all-queries

# Verify the DNS64 policy
gcloud dns policies describe dns64-ipv6only \
    --project="$PROJECT"

# How DNS64 works:
# 1. IPv6-only VM queries: dig AAAA ipv4only.arpa
# 2. Cloud DNS DNS64 checks: no AAAA record exists
# 3. Cloud DNS DNS64 synthesizes: 64:ff9b::c000:aa and 64:ff9b::c000:ab
# 4. VM connects to the synthesized IPv6 address
# 5. Cloud NAT64 translates to IPv4 and forwards

# Test DNS64 from IPv6-only VM
gcloud compute ssh vm-ipv6only \
    --project="$PROJECT" \
    --zone=us-east1-b

# Inside VM:
ip -6 addr show                # Only IPv6 address
dig AAAA ipv4only.arpa        # Should return synthesized 64:ff9b::/96 addresses
ping6 -c 3 64:ff9b::808:808   # Tests NAT64 to 8.8.8.8
curl -6 https://ipv4.google.com/  # Uses DNS64 + NAT64 to reach an IPv4-only hostname
```

## Terraform IPv6-Only Subnet with NAT64

```hcl
# ipv6_only_nat64.tf

variable "project_id" {}
variable "region" { default = "us-east1" }

resource "google_compute_network" "ipv6only" {
  name                    = "vpc-ipv6only"
  auto_create_subnetworks = false
  project                 = var.project_id
}

# IPv6-only subnet
resource "google_compute_subnetwork" "ipv6only" {
  name    = "subnet-ipv6only"
  region  = var.region
  network = google_compute_network.ipv6only.id
  project = var.project_id

  stack_type       = "IPV6_ONLY"
  ipv6_access_type = "EXTERNAL"
}

# Allow SSH over IPv6 for testing
resource "google_compute_firewall" "allow_ssh_ipv6" {
  name    = "allow-ssh-ipv6"
  network = google_compute_network.ipv6only.name
  project = var.project_id

  direction     = "INGRESS"
  source_ranges = ["::/0"]

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
}

# DNS64 policy
resource "google_dns_policy" "dns64" {
  name    = "dns64-ipv6only"
  project = var.project_id

  dns64_config {
    scope {
      all_queries = true
    }
  }

  networks {
    network_url = google_compute_network.ipv6only.id
  }
}

# Cloud Router
resource "google_compute_router" "ipv6only" {
  name    = "router-ipv6only"
  region  = var.region
  network = google_compute_network.ipv6only.id
  project = var.project_id
}

# Cloud NAT providing NAT64
resource "google_compute_router_nat" "nat64" {
  name                                  = "nat-nat64"
  router                                = google_compute_router.ipv6only.name
  region                                = var.region
  project                               = var.project_id
  nat_ip_allocate_option                = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat64  = "ALL_IPV6_SUBNETWORKS"
}

# IPv6-only VM
resource "google_compute_instance" "ipv6only" {
  name         = "vm-ipv6only"
  machine_type = "n2-standard-2"
  zone         = "${var.region}-b"
  project      = var.project_id

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.ipv6only.id
    stack_type = "IPV6_ONLY"

    ipv6_access_config {
      network_tier = "PREMIUM"
    }
  }
}
```

## Verify DNS64 and NAT64

```bash
# Inside IPv6-only VM:

# Confirm no IPv4 address
ip addr show | grep "inet "    # Should show nothing or loopback only

# Test DNS64 synthesis
dig AAAA ipv4only.arpa
# Returns synthesized 64:ff9b::c000:aa and 64:ff9b::c000:ab

# Test NAT64 connectivity to IPv4 internet
ping6 -c 3 64:ff9b::808:808     # NAT64 translates to 8.8.8.8
curl -6 https://ipv4.google.com/ # DNS64 + NAT64 reaches an IPv4-only hostname

# Test direct IPv6 connectivity (still works)
curl -6 https://ipv6.google.com/
ping6 -c 3 2001:4860:4860::8888
```

## Conclusion

GCP IPv6-only subnets use `stack-type=IPV6_ONLY`, Cloud DNS DNS64 server policies, and Public NAT NAT64 to reach IPv4-only internet destinations. DNS64 synthesizes `64:ff9b::/96` AAAA records for IPv4-only domains, while Cloud NAT64 handles the protocol translation. DNS64 isn't automatic for IPv6-only subnets: you must create a DNS64 server policy and configure Cloud NAT for IPv6 source ranges. This enables fully IPv6-only workloads while maintaining backward compatibility with IPv4 internet services.
