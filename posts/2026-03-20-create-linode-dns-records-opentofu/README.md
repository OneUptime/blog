# How to Create Linode DNS Domains and Records with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Linode, DNS, Infrastructure as Code, Networking

Description: Learn how to manage Linode DNS domains and records with OpenTofu, including A, CNAME, MX, and TXT records for complete DNS management.

Linode's DNS Manager provides authoritative DNS hosting. OpenTofu lets you manage domains and all record types programmatically, keeping DNS configuration in version control alongside your infrastructure.

## Creating a Domain Zone

```hcl
resource "linode_domain" "main" {
  type      = "master"     # master (authoritative) or slave
  domain    = "example.com"
  soa_email = "admin@example.com"
  ttl_sec   = 300

  tags = ["production"]
}
```

## Creating DNS Records

### A Record

```hcl
resource "linode_domain_record" "root" {
  domain_id   = linode_domain.main.id
  record_type = "A"
  name        = ""  # Empty string for apex (@)
  target      = linode_instance.web.ip_address
  ttl_sec     = 300
}

resource "linode_domain_record" "www" {
  domain_id   = linode_domain.main.id
  record_type = "A"
  name        = "www"
  target      = linode_instance.web.ip_address
  ttl_sec     = 300
}
```

### CNAME Record

```hcl
resource "linode_domain_record" "api" {
  domain_id   = linode_domain.main.id
  record_type = "CNAME"
  name        = "api"
  target      = "api.example.com"
  ttl_sec     = 3600
}
```

### MX Records

```hcl
resource "linode_domain_record" "mx1" {
  domain_id   = linode_domain.main.id
  record_type = "MX"
  name        = ""
  target      = "aspmx.l.google.com"
  priority    = 1
  ttl_sec     = 3600
}

resource "linode_domain_record" "mx2" {
  domain_id   = linode_domain.main.id
  record_type = "MX"
  name        = ""
  target      = "alt1.aspmx.l.google.com"
  priority    = 5
  ttl_sec     = 3600
}
```

### TXT Records

```hcl
resource "linode_domain_record" "spf" {
  domain_id   = linode_domain.main.id
  record_type = "TXT"
  name        = ""
  target      = "v=spf1 include:_spf.google.com ~all"
  ttl_sec     = 3600
}

resource "linode_domain_record" "dkim" {
  domain_id   = linode_domain.main.id
  record_type = "TXT"
  name        = "google._domainkey"
  target      = var.dkim_value
  ttl_sec     = 3600
}
```

### SRV Record

```hcl
resource "linode_domain_record" "srv" {
  domain_id   = linode_domain.main.id
  record_type = "SRV"
  service     = "sip"
  protocol    = "tcp"
  target      = "sip.example.com"
  priority    = 10
  weight      = 20
  port        = 5060
  ttl_sec     = 3600
}
```

## Creating Records in Bulk

```hcl
variable "subdomains" {
  type = map(string)
  default = {
    "app"  = "203.0.113.10"
    "api"  = "203.0.113.11"
    "mail" = "203.0.113.12"
  }
}

resource "linode_domain_record" "subdomains" {
  for_each    = var.subdomains
  domain_id   = linode_domain.main.id
  record_type = "A"
  name        = each.key
  target      = each.value
  ttl_sec     = 300
}
```

## Conclusion

Linode DNS in OpenTofu uses `linode_domain` for the zone and `linode_domain_record` for individual records. All common record types are supported. Use `for_each` with a variable map for bulk record management, and wire record targets directly to Linode instance IP addresses for automatic DNS updates when instances are replaced.
