# How to Create GCP Cloud DNS Zones and Records with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Cloud DNS, DNS, Networking, Infrastructure as Code

Description: Learn how to create and manage GCP Cloud DNS zones and records with Terraform, including public zones, private zones, DNSSEC, and various record types.

---

Cloud DNS is Google Cloud's managed DNS service. It hosts your DNS zones and serves DNS queries with low latency and high availability using Google's global anycast network. Whether you need public DNS for internet-facing domains or private DNS for internal service discovery within your VPC, Cloud DNS handles both.

Managing DNS with Terraform is one of those things that pays off immediately. DNS records are notoriously easy to mess up manually, and having them in version-controlled code prevents a whole category of outages.

## Provider Setup

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "domain" {
  description = "The domain name for the DNS zone"
  type        = string
  default     = "example.com"
}
```

## Creating a Public DNS Zone

A public zone hosts records that are accessible from the internet:

```hcl
# Public DNS zone for your domain
resource "google_dns_managed_zone" "public" {
  name        = "public-zone"
  dns_name    = "${var.domain}."  # Must end with a dot
  description = "Public DNS zone for ${var.domain}"
  visibility  = "public"

  # DNSSEC configuration for security
  dnssec_config {
    state = "on"

    default_key_specs {
      algorithm  = "rsasha256"
      key_length = 2048
      key_type   = "keySigning"
    }

    default_key_specs {
      algorithm  = "rsasha256"
      key_length = 1024
      key_type   = "zoneSigning"
    }
  }

  # Cloud logging for DNS queries
  cloud_logging_config {
    enable_logging = true
  }
}
```

The `dns_name` must end with a trailing dot - this is a DNS convention that Terraform enforces. DNSSEC adds cryptographic signatures to your DNS records, preventing spoofing attacks. Turning it on is straightforward with Terraform but remember you also need to configure DS records at your domain registrar.

## Common DNS Record Types

Let's create the most common record types:

```hcl
# A record - points domain to an IP address
resource "google_dns_record_set" "a_record" {
  name         = "${var.domain}."
  managed_zone = google_dns_managed_zone.public.name
  type         = "A"
  ttl          = 300
  rrdatas      = ["203.0.113.10"]
}

# AAAA record - IPv6 address
resource "google_dns_record_set" "aaaa_record" {
  name         = "${var.domain}."
  managed_zone = google_dns_managed_zone.public.name
  type         = "AAAA"
  ttl          = 300
  rrdatas      = ["2001:db8::1"]
}

# CNAME record - alias to another domain
resource "google_dns_record_set" "www" {
  name         = "www.${var.domain}."
  managed_zone = google_dns_managed_zone.public.name
  type         = "CNAME"
  ttl          = 300
  rrdatas      = ["${var.domain}."]
}

# MX records - email routing
resource "google_dns_record_set" "mx" {
  name         = "${var.domain}."
  managed_zone = google_dns_managed_zone.public.name
  type         = "MX"
  ttl          = 3600
  rrdatas = [
    "1 aspmx.l.google.com.",
    "5 alt1.aspmx.l.google.com.",
    "5 alt2.aspmx.l.google.com.",
    "10 alt3.aspmx.l.google.com.",
    "10 alt4.aspmx.l.google.com.",
  ]
}

# TXT record - SPF, domain verification, etc.
resource "google_dns_record_set" "txt" {
  name         = "${var.domain}."
  managed_zone = google_dns_managed_zone.public.name
  type         = "TXT"
  ttl          = 3600
  rrdatas = [
    "\"v=spf1 include:_spf.google.com ~all\"",
    "\"google-site-verification=abc123\"",
  ]
}

# SRV record - service discovery
resource "google_dns_record_set" "srv" {
  name         = "_sip._tcp.${var.domain}."
  managed_zone = google_dns_managed_zone.public.name
  type         = "SRV"
  ttl          = 300
  rrdatas      = ["10 60 5060 sip.${var.domain}."]
}

# CAA record - certificate authority authorization
resource "google_dns_record_set" "caa" {
  name         = "${var.domain}."
  managed_zone = google_dns_managed_zone.public.name
  type         = "CAA"
  ttl          = 3600
  rrdatas = [
    "0 issue \"letsencrypt.org\"",
    "0 issuewild \"letsencrypt.org\"",
    "0 iodef \"mailto:security@${var.domain}\"",
  ]
}
```

Notice that TXT records need double-quoting - the outer quotes for HCL and inner quotes for the DNS TXT record format. Also, all domain names in `rrdatas` must end with a trailing dot.

## Private DNS Zone

Private zones are only visible within specified VPC networks. They are perfect for internal service discovery:

```hcl
# VPC network for private DNS
resource "google_compute_network" "main" {
  name                    = "main-vpc"
  auto_create_subnetworks = false
}

# Private DNS zone
resource "google_dns_managed_zone" "private" {
  name        = "private-zone"
  dns_name    = "internal.${var.domain}."
  description = "Private DNS zone for internal services"
  visibility  = "private"

  private_visibility_config {
    networks {
      network_url = google_compute_network.main.id
    }
    # Add more networks if needed
    # networks {
    #   network_url = google_compute_network.other.id
    # }
  }
}

# Internal service records
resource "google_dns_record_set" "api_internal" {
  name         = "api.internal.${var.domain}."
  managed_zone = google_dns_managed_zone.private.name
  type         = "A"
  ttl          = 60
  rrdatas      = ["10.0.0.10"]
}

resource "google_dns_record_set" "db_internal" {
  name         = "db.internal.${var.domain}."
  managed_zone = google_dns_managed_zone.private.name
  type         = "A"
  ttl          = 60
  rrdatas      = ["10.0.0.20"]
}

resource "google_dns_record_set" "cache_internal" {
  name         = "cache.internal.${var.domain}."
  managed_zone = google_dns_managed_zone.private.name
  type         = "A"
  ttl          = 60
  rrdatas      = ["10.0.0.30"]
}
```

## DNS Peering Zone

DNS peering forwards queries for a specific zone to another VPC network's DNS. This is useful in hub-and-spoke architectures:

```hcl
# Hub network (where the actual DNS zone lives)
resource "google_compute_network" "hub" {
  name                    = "hub-vpc"
  auto_create_subnetworks = false
}

# DNS peering zone - forwards queries to the hub network
resource "google_dns_managed_zone" "peering" {
  name        = "peering-zone"
  dns_name    = "shared.${var.domain}."
  description = "DNS peering to hub network"
  visibility  = "private"

  private_visibility_config {
    networks {
      network_url = google_compute_network.main.id
    }
  }

  peering_config {
    target_network {
      network_url = google_compute_network.hub.id
    }
  }
}
```

## Forwarding Zone

A forwarding zone sends DNS queries to specific nameservers. This is common when you have on-premises DNS servers:

```hcl
# Forwarding zone - sends queries to on-premises DNS
resource "google_dns_managed_zone" "forwarding" {
  name        = "onprem-forwarding"
  dns_name    = "corp.${var.domain}."
  description = "Forward DNS queries to on-premises servers"
  visibility  = "private"

  private_visibility_config {
    networks {
      network_url = google_compute_network.main.id
    }
  }

  forwarding_config {
    target_name_servers {
      ipv4_address    = "192.168.1.10"
      forwarding_path = "private"  # Route through VPN/Interconnect
    }
    target_name_servers {
      ipv4_address    = "192.168.1.11"
      forwarding_path = "private"
    }
  }
}
```

The `forwarding_path = "private"` setting routes DNS queries through your VPN or Cloud Interconnect connection instead of through the internet.

## Managing Records with for_each

For managing multiple similar records, use `for_each`:

```hcl
# Define services and their IPs in a variable
variable "internal_services" {
  type = map(string)
  default = {
    "web"       = "10.0.0.100"
    "api"       = "10.0.0.101"
    "worker"    = "10.0.0.102"
    "scheduler" = "10.0.0.103"
    "queue"     = "10.0.0.104"
  }
}

# Create A records for all services
resource "google_dns_record_set" "services" {
  for_each     = var.internal_services
  name         = "${each.key}.internal.${var.domain}."
  managed_zone = google_dns_managed_zone.private.name
  type         = "A"
  ttl          = 60
  rrdatas      = [each.value]
}
```

## Weighted Routing with Multiple A Records

Cloud DNS supports weighted routing for load distribution:

```hcl
# Weighted routing policy
resource "google_dns_record_set" "weighted" {
  name         = "app.${var.domain}."
  managed_zone = google_dns_managed_zone.public.name
  type         = "A"
  ttl          = 300

  routing_policy {
    wrr {
      weight  = 0.7
      rrdatas = ["203.0.113.10"]
    }
    wrr {
      weight  = 0.3
      rrdatas = ["203.0.113.20"]
    }
  }
}
```

## Geolocation-Based Routing

Route users to the nearest server based on their location:

```hcl
# Geolocation routing policy
resource "google_dns_record_set" "geo" {
  name         = "global.${var.domain}."
  managed_zone = google_dns_managed_zone.public.name
  type         = "A"
  ttl          = 300

  routing_policy {
    geo {
      location = "us-central1"
      rrdatas  = ["203.0.113.10"]
    }
    geo {
      location = "europe-west1"
      rrdatas  = ["203.0.113.20"]
    }
    geo {
      location = "asia-east1"
      rrdatas  = ["203.0.113.30"]
    }
  }
}
```

## Outputs

```hcl
output "public_zone_name_servers" {
  description = "Name servers for the public zone - configure these at your registrar"
  value       = google_dns_managed_zone.public.name_servers
}

output "public_zone_name" {
  description = "The name of the public DNS zone"
  value       = google_dns_managed_zone.public.name
}

output "private_zone_name" {
  description = "The name of the private DNS zone"
  value       = google_dns_managed_zone.private.name
}
```

## Important Notes

**Update your domain registrar.** After creating a public zone, you need to update your domain registrar to point to the Cloud DNS name servers shown in the output. Without this step, your Cloud DNS zone will not serve any queries.

**TTL considerations.** Lower TTLs (60-300 seconds) let changes propagate faster but increase DNS query volume. Higher TTLs (3600+) reduce query volume but changes take longer to propagate. Use low TTLs during migrations and higher TTLs for stable records.

**DNSSEC requires registrar configuration.** Enabling DNSSEC in Cloud DNS is only half the setup. You also need to add DS records at your domain registrar. Use `gcloud dns dns-keys describe` to get the DS record values.

**Private zones override public zones.** If you create a private zone for a domain that also has a public zone, VMs in the VPC will use the private zone's records. This is useful for split-horizon DNS but can cause confusion if you are not aware of it.

## Conclusion

Cloud DNS with Terraform gives you a reliable, version-controlled approach to DNS management. Public zones handle your internet-facing domains, private zones enable internal service discovery, and forwarding zones bridge the gap to on-premises DNS infrastructure. The combination of routing policies (weighted, geo) adds sophisticated traffic management capabilities without needing a separate traffic management service.

For networking infrastructure that complements your DNS setup, see our guides on [Cloud NAT](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-cloud-nat-with-terraform/view) and [VPN Tunnels](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-vpn-tunnels-with-terraform/view).
