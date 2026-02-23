# How to Configure DNS Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Providers, DNS, Networking, Infrastructure as Code

Description: Learn how to configure the DNS provider in Terraform to manage DNS records programmatically using RFC 2136 dynamic updates.

---

DNS management is a critical part of any infrastructure setup, and doing it manually through a web console gets old fast. The DNS provider in Terraform allows you to manage DNS records through RFC 2136 dynamic updates, which means you can create, update, and delete DNS records on any compliant DNS server, including BIND, Windows DNS, and others that support the standard.

This provider is different from cloud-specific DNS providers like AWS Route 53 or Google Cloud DNS. It talks directly to DNS servers using the DNS update protocol, making it a solid choice for on-premises DNS infrastructure or when you need a cloud-agnostic approach.

## Prerequisites

- Terraform 1.0 or later
- A DNS server that supports RFC 2136 dynamic updates (BIND, Windows DNS, PowerDNS, etc.)
- TSIG keys configured on the DNS server for authentication (recommended)

## Declaring the Provider

```hcl
# versions.tf - Declare the DNS provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    dns = {
      source  = "hashicorp/dns"
      version = "~> 3.4"
    }
  }
}
```

## Basic Provider Configuration

The provider needs to know where your DNS server is and how to authenticate.

```hcl
# provider.tf - Configure DNS provider with TSIG authentication
provider "dns" {
  update {
    # DNS server address and port
    server = "ns1.example.com"
    port   = 53

    # TSIG authentication (recommended for production)
    key_name      = "terraform-key."
    key_algorithm = "hmac-sha256"
    key_secret    = var.tsig_key_secret
  }
}
```

### Without Authentication

For testing in a lab environment, you can skip TSIG authentication, but this is not recommended for production.

```hcl
# Unauthenticated DNS updates (development only)
provider "dns" {
  update {
    server = "192.168.1.10"
    port   = 53
  }
}
```

## Setting Up TSIG Keys

Before Terraform can update DNS records, your DNS server needs a TSIG key configured. Here is how to generate one and configure it in BIND.

```bash
# Generate a TSIG key using tsig-keygen (part of BIND)
tsig-keygen -a hmac-sha256 terraform-key
```

This outputs something like:

```
key "terraform-key" {
    algorithm hmac-sha256;
    secret "base64-encoded-secret-here";
};
```

Add this to your BIND configuration and allow updates from this key in the zone definition.

```hcl
# Pass the TSIG secret as a sensitive variable
variable "tsig_key_secret" {
  type      = string
  sensitive = true
}
```

## Managing A Records

```hcl
# Create an A record pointing to a single IP
resource "dns_a_record_set" "web_server" {
  zone = "example.com."
  name = "www"

  addresses = [
    "203.0.113.10"
  ]

  ttl = 300
}

# Create an A record with multiple IPs (round-robin)
resource "dns_a_record_set" "app_servers" {
  zone = "example.com."
  name = "app"

  addresses = [
    "203.0.113.20",
    "203.0.113.21",
    "203.0.113.22"
  ]

  ttl = 60
}
```

## Managing AAAA Records

```hcl
# Create an AAAA record for IPv6
resource "dns_aaaa_record_set" "web_server_v6" {
  zone = "example.com."
  name = "www"

  addresses = [
    "2001:db8::1"
  ]

  ttl = 300
}
```

## Managing CNAME Records

```hcl
# Create a CNAME record
resource "dns_cname_record" "blog" {
  zone  = "example.com."
  name  = "blog"
  cname = "blog-host.example.com."
  ttl   = 3600
}
```

## Managing MX Records

```hcl
# Create MX records for email routing
resource "dns_mx_record_set" "mail" {
  zone = "example.com."
  name = ""  # Empty string for the zone apex

  mx {
    preference = 10
    exchange   = "mail1.example.com."
  }

  mx {
    preference = 20
    exchange   = "mail2.example.com."
  }

  ttl = 3600
}
```

## Managing TXT Records

```hcl
# Create a TXT record for SPF
resource "dns_txt_record_set" "spf" {
  zone = "example.com."
  name = ""

  txt = [
    "v=spf1 include:_spf.google.com ~all"
  ]

  ttl = 3600
}

# Create a TXT record for domain verification
resource "dns_txt_record_set" "verification" {
  zone = "example.com."
  name = "_verification"

  txt = [
    "verify=abc123def456"
  ]

  ttl = 300
}
```

## Managing SRV Records

SRV records are useful for service discovery.

```hcl
# Create SRV records for a SIP service
resource "dns_srv_record_set" "sip" {
  zone = "example.com."
  name = "_sip._tcp"

  srv {
    priority = 10
    weight   = 60
    target   = "sip1.example.com."
    port     = 5060
  }

  srv {
    priority = 10
    weight   = 40
    target   = "sip2.example.com."
    port     = 5060
  }

  ttl = 3600
}
```

## Managing PTR Records

```hcl
# Create a PTR record for reverse DNS
resource "dns_ptr_record" "web_reverse" {
  zone = "113.0.203.in-addr.arpa."
  name = "10"
  ptr  = "www.example.com."
  ttl  = 3600
}
```

## Managing NS Records

```hcl
# Delegate a subdomain to different nameservers
resource "dns_ns_record_set" "subdomain" {
  zone = "example.com."
  name = "dev"

  nameservers = [
    "ns1.dev.example.com.",
    "ns2.dev.example.com."
  ]

  ttl = 86400
}
```

## Reading DNS Records as Data Sources

The DNS provider also includes data sources for querying existing DNS records.

```hcl
# Look up A records for a hostname
data "dns_a_record_set" "google" {
  host = "www.google.com"
}

output "google_ips" {
  value = data.dns_a_record_set.google.addrs
}

# Look up MX records
data "dns_mx_record_set" "example" {
  domain = "example.com"
}

# Look up TXT records
data "dns_txt_record_set" "spf" {
  host = "example.com"
}
```

## Dynamic Records with Other Resources

A common pattern is creating DNS records that point to dynamically provisioned infrastructure.

```hcl
# Create a VM and register its DNS record
resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"
}

# Automatically create a DNS record for the new VM
resource "dns_a_record_set" "web_dns" {
  zone = "internal.example.com."
  name = "web-01"

  addresses = [
    aws_instance.web.private_ip
  ]

  ttl = 60
}
```

## Multiple DNS Servers

If you need to manage records across different DNS servers, use provider aliases.

```hcl
# Internal DNS server
provider "dns" {
  alias = "internal"

  update {
    server        = "ns-internal.example.com"
    key_name      = "terraform-key."
    key_algorithm = "hmac-sha256"
    key_secret    = var.internal_tsig_secret
  }
}

# External DNS server
provider "dns" {
  alias = "external"

  update {
    server        = "ns-external.example.com"
    key_name      = "terraform-key."
    key_algorithm = "hmac-sha256"
    key_secret    = var.external_tsig_secret
  }
}

# Internal record
resource "dns_a_record_set" "internal_app" {
  provider  = dns.internal
  zone      = "internal.example.com."
  name      = "app"
  addresses = ["10.0.1.50"]
  ttl       = 300
}

# External record
resource "dns_a_record_set" "external_app" {
  provider  = dns.external
  zone      = "example.com."
  name      = "app"
  addresses = ["203.0.113.50"]
  ttl       = 300
}
```

## Important Notes

There are a few things to keep in mind when using this provider:

1. The trailing dot on zone names is required. The zone must be specified as `"example.com."` not `"example.com"`.

2. The `name` attribute is relative to the zone. To create a record at the zone apex, use an empty string `""`.

3. TSIG authentication is strongly recommended. Without it, anyone who can reach your DNS server on port 53 can modify records.

4. The DNS provider works at the record set level. If you create an `dns_a_record_set` resource, it manages all A records for that name, not individual records.

5. Make sure your DNS server's zone is configured to allow dynamic updates from the TSIG key or the IP address running Terraform.

## Wrapping Up

The DNS provider in Terraform is a straightforward way to manage DNS records on any server that supports RFC 2136 dynamic updates. It is particularly useful for on-premises environments or mixed cloud setups where you want a single tool to manage DNS across different servers.

If you need to monitor DNS resolution and get alerts when your records stop resolving correctly, [OneUptime](https://oneuptime.com) provides DNS monitoring capabilities alongside its broader infrastructure monitoring platform.
