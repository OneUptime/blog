# How to Configure GCP Cloud Armor with IPv6 Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IPv6, Cloud Armor, WAF, Security, Google Cloud, DDoS

Description: Configure Google Cloud Armor security policies with IPv6 rules to allow, deny, or rate-limit IPv6 traffic, create IP allowlists and blocklists for IPv6 addresses, and protect load-balanced...

## Introduction

Google Cloud Armor security policies work with supported Google Cloud load balancers, including global external Application Load Balancers, and support IPv6 addresses in match conditions. You can create rules that match specific IPv6 CIDR prefixes to allow or deny traffic. Cloud Armor evaluates rules for both IPv4 and IPv6 clients based on the client's IP address received at the load balancer. IPv6 address matching uses standard CIDR notation in rule conditions.

## Create Cloud Armor Policy with IPv6 Rules

```bash
PROJECT="my-project"

# Create Cloud Armor security policy

gcloud compute security-policies create web-security-policy \
    --project="$PROJECT" \
    --description="WAF policy with IPv6 rules"

# Allow specific IPv6 prefix (allowlist)
gcloud compute security-policies rules create 100 \
    --project="$PROJECT" \
    --security-policy=web-security-policy \
    --description="Allow trusted IPv6 range" \
    --src-ip-ranges="2001:db8:1234::/48" \
    --action=allow

# Block specific IPv6 prefix (blocklist)
gcloud compute security-policies rules create 200 \
    --project="$PROJECT" \
    --security-policy=web-security-policy \
    --description="Block known bad IPv6 range" \
    --src-ip-ranges="2001:db8:dead::/48" \
    --action=deny-403

# Rate limit all IPv6 traffic per source IP
gcloud compute security-policies rules create 300 \
    --project="$PROJECT" \
    --security-policy=web-security-policy \
    --description="Rate limit IPv6 clients" \
    --expression="inIpRange(origin.ip, '::/0')" \
    --action=throttle \
    --rate-limit-threshold-count=100 \
    --rate-limit-threshold-interval-sec=60 \
    --conform-action=allow \
    --exceed-action=deny-429 \
    --enforce-on-key=IP

# Default deny rule
gcloud compute security-policies rules update 2147483647 \
    --project="$PROJECT" \
    --security-policy=web-security-policy \
    --description="Default deny" \
    --src-ip-ranges="::/0,0.0.0.0/0" \
    --action=deny-403
```

## Terraform Cloud Armor with IPv6 Rules

```hcl
# cloud_armor_ipv6.tf

variable "project_id" {}

resource "google_compute_security_policy" "web" {
  name    = "web-security-policy"
  project = var.project_id

  description = "WAF policy with IPv6 rules"

  # Allow trusted IPv6 range
  rule {
    action   = "allow"
    priority = 100

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["2001:db8:1234::/48", "198.51.100.0/24"]
      }
    }

    description = "Allow trusted IPv4 and IPv6 ranges"
  }

  # Block known bad IPv6 range
  rule {
    action   = "deny(403)"
    priority = 200

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["2001:db8:dead::/48"]
      }
    }

    description = "Block malicious IPv6 range"
  }

  # Rate limit all IPv6 traffic
  rule {
    action   = "throttle"
    priority = 300

    match {
      expr {
        expression = "inIpRange(origin.ip, '::/0')"
      }
    }

    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"

      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }

      enforce_on_key = "IP"
    }

    description = "Rate limit IPv6 clients"
  }

  # Default allow (or deny if you prefer whitelist mode)
  rule {
    action   = "allow"
    priority = 2147483647

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }

    description = "Default rule"
  }
}

# Attach policy to backend service
resource "google_compute_backend_service" "web" {
  name            = "web-backend"
  project         = var.project_id
  security_policy = google_compute_security_policy.web.self_link
  # ... other backend config
}
```

## Advanced IPv6 Rule: CEL Expressions

```bash
# Use CEL (Common Expression Language) for complex IPv6 matching

# Block access from IPv6 addresses requesting specific paths
gcloud compute security-policies rules create 150 \
    --project="$PROJECT" \
    --security-policy=web-security-policy \
    --description="Block IPv6 admin access from public internet" \
    --expression="inIpRange(origin.ip, '::/0') && request.path.matches('/admin.*')" \
    --action=deny-403

# Allow only US IPv6 traffic by denying other IPv6 regions
gcloud compute security-policies rules create 120 \
    --project="$PROJECT" \
    --security-policy=web-security-policy \
    --description="Deny non-US IPv6 traffic" \
    --expression="origin.region_code != 'US' && inIpRange(origin.ip, '::/0')" \
    --action=deny-403

# View all rules in the policy
gcloud compute security-policies describe web-security-policy \
    --project="$PROJECT" \
    --format="json(rules)"
```

## Monitor Cloud Armor IPv6 Traffic

```bash
# Make sure backend service logging is enabled before reading Cloud Armor request logs

# View denied Cloud Armor logs for IPv6 clients
gcloud logging read \
    'resource.type="http_load_balancer" AND
     jsonPayload.enforcedSecurityPolicy.outcome="DENY" AND
     jsonPayload.securityPolicyRequestData.remoteIpInfo.ipAddress : ":"' \
    --project="$PROJECT" \
    --limit=100

# Check Cloud Armor request metrics in Cloud Monitoring
# Dashboard: Cloud Armor policies overview
# Resource type: Network Security Policy
# Metrics: Requests count, Previewed Requests count
# Filter dimensions: backend_target_name, blocked
```

## Conclusion

GCP Cloud Armor security policies support IPv6 address matching in rule conditions using standard CIDR notation like `2001:db8::/32` in `src_ip_ranges` or `inIpRange(origin.ip, '::/0')` in CEL expressions. Create rules to allowlist trusted IPv6 prefixes, blocklist known malicious ranges, and rate-limit IPv6 traffic by source IP. Attach security policies to backend services used by supported Google Cloud load balancers such as global external Application Load Balancers. Cloud Armor evaluates rules for both IPv4 and IPv6 clients simultaneously, so include both address families in your rules as needed.
