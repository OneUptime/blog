# How to Configure GCP Cloud DNS with AAAA Records

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IPv6, Cloud DNS, AAAA Records, DNS, Google Cloud

Description: Create and manage AAAA records in Google Cloud DNS for IPv6 address resolution, configure PTR records for reverse DNS, and set up private DNS zones with IPv6 support.

## Introduction

Google Cloud DNS supports IPv6 through AAAA records for forward resolution. Cloud DNS managed zones work identically for IPv4 and IPv6 - you create AAAA records pointing hostnames to IPv6 addresses. Private zones support AAAA records for internal service discovery over IPv6. For reverse DNS of Google Cloud VM external IP addresses, configure PTR records through Compute Engine rather than by manually creating reverse zones in Cloud DNS.

## Create AAAA Records with gcloud

```bash
PROJECT="my-project"
ZONE_NAME="example-com"
DNS_NAME="example.com."

# Create a managed public DNS zone (if not existing)

gcloud dns managed-zones create "$ZONE_NAME" \
    --project="$PROJECT" \
    --dns-name="$DNS_NAME" \
    --description="Public zone for example.com"

# Add AAAA record for apex domain
gcloud dns record-sets create example.com. \
    --zone="$ZONE_NAME" \
    --type=AAAA \
    --ttl=300 \
    --rrdatas="2600:1900:4000:abc1:8000::" \
    --project="$PROJECT"

# Add AAAA record for www subdomain
gcloud dns record-sets create www.example.com. \
    --zone="$ZONE_NAME" \
    --type=AAAA \
    --ttl=300 \
    --rrdatas="2600:1900:4000:abc1:8001::" \
    --project="$PROJECT"

# Add both A and AAAA for dual-stack
gcloud dns record-sets create api.example.com. \
    --zone="$ZONE_NAME" \
    --type=A \
    --ttl=300 \
    --rrdatas="34.100.200.1" \
    --project="$PROJECT"

gcloud dns record-sets create api.example.com. \
    --zone="$ZONE_NAME" \
    --type=AAAA \
    --ttl=300 \
    --rrdatas="2600:1900:4000:abc1:8002::" \
    --project="$PROJECT"

# List records in the zone
gcloud dns record-sets list \
    --zone="$ZONE_NAME" \
    --project="$PROJECT"
```

## Terraform Cloud DNS with AAAA Records

```hcl
# cloud_dns_ipv6.tf

variable "project_id" {}

# Public managed zone
resource "google_dns_managed_zone" "public" {
  name        = "example-com"
  dns_name    = "example.com."
  project     = var.project_id
  description = "Public DNS zone"

  visibility = "public"
}

# A record (IPv4)
resource "google_dns_record_set" "a_apex" {
  name         = "example.com."
  managed_zone = google_dns_managed_zone.public.name
  project      = var.project_id
  type         = "A"
  ttl          = 300

  rrdatas = ["34.100.200.1"]
}

# AAAA record (IPv6) for apex
resource "google_dns_record_set" "aaaa_apex" {
  name         = "example.com."
  managed_zone = google_dns_managed_zone.public.name
  project      = var.project_id
  type         = "AAAA"
  ttl          = 300

  rrdatas = ["2600:1900:4000:abc1:8000::"]
}

# AAAA record for www
resource "google_dns_record_set" "aaaa_www" {
  name         = "www.example.com."
  managed_zone = google_dns_managed_zone.public.name
  project      = var.project_id
  type         = "AAAA"
  ttl          = 300

  rrdatas = ["2600:1900:4000:abc1:8001::"]
}

# Multiple AAAA records (round-robin)
resource "google_dns_record_set" "aaaa_api" {
  name         = "api.example.com."
  managed_zone = google_dns_managed_zone.public.name
  project      = var.project_id
  type         = "AAAA"
  ttl          = 60

  rrdatas = [
    "2600:1900:4000:abc1:8010::",
    "2600:1900:4000:abc1:8011::",
    "2600:1900:4000:abc1:8012::"
  ]
}
```

## Private DNS Zone with IPv6

```hcl
resource "google_compute_network" "main" {
  name                    = "main-vpc"
  auto_create_subnetworks = false
}

# Private zone for internal services
resource "google_dns_managed_zone" "private" {
  name        = "internal-example-com"
  dns_name    = "internal.example.com."
  project     = var.project_id
  description = "Private DNS zone for internal services"

  visibility = "private"

  private_visibility_config {
    networks {
      network_url = google_compute_network.main.id
    }
  }
}

# Internal AAAA record for service discovery
resource "google_dns_record_set" "aaaa_internal_service" {
  name         = "api.internal.example.com."
  managed_zone = google_dns_managed_zone.private.name
  project      = var.project_id
  type         = "AAAA"
  ttl          = 60

  # ULA IPv6 address for internal service
  rrdatas = ["fd20:0:0:1::10"]
}
```

## PTR Records for Reverse DNS

For Google Cloud VM external IPv6 addresses, verify domain ownership first, then configure the PTR record on the instance's primary network interface instead of manually creating an `ip6.arpa.` zone in Cloud DNS.

```bash
INSTANCE_NAME="my-vm"
INSTANCE_ZONE="us-central1-a"
PTR_DOMAIN="www.example.com."

# The VM must already have an external IPv6 address on nic0.
gcloud compute instances update-access-config "$INSTANCE_NAME" \
    --project="$PROJECT" \
    --zone="$INSTANCE_ZONE" \
    --ipv6-public-ptr-domain="$PTR_DOMAIN"

# Verify reverse lookup against the VM's external IPv6 address
dig -x 2600:1900:4000:abc1:8000::
```

## Conclusion

GCP Cloud DNS AAAA records work exactly like A records - use `type = "AAAA"` in Terraform or `--type=AAAA` in gcloud with the IPv6 address as the record data. Create both A and AAAA records pointing to your IPv4 and IPv6 addresses for dual-stack name resolution. Private zones support AAAA records for internal service discovery using ULA addresses. For reverse DNS of a Google Cloud VM external IPv6 address, verify domain ownership and set the PTR domain on the instance access configuration. Use `dig AAAA hostname` or `dig -x ipv6-address` to verify DNS resolution.
