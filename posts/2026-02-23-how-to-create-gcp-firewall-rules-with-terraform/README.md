# How to Create GCP Firewall Rules with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Firewall Rules, Networking, Security, Infrastructure as Code, Google Cloud

Description: Learn how to create and manage GCP firewall rules with Terraform for controlling network traffic to and from your virtual machines and other resources.

---

GCP firewall rules control network traffic at the VPC level. Every packet flowing to or from a VM instance is evaluated against the firewall rules, and the matching rule with the highest priority determines whether the traffic is allowed or denied. Unlike security groups in AWS that are stateful and attached to instances, GCP firewall rules are stateful but attached to the VPC network and target instances using tags or service accounts.

This guide covers creating GCP firewall rules with Terraform, from basic allow/deny rules to advanced patterns using network tags, service accounts, and hierarchical firewall policies.

## How GCP Firewall Rules Work

Key concepts:

- **Direction**: Ingress (incoming) or egress (outgoing). Each rule applies to one direction.
- **Priority**: 0 to 65535, where lower numbers are higher priority. Default is 1000.
- **Action**: Allow or deny.
- **Target**: Which instances the rule applies to - all instances, instances with specific tags, or instances with specific service accounts.
- **Source/Destination**: Where the traffic is coming from (for ingress) or going to (for egress).
- **Protocol and ports**: Which protocols (TCP, UDP, ICMP) and port ranges the rule matches.

GCP has two implied rules that you cannot delete:
- An implied allow rule for egress traffic to 0.0.0.0/0 at priority 65535
- An implied deny rule for ingress traffic from 0.0.0.0/0 at priority 65535

## Basic Firewall Rules

Let's start with common rules:

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

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

# Allow SSH from specific IPs
resource "google_compute_firewall" "allow_ssh" {
  name    = "fw-allow-ssh"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  # Only allow SSH from your corporate network
  source_ranges = ["203.0.113.0/24"]

  # Apply to instances with the "ssh" tag
  target_tags = ["ssh"]

  # Priority - lower number means higher priority
  priority = 1000

  description = "Allow SSH access from corporate network"
}

# Allow HTTP and HTTPS from anywhere
resource "google_compute_firewall" "allow_http" {
  name    = "fw-allow-http-https"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  # Allow from anywhere
  source_ranges = ["0.0.0.0/0"]

  # Apply to instances with the "web" tag
  target_tags = ["web"]

  priority    = 1000
  description = "Allow HTTP and HTTPS from the internet"
}

# Allow internal communication between all instances in the VPC
resource "google_compute_firewall" "allow_internal" {
  name    = "fw-allow-internal"
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

  # Source is the VPC's subnet ranges
  source_ranges = ["10.0.0.0/8"]

  priority    = 1000
  description = "Allow all internal traffic within the VPC"
}
```

## Using Network Tags

Network tags are the primary mechanism for targeting firewall rules to specific instances:

```hcl
# Firewall rule targeting instances with the "db" tag
resource "google_compute_firewall" "allow_db" {
  name    = "fw-allow-database"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["5432"]  # PostgreSQL
  }

  # Only allow traffic from instances with the "app" tag
  source_tags = ["app"]

  # Apply to instances with the "db" tag
  target_tags = ["db"]

  priority    = 900
  description = "Allow PostgreSQL access from app servers to database servers"
}

# Compute instance with tags
resource "google_compute_instance" "db" {
  name         = "vm-db-01"
  machine_type = "e2-standard-4"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    network    = google_compute_network.main.name
    subnetwork = google_compute_subnetwork.db.name
  }

  # Tags that firewall rules reference
  tags = ["db", "ssh"]
}
```

## Using Service Account-Based Rules

Service account-based targeting is more secure than tags because tags can be changed by anyone with instance edit permissions, while service account assignment requires IAM permissions:

```hcl
# Service account for web servers
resource "google_service_account" "web" {
  account_id   = "sa-web-server"
  display_name = "Web Server Service Account"
}

# Service account for database servers
resource "google_service_account" "db" {
  account_id   = "sa-db-server"
  display_name = "Database Server Service Account"
}

# Allow web servers to connect to database servers
resource "google_compute_firewall" "web_to_db" {
  name    = "fw-allow-web-to-db"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["5432"]
  }

  # Source: instances running as the web service account
  source_service_accounts = [google_service_account.web.email]

  # Target: instances running as the db service account
  target_service_accounts = [google_service_account.db.email]

  priority    = 900
  description = "Allow web servers to access database on port 5432"
}
```

## Deny Rules

Explicitly deny traffic that you want to block, even if there is no allow rule (useful for defense in depth):

```hcl
# Deny all egress to the internet except through the NAT gateway
resource "google_compute_firewall" "deny_egress_internet" {
  name      = "fw-deny-egress-internet"
  network   = google_compute_network.main.name
  direction = "EGRESS"

  deny {
    protocol = "all"
  }

  # Block traffic to all public IPs
  destination_ranges = ["0.0.0.0/0"]

  # Do not apply to instances that need direct internet access
  target_tags = ["no-internet"]

  # Lower priority than specific allow rules
  priority    = 65000
  description = "Deny direct internet access for tagged instances"
}

# Allow egress to Google APIs (for instances using Private Google Access)
resource "google_compute_firewall" "allow_google_apis" {
  name      = "fw-allow-google-apis"
  network   = google_compute_network.main.name
  direction = "EGRESS"

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }

  # Google API ranges
  destination_ranges = ["199.36.153.8/30"]

  priority    = 900
  description = "Allow HTTPS egress to Google APIs"
}
```

## GKE-Specific Firewall Rules

GKE creates some firewall rules automatically, but you may need additional rules for specific use cases:

```hcl
# Allow GKE master to reach nodes (for webhooks, metrics, etc.)
resource "google_compute_firewall" "gke_master_to_nodes" {
  name    = "fw-gke-master-to-nodes"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["443", "8443", "10250"]
  }

  # GKE master CIDR range
  source_ranges = ["172.16.0.0/28"]

  # Target GKE nodes
  target_tags = ["gke-node"]

  priority    = 900
  description = "Allow GKE master to communicate with nodes"
}

# Allow health check probes from Google's health check ranges
resource "google_compute_firewall" "allow_health_checks" {
  name    = "fw-allow-health-checks"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
  }

  # Google health check IP ranges
  source_ranges = [
    "35.191.0.0/16",
    "130.211.0.0/22",
  ]

  target_tags = ["web", "gke-node"]

  priority    = 900
  description = "Allow Google health check probes"
}
```

## Creating Rules Dynamically

For complex environments, define rules in a variable and create them with `for_each`:

```hcl
variable "firewall_rules" {
  description = "Map of firewall rules"
  type = map(object({
    direction          = string
    priority           = number
    description        = string
    source_ranges      = optional(list(string))
    destination_ranges = optional(list(string))
    source_tags        = optional(list(string))
    target_tags        = optional(list(string))
    allow = optional(list(object({
      protocol = string
      ports    = optional(list(string))
    })))
    deny = optional(list(object({
      protocol = string
      ports    = optional(list(string))
    })))
  }))
  default = {
    "allow-ssh" = {
      direction     = "INGRESS"
      priority      = 1000
      description   = "Allow SSH from corporate network"
      source_ranges = ["203.0.113.0/24"]
      target_tags   = ["ssh"]
      allow         = [{ protocol = "tcp", ports = ["22"] }]
    }
    "allow-http" = {
      direction     = "INGRESS"
      priority      = 1000
      description   = "Allow HTTP/HTTPS from internet"
      source_ranges = ["0.0.0.0/0"]
      target_tags   = ["web"]
      allow = [
        { protocol = "tcp", ports = ["80", "443"] }
      ]
    }
    "allow-internal" = {
      direction     = "INGRESS"
      priority      = 1000
      description   = "Allow all internal traffic"
      source_ranges = ["10.0.0.0/8"]
      allow = [
        { protocol = "tcp", ports = ["0-65535"] },
        { protocol = "udp", ports = ["0-65535"] },
        { protocol = "icmp", ports = null }
      ]
    }
  }
}

resource "google_compute_firewall" "rules" {
  for_each = var.firewall_rules

  name      = "fw-${each.key}"
  network   = google_compute_network.main.name
  direction = each.value.direction
  priority  = each.value.priority

  source_ranges      = each.value.source_ranges
  destination_ranges = each.value.destination_ranges
  source_tags        = each.value.source_tags
  target_tags        = each.value.target_tags

  description = each.value.description

  dynamic "allow" {
    for_each = each.value.allow != null ? each.value.allow : []
    content {
      protocol = allow.value.protocol
      ports    = allow.value.ports
    }
  }

  dynamic "deny" {
    for_each = each.value.deny != null ? each.value.deny : []
    content {
      protocol = deny.value.protocol
      ports    = deny.value.ports
    }
  }
}
```

## Firewall Logging

Enable logging on specific rules for auditing and troubleshooting:

```hcl
resource "google_compute_firewall" "allow_ssh_logged" {
  name    = "fw-allow-ssh-logged"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["203.0.113.0/24"]
  target_tags   = ["ssh"]

  # Enable firewall rule logging
  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }

  description = "Allow SSH with logging enabled"
}
```

Logged events appear in Cloud Logging and can be exported to BigQuery for analysis.

## Best Practices

**Use service accounts over tags for security-sensitive rules.** Tags can be modified by anyone with instance edit permissions. Service account assignment requires IAM permissions, making it harder to bypass firewall rules.

**Follow least privilege.** Do not allow 0.0.0.0/0 unless the service genuinely needs to be internet-facing. Restrict source ranges to the minimum necessary.

**Use meaningful rule names.** Rules are listed in the console by name. Names like "fw-allow-web-to-db-postgres" are much more useful than "rule-1".

**Set priorities intentionally.** Do not leave everything at the default 1000. Use different priorities to create a clear hierarchy: deny rules at higher priority than allow rules for defense in depth.

**Enable logging on sensitive rules.** Log SSH access, database access, and any deny rules to detect unauthorized access attempts.

**Document each rule.** Use the `description` field on every rule. Six months from now, you will not remember why a rule exists without documentation.

## Wrapping Up

GCP firewall rules with Terraform give you a version-controlled, auditable security layer for your network. Use network tags for simple environments and service accounts for production security. Define rules as data structures when you have many rules to manage, and enable logging on rules that protect sensitive resources. The key is treating firewall rules as code - reviewed in pull requests, tested in non-production environments, and applied consistently across your infrastructure.
