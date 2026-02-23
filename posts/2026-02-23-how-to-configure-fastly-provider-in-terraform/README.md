# How to Configure Fastly Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Fastly, CDN, Providers, Infrastructure as Code, Edge Computing

Description: Step-by-step guide to configuring the Fastly provider in Terraform for managing CDN services, VCL configurations, edge dictionaries, and compute services programmatically.

---

Fastly is a CDN and edge cloud platform known for its speed and flexibility. If you are using Fastly for content delivery, DDoS protection, or edge computing, the Fastly Terraform provider lets you manage all of it as code. No more clicking through the Fastly dashboard to tweak VCL snippets or add backends. This post walks through provider setup, service creation, and real-world patterns for managing Fastly with Terraform.

## Prerequisites

Before configuring the provider, make sure you have:

- A Fastly account with an API token
- Terraform 1.0 or later installed
- Basic familiarity with Fastly concepts (services, backends, VCL)

To create an API token, log into the Fastly dashboard, go to Account, then Personal API Tokens, and generate a token with the appropriate scope. For full management, you need a token with `global` scope or at minimum `purge_all` and `global:read` combined with engineer-level access.

## Basic Provider Configuration

Here is the minimal setup to get the Fastly provider working:

```hcl
# main.tf - Fastly provider configuration

terraform {
  required_providers {
    fastly = {
      # Official Fastly provider from the Terraform registry
      source  = "fastly/fastly"
      version = "~> 5.0"
    }
  }

  required_version = ">= 1.0"
}

# Configure the Fastly provider with an API token
provider "fastly" {
  api_key = var.fastly_api_key
}
```

Define the variable for the API key:

```hcl
# variables.tf

variable "fastly_api_key" {
  type        = string
  description = "Fastly API token for authentication"
  sensitive   = true
}
```

## Authentication with Environment Variables

The cleaner approach, especially for CI/CD, is to use environment variables:

```bash
# Set the Fastly API key as an environment variable
export FASTLY_API_KEY="your-api-token-here"

# Run Terraform - the provider picks up the key automatically
terraform init
terraform plan
```

With the environment variable set, simplify the provider block:

```hcl
# Provider reads FASTLY_API_KEY from the environment
provider "fastly" {}
```

## Creating a Basic CDN Service

The fundamental resource in Fastly is a service. Here is how to create a VCL service with a backend:

```hcl
# Create a Fastly VCL service
resource "fastly_service_vcl" "website" {
  name = "my-website-cdn"

  # Domain that this service will respond to
  domain {
    name    = "www.example.com"
    comment = "Primary website domain"
  }

  # Additional domain
  domain {
    name    = "example.com"
    comment = "Apex domain redirect"
  }

  # Origin server configuration
  backend {
    address = "origin.example.com"
    name    = "primary_origin"
    port    = 443

    # Use TLS to connect to the origin
    use_ssl           = true
    ssl_cert_hostname = "origin.example.com"
    ssl_sni_hostname  = "origin.example.com"

    # Health check and timeouts
    connect_timeout       = 5000
    first_byte_timeout    = 15000
    between_bytes_timeout = 10000

    # Shield location for origin shielding
    shield = "sea-wa-us"
  }

  # Force HTTPS redirect
  request_setting {
    name      = "force-ssl"
    force_ssl = true
  }

  # Always activate after changes
  force_destroy = true
}
```

## Adding Cache Settings

Control how Fastly caches your content:

```hcl
resource "fastly_service_vcl" "website" {
  name = "my-website-cdn"

  domain {
    name = "www.example.com"
  }

  backend {
    address = "origin.example.com"
    name    = "primary_origin"
    port    = 443
    use_ssl = true
  }

  # Cache static assets for 1 day
  cache_setting {
    name            = "cache-static-assets"
    action          = "cache"
    ttl             = 86400
    stale_ttl       = 3600
    cache_condition = "is-static-asset"
  }

  # Condition to match static assets
  condition {
    name      = "is-static-asset"
    type      = "CACHE"
    statement = "req.url ~ \"\\.(css|js|png|jpg|gif|svg|woff2?)$\""
    priority  = 10
  }

  # Pass (do not cache) API requests
  cache_setting {
    name            = "pass-api"
    action          = "pass"
    cache_condition = "is-api-request"
  }

  condition {
    name      = "is-api-request"
    type      = "CACHE"
    statement = "req.url ~ \"^/api/\""
    priority  = 5
  }

  force_destroy = true
}
```

## Custom VCL Snippets

Fastly's power comes from its VCL engine. You can inject custom VCL through Terraform:

```hcl
# Add custom VCL snippet for security headers
resource "fastly_service_vcl" "website" {
  name = "my-website-cdn"

  domain {
    name = "www.example.com"
  }

  backend {
    address = "origin.example.com"
    name    = "primary_origin"
    port    = 443
    use_ssl = true
  }

  # Inject security headers in the deliver phase
  snippet {
    name     = "security-headers"
    type     = "deliver"
    content  = <<-EOT
      # Add security headers to every response
      set resp.http.X-Content-Type-Options = "nosniff";
      set resp.http.X-Frame-Options = "DENY";
      set resp.http.Strict-Transport-Security = "max-age=31536000; includeSubDomains";
      set resp.http.Referrer-Policy = "strict-origin-when-cross-origin";
    EOT
    priority = 100
  }

  # Custom 404 handling
  snippet {
    name     = "custom-error-handling"
    type     = "error"
    content  = <<-EOT
      # Return a custom error page for 404s
      if (obj.status == 404) {
        set obj.http.Content-Type = "text/html";
        synthetic {"<html><body><h1>Page Not Found</h1></body></html>"};
        return(deliver);
      }
    EOT
    priority = 100
  }

  force_destroy = true
}
```

## Edge Dictionaries

Edge dictionaries let you store key-value pairs at the edge for fast lookups:

```hcl
# Create a service with an edge dictionary
resource "fastly_service_vcl" "website" {
  name = "my-website-cdn"

  domain {
    name = "www.example.com"
  }

  backend {
    address = "origin.example.com"
    name    = "primary_origin"
    port    = 443
    use_ssl = true
  }

  # Define the dictionary container
  dictionary {
    name = "redirects"
  }

  # VCL snippet that uses the dictionary for redirects
  snippet {
    name    = "dictionary-redirects"
    type    = "recv"
    content = <<-EOT
      # Look up the request path in the redirects dictionary
      if (table.lookup(redirects, req.url)) {
        error 301 table.lookup(redirects, req.url);
      }
    EOT
    priority = 50
  }

  force_destroy = true
}

# Populate the dictionary with redirect mappings
resource "fastly_service_dictionary_items" "redirects" {
  for_each = {
    for d in fastly_service_vcl.website.dictionary : d.name => d if d.name == "redirects"
  }

  service_id    = fastly_service_vcl.website.id
  dictionary_id = each.value.dictionary_id

  # Key-value pairs for redirects
  items = {
    "/old-page"     = "https://www.example.com/new-page"
    "/legacy-blog"  = "https://www.example.com/blog"
    "/about-us"     = "https://www.example.com/about"
  }
}
```

## Logging Configuration

Send access logs to various destinations:

```hcl
# Add S3 logging to the service
resource "fastly_service_vcl" "website" {
  name = "my-website-cdn"

  domain {
    name = "www.example.com"
  }

  backend {
    address = "origin.example.com"
    name    = "primary_origin"
    port    = 443
    use_ssl = true
  }

  # Log to S3
  logging_s3 {
    name           = "s3-logs"
    bucket_name    = "my-fastly-logs"
    s3_access_key  = var.aws_access_key
    s3_secret_key  = var.aws_secret_key
    path           = "/cdn-logs/"
    period         = 3600
    gzip_level     = 9

    # Custom log format
    format = jsonencode({
      timestamp   = "%%{now}V"
      client_ip   = "%%{req.http.Fastly-Client-IP}V"
      request     = "%%{req.method}V %%{req.url}V"
      status      = "%%{resp.status}V"
      bytes       = "%%{resp.body_bytes_written}V"
      cache_hit   = "%%{if(fastly_info.state ~ \"HIT\", \"true\", \"false\")}V"
    })
    format_version = 2
  }

  force_destroy = true
}
```

## Using Multiple Environments

Manage staging and production services with variables:

```hcl
# variables.tf
variable "environment" {
  type    = string
  default = "staging"
}

variable "domain_map" {
  type = map(string)
  default = {
    staging    = "staging.example.com"
    production = "www.example.com"
  }
}

variable "origin_map" {
  type = map(string)
  default = {
    staging    = "staging-origin.example.com"
    production = "origin.example.com"
  }
}

# main.tf
resource "fastly_service_vcl" "website" {
  # Include environment in the service name
  name = "website-${var.environment}"

  domain {
    name = var.domain_map[var.environment]
  }

  backend {
    address = var.origin_map[var.environment]
    name    = "origin-${var.environment}"
    port    = 443
    use_ssl = true
  }

  force_destroy = true
}
```

## Importing Existing Services

If you already have Fastly services, import them into Terraform:

```bash
# Import an existing service by its ID and active version
terraform import fastly_service_vcl.website xxxxxxxxxxxxxxxxxxxx

# After import, run plan to see if your config matches
terraform plan
```

## Best Practices

**Version your services carefully.** Every change to a Fastly service creates a new version. The Terraform provider handles this automatically, but be aware that each apply creates and activates a new version.

**Use `force_destroy` wisely.** Setting `force_destroy = true` lets Terraform delete services that have active versions. Leave it out in production to prevent accidental deletion.

**Test with staging first.** Use Fastly's staging network or a separate service for testing. Apply changes there before touching production.

**Keep VCL snippets small and focused.** Rather than one giant VCL block, use multiple snippets with different priorities. This makes the configuration easier to maintain and debug.

**Use edge dictionaries for dynamic data.** Redirect maps, feature flags, and rate limits work well as dictionary items because you can update them without deploying a new service version.

## Conclusion

The Fastly Terraform provider gives you full control over your CDN configuration through code. From basic service setup to advanced VCL snippets and edge dictionaries, everything can be version-controlled and reviewed like any other infrastructure. Start with a simple service definition, get comfortable with the deployment flow, and gradually add caching rules, custom VCL, and logging as your needs grow. For more on managing multiple providers in a single project, see our guide on [using multiple provider instances](https://oneuptime.com/blog/post/2026-02-23-how-to-use-multiple-provider-instances-in-a-single-configuration/view).
