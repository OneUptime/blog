# How to Use Dynamic Blocks for GCP Firewall Rules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dynamic Blocks, GCP, Firewall Rules, Google Cloud, Infrastructure as Code

Description: Learn how to use Terraform dynamic blocks to manage Google Cloud Platform firewall rules with flexible, data-driven configurations.

---

Google Cloud Platform firewall rules control traffic to and from VM instances in your VPC network. Each rule can have multiple allowed or denied protocol-port combinations, source ranges, target tags, and service accounts. Managing these with Terraform gets verbose quickly, especially when you have dozens of rules across multiple services. Dynamic blocks let you generate these rules from structured data, keeping your firewall configuration clean and manageable.

## How GCP Firewall Rules Differ from AWS

Before diving into the Terraform patterns, it is worth noting how GCP firewall rules differ from AWS security groups:

- GCP firewall rules are defined at the VPC network level, not attached to individual instances
- Rules use target tags or service accounts to determine which instances they apply to
- Each rule is a separate resource (there is no equivalent to AWS inline security group rules)
- Rules have priority numbers - lower numbers take precedence

```hcl
# Basic GCP firewall rule structure
resource "google_compute_firewall" "allow_http" {
  name    = "allow-http"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["web-server"]
}
```

The `allow` and `deny` blocks are where dynamic blocks become useful, since a single rule can permit or deny multiple protocol-port combinations.

## Defining Firewall Rules as Data

Structure your firewall configuration as a variable:

```hcl
# variables.tf
variable "firewall_rules" {
  description = "GCP firewall rules"
  type = map(object({
    description   = optional(string, "")
    direction     = optional(string, "INGRESS")
    priority      = optional(number, 1000)
    source_ranges = optional(list(string), [])
    source_tags   = optional(list(string), [])
    target_tags   = optional(list(string), [])
    target_service_accounts = optional(list(string), [])
    allow = optional(list(object({
      protocol = string
      ports    = optional(list(string), [])
    })), [])
    deny = optional(list(object({
      protocol = string
      ports    = optional(list(string), [])
    })), [])
  }))
}
```

Now define your rules:

```hcl
# firewall_config.auto.tfvars
firewall_rules = {
  allow-http-https = {
    description   = "Allow HTTP and HTTPS from the internet"
    direction     = "INGRESS"
    priority      = 1000
    source_ranges = ["0.0.0.0/0"]
    target_tags   = ["web-server"]
    allow = [
      { protocol = "tcp", ports = ["80"] },
      { protocol = "tcp", ports = ["443"] }
    ]
  }

  allow-ssh-internal = {
    description   = "Allow SSH from internal networks"
    direction     = "INGRESS"
    priority      = 1000
    source_ranges = ["10.0.0.0/8"]
    target_tags   = ["allow-ssh"]
    allow = [
      { protocol = "tcp", ports = ["22"] }
    ]
  }

  allow-iap-ssh = {
    description   = "Allow SSH from IAP tunnel"
    direction     = "INGRESS"
    priority      = 900
    source_ranges = ["35.235.240.0/20"]  # IAP IP range
    target_tags   = ["allow-iap"]
    allow = [
      { protocol = "tcp", ports = ["22", "3389"] }
    ]
  }

  allow-health-checks = {
    description   = "Allow GCP health check probes"
    direction     = "INGRESS"
    priority      = 900
    source_ranges = ["130.211.0.0/22", "35.191.0.0/16"]
    target_tags   = ["allow-health-check"]
    allow = [
      { protocol = "tcp" }  # All TCP ports
    ]
  }

  allow-internal = {
    description   = "Allow all internal communication"
    direction     = "INGRESS"
    priority      = 1000
    source_ranges = ["10.0.0.0/8"]
    allow = [
      { protocol = "tcp", ports = ["0-65535"] },
      { protocol = "udp", ports = ["0-65535"] },
      { protocol = "icmp" }
    ]
  }

  deny-all-ingress = {
    description   = "Deny all other ingress traffic"
    direction     = "INGRESS"
    priority      = 65534
    source_ranges = ["0.0.0.0/0"]
    deny = [
      { protocol = "all" }
    ]
  }

  allow-egress-internet = {
    description   = "Allow outbound internet access"
    direction     = "EGRESS"
    priority      = 1000
    target_tags   = ["allow-internet"]
    allow = [
      { protocol = "tcp", ports = ["80", "443"] },
      { protocol = "udp", ports = ["53"] }
    ]
  }
}
```

## Generating Firewall Rules with Dynamic Blocks

Now create the firewall rules using `for_each` and dynamic blocks:

```hcl
# firewall.tf
resource "google_compute_firewall" "rules" {
  for_each = var.firewall_rules

  name        = "${terraform.workspace}-${each.key}"
  network     = google_compute_network.main.name
  description = each.value.description
  direction   = each.value.direction
  priority    = each.value.priority

  # Source configuration (only for INGRESS rules)
  source_ranges = each.value.direction == "INGRESS" ? each.value.source_ranges : null
  source_tags   = each.value.direction == "INGRESS" ? (
    length(each.value.source_tags) > 0 ? each.value.source_tags : null
  ) : null

  # Target configuration
  target_tags = length(each.value.target_tags) > 0 ? each.value.target_tags : null
  target_service_accounts = length(each.value.target_service_accounts) > 0 ? (
    each.value.target_service_accounts
  ) : null

  # Dynamic allow blocks
  dynamic "allow" {
    for_each = each.value.allow

    content {
      protocol = allow.value.protocol
      ports    = length(allow.value.ports) > 0 ? allow.value.ports : null
    }
  }

  # Dynamic deny blocks
  dynamic "deny" {
    for_each = each.value.deny

    content {
      protocol = deny.value.protocol
      ports    = length(deny.value.ports) > 0 ? deny.value.ports : null
    }
  }
}
```

## Service-Based Firewall Rules

Organize firewall rules by service for better maintainability:

```hcl
variable "services" {
  description = "Service definitions with their firewall requirements"
  type = map(object({
    tags = list(string)
    ingress_ports = list(object({
      protocol = string
      ports    = list(string)
      sources  = list(string)
    }))
    allow_health_checks = bool
  }))
  default = {
    web = {
      tags = ["web-server"]
      ingress_ports = [
        {
          protocol = "tcp"
          ports    = ["80", "443"]
          sources  = ["0.0.0.0/0"]
        }
      ]
      allow_health_checks = true
    }
    api = {
      tags = ["api-server"]
      ingress_ports = [
        {
          protocol = "tcp"
          ports    = ["8080"]
          sources  = ["10.0.0.0/8"]
        },
        {
          protocol = "tcp"
          ports    = ["9090"]  # Metrics
          sources  = ["10.0.1.0/24"]
        }
      ]
      allow_health_checks = true
    }
    database = {
      tags = ["database"]
      ingress_ports = [
        {
          protocol = "tcp"
          ports    = ["5432"]
          sources  = ["10.0.0.0/24"]  # Only from app subnet
        }
      ]
      allow_health_checks = false
    }
  }
}

# Create firewall rules per service
resource "google_compute_firewall" "service_rules" {
  for_each = var.services

  name    = "${terraform.workspace}-${each.key}-ingress"
  network = google_compute_network.main.name

  direction     = "INGRESS"
  target_tags   = each.value.tags

  # Dynamic allow blocks for each port configuration
  dynamic "allow" {
    for_each = each.value.ingress_ports

    content {
      protocol = allow.value.protocol
      ports    = allow.value.ports
    }
  }

  # Combine all source ranges from all port configurations
  source_ranges = distinct(flatten([
    for port_config in each.value.ingress_ports : port_config.sources
  ]))
}

# Health check firewall rules for services that need them
resource "google_compute_firewall" "health_checks" {
  for_each = {
    for name, service in var.services : name => service
    if service.allow_health_checks
  }

  name    = "${terraform.workspace}-${each.key}-health-check"
  network = google_compute_network.main.name

  direction   = "INGRESS"
  priority    = 900
  target_tags = each.value.tags

  # GCP health check source ranges
  source_ranges = [
    "130.211.0.0/22",   # Legacy health check range
    "35.191.0.0/16"     # Current health check range
  ]

  allow {
    protocol = "tcp"
  }
}
```

## Environment-Specific Firewall Rules

Different environments need different firewall configurations:

```hcl
locals {
  # Base rules that every environment gets
  base_firewall_rules = {
    allow-iap = {
      description   = "Allow IAP tunnel access"
      direction     = "INGRESS"
      priority      = 900
      source_ranges = ["35.235.240.0/20"]
      target_tags   = ["allow-iap"]
      allow         = [{ protocol = "tcp", ports = ["22", "3389"] }]
      deny          = []
    }
    allow-health-checks = {
      description   = "Allow GCP health checks"
      direction     = "INGRESS"
      priority      = 900
      source_ranges = ["130.211.0.0/22", "35.191.0.0/16"]
      target_tags   = ["allow-health-check"]
      allow         = [{ protocol = "tcp", ports = [] }]
      deny          = []
    }
  }

  # Dev-only rules
  dev_extra_rules = {
    allow-debug-ports = {
      description   = "Allow debug ports in dev"
      direction     = "INGRESS"
      priority      = 1000
      source_ranges = ["10.0.0.0/8"]
      target_tags   = ["dev-debug"]
      allow = [
        { protocol = "tcp", ports = ["5005", "9229", "8000"] }
      ]
      deny = []
    }
    allow-all-internal-dev = {
      description   = "Allow all internal traffic in dev"
      direction     = "INGRESS"
      priority      = 1000
      source_ranges = ["10.0.0.0/8"]
      target_tags   = []
      allow = [
        { protocol = "tcp", ports = [] },
        { protocol = "udp", ports = [] },
        { protocol = "icmp", ports = [] }
      ]
      deny = []
    }
  }

  # Merge rules based on environment
  env_extra_rules = terraform.workspace == "dev" ? local.dev_extra_rules : {}

  all_firewall_rules = merge(local.base_firewall_rules, var.firewall_rules, local.env_extra_rules)
}
```

## Logging Configuration

GCP firewall rules support logging. Add it conditionally:

```hcl
resource "google_compute_firewall" "rules_with_logging" {
  for_each = var.firewall_rules

  name      = "${terraform.workspace}-${each.key}"
  network   = google_compute_network.main.name
  direction = each.value.direction
  priority  = each.value.priority

  source_ranges = each.value.direction == "INGRESS" ? each.value.source_ranges : null
  target_tags   = length(each.value.target_tags) > 0 ? each.value.target_tags : null

  dynamic "allow" {
    for_each = each.value.allow
    content {
      protocol = allow.value.protocol
      ports    = length(allow.value.ports) > 0 ? allow.value.ports : null
    }
  }

  dynamic "deny" {
    for_each = each.value.deny
    content {
      protocol = deny.value.protocol
      ports    = length(deny.value.ports) > 0 ? deny.value.ports : null
    }
  }

  # Enable logging for production, disabled for other environments
  dynamic "log_config" {
    for_each = terraform.workspace == "prod" ? [1] : []

    content {
      metadata = "INCLUDE_ALL_METADATA"
    }
  }
}
```

## Outputting the Firewall Configuration

For documentation and auditing:

```hcl
output "firewall_rules" {
  description = "Firewall rules created in this environment"
  value = {
    for name, rule in google_compute_firewall.rules : name => {
      name      = rule.name
      direction = rule.direction
      priority  = rule.priority
      allow     = rule.allow
      deny      = rule.deny
    }
  }
}
```

## Summary

Dynamic blocks make GCP firewall management in Terraform significantly cleaner. By defining firewall rules as structured variables, you can manage rules per service, per environment, and per team while keeping the actual Terraform code compact. The pattern of using `for_each` at the resource level for multiple rules and dynamic blocks for the `allow` and `deny` entries within each rule gives you full flexibility. For more on dynamic blocks across different cloud providers, check out our post on [dynamic blocks for security group rules](https://oneuptime.com/blog/post/2026-02-23-how-to-use-dynamic-blocks-for-security-group-rules/view).
