# How to Configure IP Allowlist and Denylist Rules in Google Cloud Armor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Armor, IP Allowlist, IP Denylist, Security, Firewall

Description: Learn how to configure IP allowlist and denylist rules in Google Cloud Armor to control access to your applications based on source IP addresses.

---

IP-based access control is the most fundamental layer of protection for any web application. Cloud Armor makes it straightforward to create allowlists (permit only specific IPs) and denylists (block specific IPs) that are enforced at Google's network edge before requests ever reach your backend.

This guide covers both approaches, from simple single-IP rules to managing large IP lists that change frequently.

## Allowlist vs. Denylist Strategy

The strategy you choose depends on your use case:

**Denylist (default allow)**: Start by allowing all traffic and block known bad actors. This is the most common approach for public-facing websites and APIs.

**Allowlist (default deny)**: Block everything by default and only allow specific trusted IPs. This is appropriate for internal applications, admin panels, staging environments, and B2B services.

You can also combine both approaches in a single policy by using rule priorities to create exceptions.

## Step 1: Create the Security Policy

```bash
# Create a new security policy
gcloud compute security-policies create ip-access-policy \
    --description="IP-based access control policy" \
    --project=my-project
```

## Step 2: Set Up a Denylist (Block Specific IPs)

For a denylist approach, keep the default allow rule and add deny rules for bad IPs.

### Block Individual IPs

```bash
# Block a single malicious IP
gcloud compute security-policies rules create 1000 \
    --security-policy=ip-access-policy \
    --src-ip-ranges="203.0.113.50" \
    --action=deny-403 \
    --description="Block known attacker" \
    --project=my-project
```

### Block IP Ranges (CIDR)

```bash
# Block an entire subnet
gcloud compute security-policies rules create 1010 \
    --security-policy=ip-access-policy \
    --src-ip-ranges="198.51.100.0/24" \
    --action=deny-403 \
    --description="Block hostile subnet" \
    --project=my-project
```

### Block Multiple IP Ranges in One Rule

You can include up to 10 IP ranges in a single rule.

```bash
# Block multiple IP ranges in a single rule
gcloud compute security-policies rules create 1020 \
    --security-policy=ip-access-policy \
    --src-ip-ranges="192.0.2.0/24,198.51.100.0/24,203.0.113.0/24" \
    --action=deny-403 \
    --description="Block multiple hostile ranges" \
    --project=my-project
```

## Step 3: Set Up an Allowlist (Only Permit Specific IPs)

For an allowlist approach, change the default rule to deny and create allow rules for trusted IPs.

### Change Default Rule to Deny

```bash
# Set the default rule to deny all traffic
gcloud compute security-policies rules update 2147483647 \
    --security-policy=ip-access-policy \
    --action=deny-403 \
    --description="Default deny - only allowlisted IPs can access" \
    --project=my-project
```

### Add Allowed IPs

```bash
# Allow your office network
gcloud compute security-policies rules create 100 \
    --security-policy=ip-access-policy \
    --src-ip-ranges="100.20.30.0/24" \
    --action=allow \
    --description="Allow office network" \
    --project=my-project

# Allow a partner's IP range
gcloud compute security-policies rules create 200 \
    --security-policy=ip-access-policy \
    --src-ip-ranges="150.60.0.0/16" \
    --action=allow \
    --description="Allow partner network" \
    --project=my-project

# Allow a VPN endpoint
gcloud compute security-policies rules create 300 \
    --security-policy=ip-access-policy \
    --src-ip-ranges="55.10.20.100" \
    --action=allow \
    --description="Allow VPN endpoint" \
    --project=my-project
```

## Step 4: Combine Allowlist and Denylist

You can use both strategies in a single policy. For example, allow most traffic but block specific IPs, while also explicitly allowing certain IPs that might otherwise be caught by geo-blocking rules.

```bash
# Priority 100: Always allow your monitoring service
gcloud compute security-policies rules create 100 \
    --security-policy=ip-access-policy \
    --src-ip-ranges="35.191.0.0/16,130.211.0.0/22" \
    --action=allow \
    --description="Allow Google health checks" \
    --project=my-project

# Priority 1000: Block known bad actors
gcloud compute security-policies rules create 1000 \
    --security-policy=ip-access-policy \
    --src-ip-ranges="203.0.113.0/24" \
    --action=deny-403 \
    --description="Block known attackers" \
    --project=my-project

# Priority 2147483647: Default allow (everything else)
# This is the default behavior
```

## Step 5: Manage Large IP Lists

For large-scale IP management, use named IP lists or manage rules programmatically.

### Using Google's Named IP Lists

Cloud Armor includes pre-built named IP lists for known services.

```bash
# Allow only traffic from Cloudflare's IP ranges
gcloud compute security-policies rules create 500 \
    --security-policy=ip-access-policy \
    --expression="evaluatePreconfiguredExpr('sourceiplist-cloudflare')" \
    --action=allow \
    --description="Allow Cloudflare proxy IPs" \
    --project=my-project
```

Available named IP lists include:
- `sourceiplist-cloudflare` - Cloudflare proxy IPs
- `sourceiplist-fastly` - Fastly CDN IPs
- `sourceiplist-imperva` - Imperva/Incapsula IPs
- `sourceiplist-public-cloud-aws` - AWS IP ranges
- `sourceiplist-public-cloud-azure` - Azure IP ranges
- `sourceiplist-public-cloud-gcp` - GCP IP ranges

### Programmatic IP List Management

For dynamic IP lists that change frequently, use a script to update rules.

```python
# update_denylist.py - Update Cloud Armor deny rules from a threat intelligence feed
import subprocess
import json

def update_deny_rule(policy_name, priority, ip_list, description, project):
    """Update or create a Cloud Armor deny rule with new IP ranges."""
    # Cloud Armor limits to 10 IP ranges per rule,
    # so we need to split large lists into multiple rules

    # Remove existing rules in our priority range first
    chunks = [ip_list[i:i+10] for i in range(0, len(ip_list), 10)]

    for idx, chunk in enumerate(chunks):
        rule_priority = priority + idx
        ip_ranges = ",".join(chunk)

        # Try to update existing rule first, create if it does not exist
        try:
            subprocess.run([
                "gcloud", "compute", "security-policies", "rules", "update",
                str(rule_priority),
                "--security-policy", policy_name,
                "--src-ip-ranges", ip_ranges,
                "--action", "deny-403",
                "--description", f"{description} (batch {idx+1})",
                "--project", project
            ], check=True, capture_output=True)
        except subprocess.CalledProcessError:
            # Rule does not exist, create it
            subprocess.run([
                "gcloud", "compute", "security-policies", "rules", "create",
                str(rule_priority),
                "--security-policy", policy_name,
                "--src-ip-ranges", ip_ranges,
                "--action", "deny-403",
                "--description", f"{description} (batch {idx+1})",
                "--project", project
            ], check=True)

# Example: Block IPs from a threat feed
threat_ips = [
    "203.0.113.0/24",
    "198.51.100.0/24",
    "192.0.2.0/24",
    # ... more IPs from your threat intelligence feed
]

update_deny_rule(
    policy_name="ip-access-policy",
    priority=5000,
    ip_list=threat_ips,
    description="Threat intelligence blocklist",
    project="my-project"
)
```

## Terraform Configuration

Here is a complete allowlist/denylist setup in Terraform.

```hcl
# Security policy with IP allowlist and denylist
resource "google_compute_security_policy" "ip_policy" {
  name        = "ip-access-policy"
  description = "IP-based access control"

  # Default deny for allowlist approach
  rule {
    action   = "deny(403)"
    priority = 2147483647
    description = "Default deny"

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
  }

  # Allow office network
  rule {
    action   = "allow"
    priority = 100
    description = "Allow office"

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["100.20.30.0/24"]
      }
    }
  }

  # Allow VPN
  rule {
    action   = "allow"
    priority = 200
    description = "Allow VPN"

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["55.10.20.100/32"]
      }
    }
  }

  # Allow Google health check IPs
  rule {
    action   = "allow"
    priority = 50
    description = "Allow health checks"

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = [
          "35.191.0.0/16",
          "130.211.0.0/22",
        ]
      }
    }
  }
}
```

## Step 6: Attach to Backend Service

```bash
# Attach the security policy to your backend service
gcloud compute backend-services update my-web-backend \
    --security-policy=ip-access-policy \
    --global \
    --project=my-project
```

## Step 7: Test and Monitor

### Test Allowed Access

```bash
# From an allowed IP, verify access works
curl -I https://my-app.example.com
# Expected: HTTP/2 200
```

### Test Blocked Access

```bash
# From a blocked IP or range, verify access is denied
curl -I https://my-app.example.com
# Expected: HTTP/2 403
```

### Monitor Rule Matches

```bash
# View Cloud Armor enforcement logs
gcloud logging read \
    'resource.type="http_load_balancer" AND jsonPayload.enforcedSecurityPolicy.name="ip-access-policy"' \
    --format="table(timestamp,httpRequest.remoteIp,jsonPayload.enforcedSecurityPolicy.outcome,jsonPayload.enforcedSecurityPolicy.matchedFieldValue)" \
    --limit=30 \
    --project=my-project
```

## Common Patterns

### Admin Panel Protection

Allow only your team's IPs to access the admin interface.

```bash
# Allow admin access only from office IPs using a path-based expression
gcloud compute security-policies rules create 150 \
    --security-policy=ip-access-policy \
    --expression="request.path.startsWith('/admin') && !inIpRange(origin.ip, '100.20.30.0/24')" \
    --action=deny-403 \
    --description="Restrict admin to office IPs" \
    --project=my-project
```

### Maintenance Mode

During maintenance, allow only your team to access the site.

```bash
# Temporary maintenance mode - block everyone except your team
gcloud compute security-policies rules create 50 \
    --security-policy=ip-access-policy \
    --src-ip-ranges="0.0.0.0/0" \
    --action=deny-503 \
    --description="Maintenance mode - temporary" \
    --project=my-project

# Your team is allowed via the higher-priority rule at priority 100
```

Remove the maintenance rule when done:

```bash
# Remove maintenance mode
gcloud compute security-policies rules delete 50 \
    --security-policy=ip-access-policy \
    --project=my-project
```

## Wrapping Up

IP allowlists and denylists in Cloud Armor give you precise control over who can reach your application. For public-facing sites, start with a denylist to block known bad actors. For internal tools and staging environments, use an allowlist with a default deny. Either way, use preview mode to test new rules, keep your IP lists updated, and monitor the logs to catch both legitimate blocks and false positives.
