# How to Set Up End-to-End IPv6 Content Delivery (DNS + CDN + Origin)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, CDN, DNS, Origin, End-to-End, Content Delivery

Description: A guide to setting up a complete end-to-end IPv6 content delivery pipeline from DNS resolution through CDN edge to origin server, ensuring IPv6 connectivity at every layer.

End-to-end IPv6 content delivery means every hop in the request chain supports IPv6: the DNS resolver returns AAAA records, the CDN edge accepts IPv6 connections, and the CDN is configured to connect to the origin over IPv6. This guide walks through the complete setup.

## Architecture Overview

```text
Client (IPv6)
    ↓ DNS AAAA query
Recursive Resolver (IPv6 capable)
    ↓ Returns 2001:db8::100 AAAA
CDN Edge (IPv6 listener)
    ↓ Connect to origin via IPv6
Origin Server (IPv6 enabled)
```

## Step 1: Origin Server IPv6 Setup

```bash
# Ensure origin has an IPv6 address
# Replace eth0 if your origin uses a different interface

ip -6 addr show dev eth0
# Must show a global unicast address (2001: or similar)

# Configure nginx to listen on IPv6
# /etc/nginx/sites-enabled/app
server {
    listen 80;
    listen [::]:80;           # IPv6 listener
    listen 443 ssl;
    listen [::]:443 ssl;      # IPv6 HTTPS listener

    server_name origin.example.com;

    location / {
        root /var/www/html;
        index index.html;
    }
}

# Test IPv6 listener
ss -6 -tlnp | grep nginx
```

## Step 2: Origin DNS (AAAA Record)

```bash
# Add AAAA record for origin
dig AAAA origin.example.com   # Should return the origin's IPv6 address

# Verify from CDN's perspective
# CDN must be able to resolve AAAA for the origin hostname
# Test from a CDN probe server:
nslookup -type=AAAA origin.example.com
```

## Step 3: CDN Configuration with IPv6 Origin

### Cloudflare

```bash
# Cloudflare's IPv6 Compatibility enables IPv6 from clients to Cloudflare's edge.
# For proxied records that have both IPv4 and IPv6 origin addresses,
# Cloudflare prefers IPv4 when connecting to the origin.
# If you need the origin leg to stay on IPv6, use an origin hostname that resolves only to AAAA.
#
# Verify:
# - Network -> IPv6 Compatibility is enabled
# - dig AAAA example.com returns Cloudflare anycast AAAA records
```

### AWS CloudFront

```hcl
resource "aws_cloudfront_distribution" "ipv6_e2e" {
  enabled         = true
  is_ipv6_enabled = true    # Accept IPv6 from clients

  origin {
    # Hostname with AAAA record - set ip_address_type to control origin connectivity
    domain_name = "origin.example.com"
    origin_id   = "IPv6Origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      ip_address_type        = "ipv6" # Use "dualstack" if the origin publishes both A and AAAA
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "IPv6Origin"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
```

### Fastly

```hcl
resource "fastly_service_vcl" "ipv6_e2e" {
  name = "ipv6-e2e"

  domain { name = "cdn.example.com" }

  backend {
    # Prefer IPv6 when the hostname resolves to both A and AAAA
    address = "origin.example.com"
    name        = "ipv6_origin"
    port        = 443
    use_ssl     = true
    prefer_ipv6 = true
  }
}
```

## Step 4: CDN Edge IPv6 DNS Records

```bash
# Check that the hostname you published for the CDN resolves to AAAA:
# - Cloudflare proxied records return Cloudflare anycast AAAA when IPv6 Compatibility is on
# - CloudFront returns AAAA when is_ipv6_enabled = true
# - Fastly requires a dualstack hostname or an IPv6-enabled customer-specific hostname

dig AAAA cdn.example.com
# Should return provider-assigned IPv6 anycast addresses
```

## Step 5: Your Domain's DNS Records

```hcl
# Point your public hostname at the CDN hostname instead of hard-coding CDN IPs
resource "cloudflare_dns_record" "cdn" {
  zone_id = var.zone_id
  name    = "cdn"
  type    = "CNAME"
  content = "d111111abcdef8.cloudfront.net"
  proxied = false
  ttl     = 1
}

# At the zone apex, use your DNS provider's ALIAS/ANAME/CNAME-flattening feature
# instead of hard-coding CDN IPv4 or IPv6 addresses.
```

## Verification: Test End-to-End IPv6

```bash
# Complete end-to-end verification

# 1. Verify DNS returns AAAA
dig AAAA example.com
# Must return an IPv6 address

# 2. Test IPv6 client connection
curl -6 -v https://example.com/ 2>&1 | grep "Connected to"
# Must show IPv6 address

# 3. Verify CDN is in the path (check headers)
curl -6 https://example.com/ -D -
# Cloudflare: CF-RAY header
# CloudFront: X-Amz-Cf-Id header
# Fastly: X-Served-By header

# 4. Verify how the CDN connects to the origin
# Check the source address in origin access logs.
# With CloudFront ip_address_type = "ipv6" (or Fastly prefer_ipv6 = true),
# the CDN-to-origin source address can appear as IPv6.
# Cloudflare may still use IPv4 for dual-stack proxied origins.
tail -f /var/log/nginx/access.log | awk '{print $1}'

# 5. Performance: measure IPv6 connection latency
curl -6 -w "DNS: %{time_namelookup}s, Connect: %{time_connect}s, TTFB: %{time_starttransfer}s\n" \
  -o /dev/null https://example.com/
```

## Troubleshooting E2E IPv6

| Layer | Check | Command |
|---|---|---|
| Origin IPv6 | Has IPv6 address? | `ip -6 addr show` |
| Origin DNS | Has AAAA record? | `dig AAAA origin.example.com` |
| CDN config | IPv6 origin enabled? | CDN dashboard |
| CDN DNS | Has AAAA record? | `dig AAAA cdn.example.com` |
| Client | Gets AAAA? | `dig AAAA example.com` |
| E2E | Connection via IPv6? | `curl -6 -v https://example.com` |

End-to-end IPv6 content delivery requires IPv6 at every layer - origin server, CDN edge, and DNS - and some providers require explicit settings on the origin leg. Once properly configured, it provides optimal latency for IPv6 clients by leveraging native IPv6 routing across the entire path.
