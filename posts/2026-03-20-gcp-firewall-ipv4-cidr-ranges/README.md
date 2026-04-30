# How to Allow Specific IPv4 CIDR Ranges in GCP Firewall Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firewall, IPv4, VPC, Security, Cloud Networking

Description: Create GCP VPC firewall rules to allow traffic from specific IPv4 CIDR ranges to control inbound and outbound access to Compute Engine instances.

## Introduction

GCP VPC firewall rules control traffic to and from VM instances based on IP ranges, protocols, and ports. Like AWS security groups, GCP VPC firewall rules are stateful, and each rule applies to either ingress or egress traffic. Every VPC network also has implied firewall rules: ingress is denied by default, while egress is allowed by default unless a higher-priority rule overrides it.

## Firewall Rule Components

- **Direction**: INGRESS (inbound) or EGRESS (outbound)
- **Priority**: 0–65535 (lower = higher priority); default is 1000
- **Action**: ALLOW or DENY
- **Source/Destination and Targets**: CIDR ranges, service accounts, or network tags, depending on rule direction
- **Protocol/Ports**: tcp, udp, icmp, all

## Allowing a Specific CIDR Range (Ingress)

```bash
# Allow HTTPS from a specific office CIDR range

gcloud compute firewall-rules create allow-office-https \
  --network my-vpc \
  --direction INGRESS \
  --action ALLOW \
  --rules tcp:443 \
  --source-ranges 203.0.113.0/24 \
  --target-tags web-server \
  --priority 1000 \
  --description "Allow HTTPS from NYC office"
```

## Allowing Multiple CIDR Ranges

```bash
# Allow SSH from multiple trusted IP ranges
gcloud compute firewall-rules create allow-admin-ssh \
  --network my-vpc \
  --direction INGRESS \
  --action ALLOW \
  --rules tcp:22 \
  --source-ranges 203.0.113.0/24,198.51.100.0/25,10.0.0.0/8 \
  --target-tags bastion \
  --priority 900
```

## Denying a Specific CIDR Range

```bash
# Deny all traffic from a known malicious range (high priority)
gcloud compute firewall-rules create deny-malicious-range \
  --network my-vpc \
  --direction INGRESS \
  --action DENY \
  --rules all \
  --source-ranges 192.0.2.0/24 \
  --priority 500                      # Higher priority than allow rules
```

## Egress Rules

By default, all egress is allowed. Create a deny-all egress rule and then selectively allow:

```bash
# Deny all outbound traffic
gcloud compute firewall-rules create deny-all-egress \
  --network my-vpc \
  --direction EGRESS \
  --action DENY \
  --rules all \
  --destination-ranges 0.0.0.0/0 \
  --priority 65534

# Allow outbound to specific ranges only
gcloud compute firewall-rules create allow-egress-internal \
  --network my-vpc \
  --direction EGRESS \
  --action ALLOW \
  --rules all \
  --destination-ranges 10.0.0.0/8 \
  --priority 1000
```

## Listing and Filtering Rules

```bash
# List all firewall rules in a network
gcloud compute firewall-rules list \
  --filter="network=my-vpc" \
  --format="table(name,direction,priority,sourceRanges,allowed)"

# Describe a specific rule
gcloud compute firewall-rules describe allow-office-https
```

## Terraform Configuration

```hcl
resource "google_compute_firewall" "allow_office_https" {
  name    = "allow-office-https"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }

  source_ranges = ["203.0.113.0/24", "198.51.100.0/25"]
  target_tags   = ["web-server"]
  direction     = "INGRESS"
  priority      = 1000
}
```

## Using Service Account-Based Rules

For fine-grained control, use service accounts as source/target instead of tags:

```bash
# Allow traffic from instances running a specific service account
gcloud compute firewall-rules create allow-from-sa \
  --network my-vpc \
  --direction INGRESS \
  --action ALLOW \
  --rules tcp:8080 \
  --source-service-accounts app-sa@project.iam.gserviceaccount.com
```

## Conclusion

GCP firewall rules provide flexible, policy-driven network access control. Combine CIDR-based rules with network tags and service accounts to implement least-privilege access patterns across your VPC.
