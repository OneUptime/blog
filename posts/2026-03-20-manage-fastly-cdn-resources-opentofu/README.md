# How to Manage Fastly CDN Resources with OpenTofu - Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Fastly, CDN, Infrastructure as Code, Edge Delivery

Description: Learn how to manage Fastly CDN services, backends, VCL snippets, and TLS configurations using OpenTofu and the official Fastly provider.

## Introduction

Fastly is a powerful edge cloud platform offering CDN, DDoS protection, and real-time log streaming. Using OpenTofu to manage Fastly resources brings your CDN configuration into version control, enabling consistent deployments, rollbacks, and team collaboration.

## Prerequisites

- OpenTofu installed (v1.6+)
- A Fastly account with an API token
- A domain name you control

## Provider Configuration

```hcl
terraform {
  required_providers {
    fastly = {
      source  = "fastly/fastly"
      version = ">= 9.1.1"
    }
  }
}

provider "fastly" {}
```

```bash
export FASTLY_API_KEY="your-fastly-api-token"
```

## Creating a Fastly Service

```hcl
resource "fastly_service_vcl" "app" {
  name = "my-app-cdn"

  domain {
    name    = "www.example.com"
    comment = "Primary domain"
  }

  backend {
    address          = "origin.example.com"
    name             = "origin"
    port             = 443
    use_ssl          = true
    ssl_cert_hostname = "origin.example.com"
    ssl_sni_hostname  = "origin.example.com"
    auto_loadbalance = false
    weight           = 100
  }

  force_destroy = true
}
```

## Adding Cache Settings

```hcl
resource "fastly_service_vcl" "app" {
  # ... existing config ...

  cache_setting {
    name            = "cache-html"
    action          = "cache"
    ttl             = 300
    stale_ttl       = 86400
    cache_condition = "is-html"
  }

  condition {
    name      = "is-html"
    statement = "req.url ~ \"\\.html$\""
    type      = "CACHE"
    priority  = 10
  }
}
```

## Custom VCL Snippets

Inject custom Varnish Configuration Language logic:

```hcl
resource "fastly_service_vcl" "app" {
  # ... existing config ...

  snippet {
    name     = "force-https"
    type     = "recv"
    priority = 100
    content  = <<-VCL
      if (!fastly_info.edge.is_tls) {
        error 601 "Force HTTPS";
      }
    VCL
  }

  snippet {
    name     = "handle-force-https"
    type     = "error"
    priority = 100
    content  = <<-VCL
      if (obj.status == 601 && obj.response == "Force HTTPS") {
        set obj.status = 301;
        set obj.response = "Moved Permanently";
        set obj.http.Location = "https://" + req.http.host + req.url;
        return (deliver);
      }
    VCL
  }
}
```

## Logging Configuration

Stream access logs to an S3 bucket:

```hcl
resource "fastly_service_vcl" "app" {
  # ... existing config ...

  logging_s3 {
    name              = "s3-access-logs"
    bucket_name       = "my-fastly-logs"
    path              = "/cdn-logs/%Y/%m/%d/"
    period            = 3600
    format            = "%h %l %u %t \"%r\" %>s %b"
    s3_access_key     = var.aws_access_key
    s3_secret_key     = var.aws_secret_key
    redundancy        = "standard"
    compression_codec = "gzip"
  }
}
```

## Managing TLS Certificates

```hcl
resource "fastly_tls_subscription" "app" {
  domains               = ["www.example.com", "api.example.com"]
  certificate_authority = "lets-encrypt"
}

output "validation_records" {
  value = fastly_tls_subscription.app.managed_dns_challenges
}
```

The output gives you the DNS challenge records you must create with your DNS provider before Fastly can issue the managed certificate.

## Activating a Service Version

Fastly uses service versioning. OpenTofu manages version activation automatically, but you can control it:

```hcl
resource "fastly_service_vcl" "app" {
  # ... config ...
  activate = true  # auto-activate on apply (default)
}
```

## Best Practices

- Use `force_destroy = true` only in non-production environments.
- Version your Fastly service separately from your application deploys.
- Use conditions to apply VCL snippets selectively rather than globally.
- Enable real-time logging to catch performance issues early.
- Test configuration changes in a staging service before applying to production.

## Conclusion

Managing Fastly CDN with OpenTofu gives you a reproducible, auditable approach to edge delivery configuration. From caching policies to custom VCL and TLS management, everything is captured in code and deployable with a single `tofu apply`.
