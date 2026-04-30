# How to Configure GCP IPv6 Firewall Rules with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, IPv6, Firewall, Security, Networking

Description: A guide to creating GCP VPC firewall rules that control IPv6 traffic using Terraform, covering common patterns for web, SSH, and internal services.

GCP VPC firewall rules support IPv4 or IPv6 address ranges in `source_ranges` and `destination_ranges`. Each rule can contain only one IP family, so rules with IPv6 source ranges only match IPv6 traffic, allowing you to write precise firewall policies for dual-stack environments.

## Step 1: Allow ICMPv6 (Essential)

ICMPv6 is required for IPv6 Neighbor Discovery Protocol (NDP) and should always be allowed:

```hcl
# fw-icmpv6.tf - Allow all ICMPv6 traffic (essential for IPv6 operation)

resource "google_compute_firewall" "allow_icmpv6" {
  name    = "allow-icmpv6-ingress"
  network = google_compute_network.main.name

  # ICMPv6 protocol (protocol number 58)
  allow {
    protocol = "58"
  }

  # Allow from all IPv6 sources
  source_ranges = ["::/0"]

  # Target all instances (or restrict with target_tags)
  priority = 1000
}
```

## Step 2: Allow HTTP/HTTPS from IPv6 Internet

```hcl
# fw-web-ipv6.tf - Allow inbound web traffic from IPv6 internet
resource "google_compute_firewall" "allow_web_ipv6" {
  name    = "allow-web-ipv6-ingress"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  # Allow from all IPv6 addresses
  source_ranges = ["::/0"]

  # Only apply to instances with this tag
  target_tags = ["web-server"]

  priority = 1000
}
```

## Step 3: Allow SSH from a Specific IPv6 Management Range

```hcl
# fw-ssh-ipv6.tf - Allow SSH only from a management IPv6 prefix
resource "google_compute_firewall" "allow_ssh_ipv6" {
  name    = "allow-ssh-ipv6-mgmt"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  # Restrict SSH to a specific management IPv6 subnet
  source_ranges = ["2001:db8:1234::/48"]

  target_tags = ["allow-ssh"]
  priority    = 900
}
```

## Step 4: Allow Internal IPv6 Traffic Within the VPC

```hcl
# fw-internal-ipv6.tf - Allow common internal IPv6 traffic between instances in the same subnet
resource "google_compute_firewall" "allow_internal_ipv6" {
  name    = "allow-internal-ipv6"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
  }
  allow {
    protocol = "udp"
  }
  allow {
    protocol = "58"
  }

  # Allow from the subnet's internal IPv6 CIDR
  source_ranges = [google_compute_subnetwork.main.ipv6_cidr_range]

  priority = 1000
}
```

## Step 5: Optionally Deny All Other IPv6 Ingress

GCP already has an implied deny-all ingress rule for traffic that does not match a higher-priority allow rule. If you want an explicit lower-priority deny rule for IPv6 ingress, you can add:

```hcl
# fw-deny-ipv6.tf - Deny all other IPv6 ingress (lower priority)
resource "google_compute_firewall" "deny_all_ipv6" {
  name    = "deny-all-ipv6-ingress"
  network = google_compute_network.main.name

  deny {
    protocol = "all"
  }

  source_ranges = ["::/0"]

  # Higher number = lower priority; this runs after all allow rules above
  priority = 65534
}
```

## Step 6: Apply and Verify

```bash
terraform apply

# List firewall rules in the VPC and inspect their IPv6 ranges
gcloud compute firewall-rules list \
  --filter="network~'networks/vpc-dual-stack$'" \
  --format="table(name,direction,sourceRanges.list():label=SRC_RANGES,allowed[].map().firewall_rule().list():label=ALLOW,denied[].map().firewall_rule().list():label=DENY)"

# Test connectivity from an IPv6 host
curl -6 --connect-timeout 5 http://[<instance-external-ipv6>]/
```

## Use Separate Rules for IPv4 and IPv6

Because each GCP firewall rule can contain either IPv4 or IPv6 ranges, but not both, use the IPv6 rule above alongside a separate IPv4 rule for dual-stack coverage:

```hcl
# Separate IPv4 rule to pair with the IPv6 rule above
resource "google_compute_firewall" "allow_web_ipv4" {
  name    = "allow-web-ipv4-ingress"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["web-server"]
}
```

GCP's flexible firewall rule model makes it straightforward to enforce IPv6-aware security policies, whether you need to restrict access to specific prefixes or open services to all IPv6 internet traffic.
