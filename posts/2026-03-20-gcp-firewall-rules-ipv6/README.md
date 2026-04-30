# How to Configure IPv6 Firewall Rules on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IPv6, Firewall, VPC, Google Cloud, Security

Description: Create and manage Google Cloud VPC firewall rules for IPv6 traffic, configure ICMPv6 rules, and set up secure dual-stack firewall policies for GCP resources.

## Introduction

Google Cloud VPC firewall rules apply to both IPv4 and IPv6 traffic, but you need separate rules for IPv4 and IPv6 CIDR ranges because each rule can contain only one address family. IPv6 firewall rules use `::/0` as the source or destination range for all IPv6 traffic. Allow the ICMPv6 traffic required for basic IPv6 operations.

## Basic IPv6 Firewall Rules with gcloud

```bash
PROJECT="my-project"
VPC_NAME="vpc-main"

# Allow all inbound IPv6 traffic (use with caution)

gcloud compute firewall-rules create allow-all-ipv6 \
    --network="$VPC_NAME" \
    --action=ALLOW \
    --direction=INGRESS \
    --priority=1000 \
    --source-ranges="::/0" \
    --rules=all \
    --project="$PROJECT"

# Allow HTTP and HTTPS over IPv6 to web servers
gcloud compute firewall-rules create allow-web-ipv6 \
    --network="$VPC_NAME" \
    --action=ALLOW \
    --direction=INGRESS \
    --priority=1000 \
    --source-ranges="::/0" \
    --rules=tcp:80,tcp:443 \
    --target-tags=web-server \
    --project="$PROJECT"

# Allow SSH over IPv6 from specific prefix
gcloud compute firewall-rules create allow-ssh-ipv6 \
    --network="$VPC_NAME" \
    --action=ALLOW \
    --direction=INGRESS \
    --priority=1000 \
    --source-ranges="2001:db8:1234::/48" \
    --rules=tcp:22 \
    --target-tags=ssh-allowed \
    --project="$PROJECT"
```

## ICMPv6 Rules (Required for IPv6 Operations)

```bash
# Allow ICMPv6 traffic required for IPv6 operation
gcloud compute firewall-rules create allow-icmpv6-essential \
    --network="$VPC_NAME" \
    --action=ALLOW \
    --direction=INGRESS \
    --priority=900 \
    --source-ranges="::/0" \
    --rules=58 \
    --project="$PROJECT"

# Use IP protocol number 58 for ICMPv6
# VPC firewall rules can't filter ICMPv6 by type or code, so this rule allows all ICMPv6 traffic

# Verify the rule
gcloud compute firewall-rules describe allow-icmpv6-essential \
    --project="$PROJECT"
```

## Terraform Firewall Rules for IPv6

```hcl
# firewall_ipv6.tf

# Allow web traffic over IPv6
resource "google_compute_firewall" "allow_web_ipv6" {
  name    = "allow-web-ipv6"
  network = google_compute_network.main.name
  project = var.project_id

  direction = "INGRESS"
  priority  = 1000

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["::/0"]
  target_tags   = ["web-server"]
}

# Allow ICMPv6 for basic IPv6 operations
resource "google_compute_firewall" "allow_icmpv6" {
  name    = "allow-icmpv6"
  network = google_compute_network.main.name
  project = var.project_id

  direction = "INGRESS"
  priority  = 900

  allow {
    protocol = "58"
  }

  source_ranges = ["::/0"]
}

# Allow internal IPv6 traffic within VPC
resource "google_compute_firewall" "allow_internal_ipv6" {
  name    = "allow-internal-ipv6"
  network = google_compute_network.main.name
  project = var.project_id

  direction = "INGRESS"
  priority  = 1000

  allow {
    protocol = "all"
  }

  # Use the VPC network's assigned internal /48 ULA range
  source_ranges = [google_compute_network.main.internal_ipv6_range]
}

# Deny all other IPv6 inbound (explicit deny)
resource "google_compute_firewall" "deny_all_ipv6" {
  name    = "deny-all-ipv6-ingress"
  network = google_compute_network.main.name
  project = var.project_id

  direction = "INGRESS"
  priority  = 65534

  deny {
    protocol = "all"
  }

  source_ranges = ["::/0"]
}
```

## Egress IPv6 Firewall Rules

```bash
# Create an explicit outbound IPv6 allow rule for tagged instances
gcloud compute firewall-rules create allow-egress-ipv6 \
    --network="$VPC_NAME" \
    --action=ALLOW \
    --direction=EGRESS \
    --priority=1000 \
    --destination-ranges="::/0" \
    --rules=all \
    --target-tags=outbound-allowed \
    --project="$PROJECT"

# Deny outbound to specific IPv6 prefix (blocklist)
gcloud compute firewall-rules create deny-egress-blocked-ipv6 \
    --network="$VPC_NAME" \
    --action=DENY \
    --direction=EGRESS \
    --priority=500 \
    --destination-ranges="2001:db8:ffff::/48" \
    --rules=all \
    --project="$PROJECT"
```

## List and Audit IPv6 Firewall Rules

```bash
# List firewall rules with IPv6 source or destination ranges
gcloud compute firewall-rules list \
    --project="$PROJECT" \
    --filter='sourceRanges~: OR destinationRanges~:' \
    --format="table(name, direction, priority, sourceRanges, destinationRanges, allowed, denied, targetTags)"

# Filter only rules with IPv6 source ranges
gcloud compute firewall-rules list \
    --project="$PROJECT" \
    --filter='sourceRanges~:' \
    --format="table(name, direction, priority, sourceRanges)"

# Describe a specific rule
gcloud compute firewall-rules describe allow-web-ipv6 \
    --project="$PROJECT"
```

## Conclusion

GCP VPC firewall rules for IPv6 use `::/0` for all IPv6 traffic ranges and IP protocol number `58` for ICMPv6. Allow the ICMPv6 traffic needed for basic IPv6 operations because blocking it can break IPv6 connectivity. Use target-tags to scope rules to specific VM groups. IPv6-enabled VPCs also include an implied allow egress rule unless a higher-priority rule overrides it. Terraform's `google_compute_firewall` resource uses `source_ranges = ["::/0"]` for IPv6 ingress rules and `destination_ranges` for egress. Audit IPv6 firewall rules regularly with `gcloud compute firewall-rules list --filter='sourceRanges~: OR destinationRanges~:'`.
