# How to Manage GCP Firewall Rules with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Google Cloud, Firewall, VPC, Terraform, Infrastructure as Code, Security

Description: Learn how to create and manage Google Cloud Platform firewall rules with OpenTofu to control ingress and egress traffic for your GCP VPC networks.

---

GCP firewall rules control network traffic to and from Compute Engine instances. Unlike AWS Security Groups, GCP firewall rules are applied at the VPC network level and use target tags or service accounts to identify affected instances. This guide covers managing GCP firewall rules with OpenTofu.

---

## Provider Setup

```hcl
# providers.tf

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = "us-central1"
}

variable "project_id" {}

variable "vpc_subnet_cidrs" {
  type = list(string)
}

resource "google_compute_network" "main" {
  name                    = "main-vpc"
  auto_create_subnetworks = false
}
```

---

## Allow HTTP/HTTPS Traffic

```hcl
# firewall.tf
resource "google_compute_firewall" "allow_http_https" {
  name    = "allow-http-https"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["web-server"]

  description = "Allow HTTP and HTTPS traffic to web servers"

  priority = 1000
}
```

---

## Allow Internal Traffic

```hcl
resource "google_compute_firewall" "allow_internal" {
  name    = "allow-internal"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = var.vpc_subnet_cidrs
  description   = "Allow all internal traffic from the VPC subnet CIDR ranges"
}
```

---

## Allow SSH from Specific IPs

```hcl
resource "google_compute_firewall" "allow_ssh" {
  name    = "allow-ssh-internal"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["10.0.0.0/8", "192.168.0.0/16"]
  target_tags   = ["ssh-allowed"]

  description = "Allow SSH from internal networks only"
}
```

---

## Deny Egress (Default Deny + Allow Specific)

```hcl
# Default deny all egress
resource "google_compute_firewall" "deny_all_egress" {
  name    = "deny-all-egress"
  network = google_compute_network.main.name
  direction = "EGRESS"

  deny {
    protocol = "all"
  }

  destination_ranges = ["0.0.0.0/0"]
  priority           = 65534
}

# Allow specific egress
resource "google_compute_firewall" "allow_egress_https" {
  name      = "allow-egress-https"
  network   = google_compute_network.main.name
  direction = "EGRESS"

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }

  destination_ranges = ["0.0.0.0/0"]
  target_tags        = ["web-server"]
  priority           = 1000
}
```

---

## Service Account-Based Firewall Rules

```hcl
resource "google_service_account" "app" {
  account_id   = "app-service-account"
  display_name = "App Service Account"
}

resource "google_service_account" "db" {
  account_id   = "db-service-account"
  display_name = "DB Service Account"
}

resource "google_compute_firewall" "allow_app" {
  name    = "allow-app-to-db"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["5432"]
  }

  # Source: instances using the app service account
  source_service_accounts = [google_service_account.app.email]
  # Target: instances using the db service account
  target_service_accounts = [google_service_account.db.email]
}
```

---

## Multiple Rules with for_each

```hcl
variable "firewall_rules" {
  default = {
    "allow-http"  = { protocol = "tcp", ports = ["80"],  sources = ["0.0.0.0/0"], tags = ["web"] }
    "allow-https" = { protocol = "tcp", ports = ["443"], sources = ["0.0.0.0/0"], tags = ["web"] }
    "allow-db"    = { protocol = "tcp", ports = ["5432"],sources = ["10.0.0.0/8"], tags = ["db"]  }
  }
}

resource "google_compute_firewall" "rules" {
  for_each = var.firewall_rules

  name    = each.key
  network = google_compute_network.main.name

  allow {
    protocol = each.value.protocol
    ports    = each.value.ports
  }

  source_ranges = each.value.sources
  target_tags   = each.value.tags
}
```

---

## Verification

```bash
tofu init
tofu plan
tofu apply

# List all firewall rules in project
gcloud compute firewall-rules list --format="table(name,direction,priority,network,allowed[].map().firewall_rule().list():label=ALLOW,denied[].map().firewall_rule().list():label=DENY)"

# Describe a specific rule
gcloud compute firewall-rules describe allow-http-https

# Test connectivity
gcloud compute ssh web-server-instance --command "curl -I https://api.internal"
```

---

## Best Practices

1. **Use target tags** to apply rules to specific instances, not all instances
2. **Prefer service accounts** over tags for production - they are more secure and auditable
3. **Use priority** to control rule evaluation order (lower = higher priority)
4. **Log firewall actions** with logging metadata for security auditing
5. **Regularly audit** unused rules with Recommender API recommendations

---

## Conclusion

GCP firewall rules managed with OpenTofu provide reproducible, version-controlled network security. Use target tags or service accounts to scope rules, set priorities carefully, and use `for_each` to manage multiple similar rules efficiently.

---

*Monitor your GCP infrastructure security and availability with [OneUptime](https://oneuptime.com).*
