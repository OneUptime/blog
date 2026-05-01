# How to Configure the DNS Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, DNS, Infrastructure as Code, IaC, DNS Provider

Description: Learn how to configure the DNS provider in OpenTofu to manage DNS records through any DNS server supporting RFC 2136.

## Introduction

This guide covers how to configure the DNS provider in OpenTofu to manage DNS records through an RFC 2136-compatible DNS server with practical examples and production-ready configurations.

## Prerequisites

- OpenTofu v1.6+
- Access to an authoritative DNS server that accepts RFC 2136 updates
- TSIG or GSS-TSIG credentials if your DNS server requires authenticated updates
- Basic understanding of OpenTofu concepts

## Step 1: Install and Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    dns = {
      source  = "hashicorp/dns"
      version = "~> 3.5"
    }
  }
}

# Configure the provider to send RFC 2136 updates
provider "dns" {
  update {
    server = var.dns_server
  }
}
```

## Step 2: Set Up Authentication

```bash
# Use environment variables for TSIG authentication
export DNS_UPDATE_KEYNAME="example.com."
export DNS_UPDATE_KEYALGORITHM="hmac-sha256"
export DNS_UPDATE_KEYSECRET="base64-encoded-shared-secret"
```

```hcl
variable "dns_server" {
  description = "Hostname or IP address of the authoritative DNS server"
  type        = string
}

variable "dns_zone" {
  description = "DNS zone to manage, including the trailing dot"
  type        = string
}
```

## Step 3: Create Basic Resources

```hcl
resource "dns_a_record_set" "www" {
  zone = var.dns_zone
  name = "www"
  addresses = [
    "192.0.2.10",
    "192.0.2.11",
  ]
  ttl = 300
}

resource "dns_cname_record" "app" {
  zone  = var.dns_zone
  name  = "app"
  cname = "www.${var.dns_zone}"
  ttl   = 300
}
```

## Step 4: Configure Advanced Settings

```hcl
# Alternate provider configuration for TCP updates with custom retry settings
provider "dns" {
  alias = "tcp"

  update {
    server    = var.dns_server
    transport = "tcp"
    timeout   = "5s"
    retries   = 5
  }
}

resource "dns_txt_record_set" "acme" {
  provider = dns.tcp
  zone     = var.dns_zone
  name     = "_acme-challenge"
  txt = [
    "example-verification-token",
  ]
  ttl = 60
}
```

## Step 5: Define Outputs

```hcl
output "www_record_fqdn" {
  description = "The fully qualified domain name of the A record"
  value       = dns_a_record_set.www.id
}

output "acme_record_fqdn" {
  description = "The fully qualified domain name of the TXT record"
  value       = dns_txt_record_set.acme.id
}
```

## Step 6: Deploy

```bash
# Initialize OpenTofu and download provider
tofu init

# Validate configuration syntax
tofu validate

# Preview planned changes
tofu plan

# Apply configuration
tofu apply
```

## Common Issues and Solutions

### Authentication Errors
Verify the `DNS_UPDATE_KEYNAME`, `DNS_UPDATE_KEYALGORITHM`, and `DNS_UPDATE_KEYSECRET` values match the TSIG key configured on the DNS server.

### Zone Formatting Errors
The `zone` argument must be a fully qualified domain name with a trailing dot, such as `example.com.`. CNAME targets should also be fully qualified.

### Provider Version Conflicts
Pin to a specific provider version range to ensure reproducible deployments.

## Conclusion

You have successfully configured the DNS provider in OpenTofu. This provider enables you to manage RFC 2136-compatible DNS records as code, ensuring consistency and enabling GitOps workflows. Always use environment variables or secure secret stores for sensitive credentials.
