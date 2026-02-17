# How to Set Up Geo-Based Access Restrictions in Google Cloud Armor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Armor, Geo-Blocking, Security, Access Control

Description: Learn how to configure geographic access restrictions in Google Cloud Armor to block or allow traffic based on the source country or region.

---

Geo-based access restrictions let you control access to your application based on where requests originate geographically. This is useful for compliance with data sovereignty regulations, restricting access to region-specific services, or blocking traffic from countries that are common sources of attacks on your infrastructure.

Cloud Armor uses Google's IP geolocation data to determine the origin country of each request and can enforce allow or deny decisions based on country codes.

## How Geo-Based Filtering Works

Cloud Armor identifies the source country of a request using the IP address and Google's geolocation database. Each request is tagged with an ISO 3166-1 alpha-2 country code (like `US`, `GB`, `DE`, `JP`). You write rules using Cloud Armor's custom rule language (CEL - Common Expression Language) that reference the `origin.region_code` attribute.

Geo-identification happens at Google's edge before the request reaches your backend, so blocked requests never consume your backend resources.

## Step 1: Create a Security Policy

```bash
# Create a security policy for geo-based rules
gcloud compute security-policies create geo-policy \
    --description="Geographic access restriction policy" \
    --project=my-project
```

## Step 2: Block Specific Countries

Block traffic from one or more countries by creating deny rules with country code expressions.

### Block a Single Country

```bash
# Block traffic from a specific country
gcloud compute security-policies rules create 1000 \
    --security-policy=geo-policy \
    --expression="origin.region_code == 'XX'" \
    --action=deny-403 \
    --description="Block traffic from country XX" \
    --project=my-project
```

### Block Multiple Countries

```bash
# Block traffic from multiple countries
gcloud compute security-policies rules create 1010 \
    --security-policy=geo-policy \
    --expression="origin.region_code == 'XX' || origin.region_code == 'YY' || origin.region_code == 'ZZ'" \
    --action=deny-403 \
    --description="Block traffic from countries XX, YY, ZZ" \
    --project=my-project
```

For longer lists of countries, use the `in` operator for cleaner syntax.

```bash
# Block a list of countries using the in operator
gcloud compute security-policies rules create 1020 \
    --security-policy=geo-policy \
    --expression="origin.region_code in ['XX', 'YY', 'ZZ', 'AA', 'BB']" \
    --action=deny-403 \
    --description="Block traffic from high-risk countries" \
    --project=my-project
```

## Step 3: Allow Only Specific Countries

For services that should only be accessible from certain countries, flip the approach. Set the default to deny and allow specific countries.

```bash
# Change default rule to deny
gcloud compute security-policies rules update 2147483647 \
    --security-policy=geo-policy \
    --action=deny-403 \
    --description="Default deny - geo-restricted service" \
    --project=my-project

# Allow traffic from the US and Canada only
gcloud compute security-policies rules create 500 \
    --security-policy=geo-policy \
    --expression="origin.region_code == 'US' || origin.region_code == 'CA'" \
    --action=allow \
    --description="Allow US and Canada" \
    --project=my-project
```

### Allow EU Countries Only

For GDPR compliance or EU-specific services:

```bash
# Allow traffic from EU member states
gcloud compute security-policies rules create 600 \
    --security-policy=geo-policy \
    --expression="origin.region_code in ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE']" \
    --action=allow \
    --description="Allow EU member states" \
    --project=my-project
```

## Step 4: Combine Geo-Blocking with IP Exceptions

Sometimes you need to allow specific IPs even if they come from a blocked country. Use priority ordering to handle this.

```bash
# Priority 100: Always allow your monitoring service (regardless of country)
gcloud compute security-policies rules create 100 \
    --security-policy=geo-policy \
    --src-ip-ranges="35.191.0.0/16,130.211.0.0/22" \
    --action=allow \
    --description="Allow Google health checks from any country" \
    --project=my-project

# Priority 200: Allow your partner's IP (even if they are in a blocked country)
gcloud compute security-policies rules create 200 \
    --security-policy=geo-policy \
    --src-ip-ranges="203.0.113.100" \
    --action=allow \
    --description="Allow partner IP from blocked region" \
    --project=my-project

# Priority 1000: Block specific countries
gcloud compute security-policies rules create 1000 \
    --security-policy=geo-policy \
    --expression="origin.region_code in ['XX', 'YY', 'ZZ']" \
    --action=deny-403 \
    --description="Block high-risk countries" \
    --project=my-project

# Default: Allow everything else
```

Since rules are evaluated in priority order (lowest number first), the IP-based allow rules at 100 and 200 are checked before the geo-blocking rule at 1000.

## Step 5: Geo-Blocking with Custom Responses

Instead of a plain 403, you can redirect blocked users to an informational page.

```bash
# Redirect blocked geo traffic to a custom page
gcloud compute security-policies rules create 1000 \
    --security-policy=geo-policy \
    --expression="origin.region_code in ['XX', 'YY']" \
    --action=redirect \
    --redirect-type=EXTERNAL_302 \
    --redirect-target="https://example.com/geo-restricted" \
    --description="Redirect geo-blocked users to info page" \
    --project=my-project
```

## Step 6: Path-Based Geo Restrictions

Restrict geographic access to specific parts of your application while keeping the rest globally available.

```bash
# Only restrict the checkout flow to US and CA
gcloud compute security-policies rules create 800 \
    --security-policy=geo-policy \
    --expression="request.path.startsWith('/checkout') && !(origin.region_code in ['US', 'CA'])" \
    --action=deny-403 \
    --description="Restrict checkout to US and CA" \
    --project=my-project

# Only restrict the admin panel to specific countries
gcloud compute security-policies rules create 810 \
    --security-policy=geo-policy \
    --expression="request.path.startsWith('/admin') && !(origin.region_code in ['US', 'GB', 'DE'])" \
    --action=deny-403 \
    --description="Restrict admin to US, UK, Germany" \
    --project=my-project
```

## Terraform Configuration

```hcl
# Security policy with geo-based restrictions
resource "google_compute_security_policy" "geo_policy" {
  name        = "geo-policy"
  description = "Geographic access restriction policy"

  # Default allow
  rule {
    action   = "allow"
    priority = 2147483647
    description = "Default allow"

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
  }

  # Always allow health checks
  rule {
    action   = "allow"
    priority = 100
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

  # Block high-risk countries
  rule {
    action   = "deny(403)"
    priority = 1000
    description = "Block high-risk countries"

    match {
      expr {
        expression = "origin.region_code in ['XX', 'YY', 'ZZ']"
      }
    }
  }

  # Restrict checkout to US and Canada
  rule {
    action   = "deny(403)"
    priority = 800
    description = "Restrict checkout to US/CA"

    match {
      expr {
        expression = "request.path.startsWith('/checkout') && !(origin.region_code in ['US', 'CA'])"
      }
    }
  }
}

# Attach to backend service
resource "google_compute_backend_service" "web" {
  name            = "web-backend"
  security_policy = google_compute_security_policy.geo_policy.id
  # ... other backend configuration
}
```

## Step 7: Test with Preview Mode

Always test geo-blocking rules in preview mode before enforcement.

```bash
# Create a geo-blocking rule in preview mode
gcloud compute security-policies rules create 1000 \
    --security-policy=geo-policy \
    --expression="origin.region_code in ['XX', 'YY']" \
    --action=deny-403 \
    --description="Geo-block test - PREVIEW" \
    --preview \
    --project=my-project
```

Check the logs to see what traffic would be affected.

```bash
# Check preview mode matches for geo rules
gcloud logging read \
    'resource.type="http_load_balancer" AND jsonPayload.previewSecurityPolicy.name="geo-policy"' \
    --format="table(timestamp,httpRequest.remoteIp,jsonPayload.previewSecurityPolicy.configuredAction)" \
    --limit=50 \
    --project=my-project
```

## Step 8: Monitor Geo-Blocked Traffic

```bash
# View geo-blocked requests
gcloud logging read \
    'resource.type="http_load_balancer" AND jsonPayload.enforcedSecurityPolicy.name="geo-policy" AND jsonPayload.enforcedSecurityPolicy.outcome="DENY"' \
    --format="table(timestamp,httpRequest.remoteIp,jsonPayload.remoteIpCountry)" \
    --limit=30 \
    --project=my-project
```

Create an alert for unusual volumes of blocked traffic:

```bash
# Alert on high volume of geo-blocked requests
gcloud monitoring policies create \
    --display-name="High Geo-Block Volume" \
    --condition-display-name="Geo-blocked requests spike" \
    --condition-filter='resource.type="https_lb_rule" AND metric.type="loadbalancing.googleapis.com/https/request_count"' \
    --notification-channels=projects/my-project/notificationChannels/12345 \
    --project=my-project
```

## Limitations and Considerations

**VPN and proxy traffic**: Users can bypass geo-blocking using VPNs. The detected country will be wherever the VPN exit node is located. If this is a concern, combine geo-blocking with additional authentication.

**IP geolocation accuracy**: While Google's geolocation database is highly accurate, there are edge cases where IPs are misclassified, especially for mobile carriers and CDN IPs. Always provide a way for affected users to request access.

**Country code format**: Use ISO 3166-1 alpha-2 codes. Common examples: US (United States), GB (United Kingdom), DE (Germany), JP (Japan), AU (Australia), BR (Brazil).

**Satellite ISPs**: Some satellite internet providers have exit points in unexpected countries. Starlink users, for example, might appear to be in a different country than their physical location.

## Wrapping Up

Geo-based access restrictions in Cloud Armor are a practical tool for compliance, security, and regional service delivery. The setup is straightforward using the `origin.region_code` expression in custom rules. Combine geo rules with IP exceptions for trusted partners and monitoring services, use preview mode to validate before enforcement, and keep in mind that determined users can circumvent geographic restrictions with VPNs. For compliance-critical applications, treat geo-blocking as one layer of a broader access control strategy rather than the sole enforcement mechanism.
