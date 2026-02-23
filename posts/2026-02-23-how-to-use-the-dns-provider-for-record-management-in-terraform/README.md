# How to Use the DNS Provider for Record Management in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DNS Provider, DNS Records, Infrastructure as Code, Networking

Description: Learn how to use the Terraform DNS provider to manage DNS records, perform DNS lookups, create A, AAAA, CNAME, MX, and TXT records programmatically.

---

The DNS provider in Terraform manages DNS records through the DNS update protocol (RFC 2136). It can also perform DNS lookups through data sources, which is useful for reading existing DNS records into your Terraform configuration. This provider works with DNS servers that support dynamic updates, including BIND, PowerDNS, and Windows DNS Server.

In this guide, we will explore both the read-only data sources for DNS lookups and the writable resources for managing DNS records.

## Provider Setup

```hcl
# main.tf
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    dns = {
      source  = "hashicorp/dns"
      version = "~> 3.4"
    }
  }
}

# Configure for DNS updates using TSIG authentication
provider "dns" {
  update {
    server        = var.dns_server
    key_name      = var.tsig_key_name
    key_algorithm = "hmac-sha256"
    key_secret    = var.tsig_key_secret
  }
}

variable "dns_server" {
  type    = string
  default = "ns1.example.com"
}

variable "tsig_key_name" {
  type    = string
  default = "terraform-key."
}

variable "tsig_key_secret" {
  type      = string
  sensitive = true
  default   = "placeholder"
}

variable "domain" {
  type    = string
  default = "example.com"
}
```

## DNS Lookup Data Sources

```hcl
# lookups.tf - Read existing DNS records
data "dns_a_record_set" "web" {
  host = "www.${var.domain}"
}

output "web_ips" {
  value = data.dns_a_record_set.web.addrs
}

data "dns_cname_record_set" "app" {
  host = "app.${var.domain}"
}

output "app_cname" {
  value = data.dns_cname_record_set.app.cname
}

data "dns_mx_record_set" "mail" {
  domain = var.domain
}

output "mx_records" {
  value = data.dns_mx_record_set.mail.mx
}

data "dns_txt_record_set" "spf" {
  host = var.domain
}

output "txt_records" {
  value = data.dns_txt_record_set.spf.records
}

data "dns_ns_record_set" "nameservers" {
  host = var.domain
}

output "nameservers" {
  value = data.dns_ns_record_set.nameservers.nameservers
}
```

## Creating A Records

```hcl
# a-records.tf - Manage A records
resource "dns_a_record_set" "web" {
  zone = "${var.domain}."
  name = "www"
  ttl  = 300

  addresses = [
    "10.0.1.10",
    "10.0.1.11",
  ]
}

resource "dns_a_record_set" "api" {
  zone = "${var.domain}."
  name = "api"
  ttl  = 60

  addresses = var.api_server_ips
}

variable "api_server_ips" {
  type    = list(string)
  default = ["10.0.2.10", "10.0.2.11", "10.0.2.12"]
}
```

## Creating AAAA Records

```hcl
# aaaa-records.tf - IPv6 records
resource "dns_aaaa_record_set" "web_v6" {
  zone = "${var.domain}."
  name = "www"
  ttl  = 300

  addresses = [
    "2001:db8::1",
    "2001:db8::2",
  ]
}
```

## Creating CNAME Records

```hcl
# cname-records.tf - Alias records
resource "dns_cname_record" "app" {
  zone  = "${var.domain}."
  name  = "app"
  cname = "lb.${var.domain}."
  ttl   = 300
}

resource "dns_cname_record" "docs" {
  zone  = "${var.domain}."
  name  = "docs"
  cname = "readthedocs.io."
  ttl   = 3600
}
```

## Creating MX Records

```hcl
# mx-records.tf - Mail exchange records
resource "dns_mx_record_set" "mail" {
  zone = "${var.domain}."
  ttl  = 3600

  mx {
    preference = 10
    exchange   = "mail1.${var.domain}."
  }

  mx {
    preference = 20
    exchange   = "mail2.${var.domain}."
  }

  mx {
    preference = 30
    exchange   = "mail-backup.${var.domain}."
  }
}
```

## Creating TXT Records

```hcl
# txt-records.tf - Text records for SPF, DKIM, verification
resource "dns_txt_record_set" "spf" {
  zone = "${var.domain}."
  ttl  = 3600

  txt = [
    "v=spf1 include:_spf.google.com include:sendgrid.net ~all"
  ]
}

resource "dns_txt_record_set" "dmarc" {
  zone = "${var.domain}."
  name = "_dmarc"
  ttl  = 3600

  txt = [
    "v=DMARC1; p=reject; rua=mailto:dmarc@${var.domain}"
  ]
}

resource "dns_txt_record_set" "verification" {
  zone = "${var.domain}."
  name = "_verification"
  ttl  = 300

  txt = [var.verification_token]
}

variable "verification_token" {
  type    = string
  default = "verify-abc123"
}
```

## Managing Records for Multiple Services

```hcl
# multi-service.tf - DNS records for multiple services
variable "services" {
  type = map(object({
    ips  = list(string)
    ttl  = number
  }))
  default = {
    "api" = {
      ips = ["10.0.1.10", "10.0.1.11"]
      ttl = 60
    }
    "web" = {
      ips = ["10.0.2.10"]
      ttl = 300
    }
    "admin" = {
      ips = ["10.0.3.10"]
      ttl = 300
    }
  }
}

resource "dns_a_record_set" "services" {
  for_each = var.services

  zone      = "${var.domain}."
  name      = each.key
  ttl       = each.value.ttl
  addresses = each.value.ips
}
```

## Conclusion

The DNS provider gives you programmatic control over DNS records through Terraform. By managing DNS as code, you ensure records are consistent, version-controlled, and updated automatically when your infrastructure changes. For cloud-hosted DNS, consider using provider-specific resources like Route 53 or [Cloudflare DNS](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-cloudflare-provider-for-dns-and-cdn-in-terraform/view) which offer additional features like health-checked routing and geo-DNS.
