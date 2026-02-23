# How to Create Cloudflare DNS Records with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Cloudflare, DNS, Infrastructure as Code, Networking

Description: Learn how to create and manage Cloudflare DNS records with Terraform including A, CNAME, MX, TXT, and SRV records with proxy settings and TTL configuration.

---

Cloudflare DNS is one of the fastest DNS services available, and managing it with Terraform gives you version-controlled, automated DNS management. The cloudflare_record resource supports all DNS record types and integrates with Cloudflare's proxy feature, which adds CDN caching and DDoS protection to your records.

In this guide, we will create various types of Cloudflare DNS records with Terraform, including proxied and non-proxied records, mail configuration, verification records, and dynamic multi-service setups.

## Provider Setup

```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}

variable "zone_id" {
  type = string
}

variable "domain" {
  type    = string
  default = "example.com"
}
```

## A Records

```hcl
# a-records.tf
resource "cloudflare_record" "root_a" {
  zone_id = var.zone_id
  name    = "@"
  content = "203.0.113.10"
  type    = "A"
  proxied = true
  ttl     = 1  # Auto when proxied
  comment = "Root domain pointing to primary server"
}

resource "cloudflare_record" "api_a" {
  zone_id = var.zone_id
  name    = "api"
  content = "203.0.113.20"
  type    = "A"
  proxied = true
  comment = "API server"
}

# Non-proxied record for direct access
resource "cloudflare_record" "direct" {
  zone_id = var.zone_id
  name    = "direct"
  content = "203.0.113.10"
  type    = "A"
  proxied = false
  ttl     = 300
  comment = "Direct access bypassing Cloudflare proxy"
}
```

## CNAME Records

```hcl
# cname-records.tf
resource "cloudflare_record" "www" {
  zone_id = var.zone_id
  name    = "www"
  content = var.domain
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_record" "app" {
  zone_id = var.zone_id
  name    = "app"
  content = "app-lb.us-east-1.elb.amazonaws.com"
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_record" "status" {
  zone_id = var.zone_id
  name    = "status"
  content = "statuspage.example.com"
  type    = "CNAME"
  proxied = false
  ttl     = 3600
}
```

## Mail Records

```hcl
# mail-records.tf
resource "cloudflare_record" "mx_primary" {
  zone_id  = var.zone_id
  name     = "@"
  content  = "aspmx.l.google.com"
  type     = "MX"
  priority = 1
}

resource "cloudflare_record" "mx_alt1" {
  zone_id  = var.zone_id
  name     = "@"
  content  = "alt1.aspmx.l.google.com"
  type     = "MX"
  priority = 5
}

resource "cloudflare_record" "mx_alt2" {
  zone_id  = var.zone_id
  name     = "@"
  content  = "alt2.aspmx.l.google.com"
  type     = "MX"
  priority = 5
}

# SPF record
resource "cloudflare_record" "spf" {
  zone_id = var.zone_id
  name    = "@"
  content = "v=spf1 include:_spf.google.com include:sendgrid.net ~all"
  type    = "TXT"
}

# DMARC record
resource "cloudflare_record" "dmarc" {
  zone_id = var.zone_id
  name    = "_dmarc"
  content = "v=DMARC1; p=quarantine; rua=mailto:dmarc@${var.domain}"
  type    = "TXT"
}

# DKIM record
resource "cloudflare_record" "dkim" {
  zone_id = var.zone_id
  name    = "google._domainkey"
  content = var.dkim_value
  type    = "TXT"
}

variable "dkim_value" {
  type    = string
  default = "v=DKIM1; k=rsa; p=placeholder"
}
```

## Dynamic Records for Multiple Services

```hcl
# multi-service.tf
variable "services" {
  type = map(object({
    target  = string
    type    = string
    proxied = bool
  }))
  default = {
    "blog"    = { target = "blog-cdn.example.com", type = "CNAME", proxied = true }
    "docs"    = { target = "docs.readthedocs.io", type = "CNAME", proxied = false }
    "grafana" = { target = "10.0.1.50", type = "A", proxied = true }
    "jenkins" = { target = "10.0.1.60", type = "A", proxied = false }
  }
}

resource "cloudflare_record" "services" {
  for_each = var.services

  zone_id = var.zone_id
  name    = each.key
  content = each.value.target
  type    = each.value.type
  proxied = each.value.proxied
  ttl     = each.value.proxied ? 1 : 300
  comment = "Service: ${each.key}"
}
```

## SRV Records

```hcl
# srv-records.tf
resource "cloudflare_record" "xmpp_srv" {
  zone_id = var.zone_id
  name    = "_xmpp-server._tcp"
  type    = "SRV"

  data {
    service  = "_xmpp-server"
    proto    = "_tcp"
    name     = var.domain
    priority = 10
    weight   = 0
    port     = 5269
    target   = "xmpp.${var.domain}"
  }
}
```

## Outputs

```hcl
output "dns_records" {
  value = {
    root = cloudflare_record.root_a.hostname
    www  = cloudflare_record.www.hostname
    api  = cloudflare_record.api_a.hostname
    services = { for k, v in cloudflare_record.services : k => v.hostname }
  }
}
```

## Conclusion

Managing Cloudflare DNS records with Terraform gives you automated, version-controlled DNS management with the added benefit of Cloudflare's proxy features. The proxy option adds CDN caching and DDoS protection with a simple boolean flag. For related Cloudflare management, see our guides on [page rules](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudflare-page-rules-with-terraform/view) and [Workers](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudflare-workers-with-terraform/view).
