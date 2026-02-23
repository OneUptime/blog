# How to Use String Functions for URL Manipulation in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, String Functions, URL Manipulation, Infrastructure as Code, HCL

Description: Learn how to manipulate URLs in Terraform using built-in string functions like replace, split, join, regex, and trimprefix for dynamic endpoint construction.

---

Working with URLs in Terraform is more common than you might expect. You need to construct API endpoints, parse database connection strings, strip protocols from hostnames, and build redirect URIs. Terraform does not have dedicated URL parsing functions, but its string functions handle these tasks well once you know the right combinations.

## Common URL Manipulation Scenarios

Before diving into functions, here are the situations where URL manipulation comes up regularly in Terraform:

- Extracting hostnames from full URLs
- Building endpoint URLs from component parts
- Converting between HTTP and HTTPS
- Removing trailing slashes
- Parsing query parameters from connection strings
- Constructing callback URLs for OAuth configurations

## Extracting the Hostname from a URL

One of the most frequent needs is pulling just the hostname out of a full URL. The `replace` function with a regex pattern handles this:

```hcl
locals {
  # Starting URL
  full_url = "https://api.example.com:8443/v1/resources"

  # Extract just the hostname using replace
  # First, strip the protocol
  without_protocol = replace(local.full_url, "/^https?:\\/\\//", "")

  # Then strip everything after the hostname (port, path, etc.)
  hostname = replace(local.without_protocol, "/[:/?#].*/", "")
}

output "hostname" {
  value = local.hostname
  # Result: "api.example.com"
}
```

You can also use `split` for simpler cases:

```hcl
locals {
  url = "https://api.example.com/v1/resources"

  # Split on "//" to get past the protocol, then split on "/" to isolate the host
  hostname_simple = split("/", split("//", local.url)[1])[0]
}

output "hostname_simple" {
  value = local.hostname_simple
  # Result: "api.example.com"
}
```

## Stripping and Adding Protocols

When working with cloud resources, you often get URLs with protocols that you need to remove, or bare hostnames that need protocols added:

```hcl
locals {
  # Remove protocol prefix
  url_with_https = "https://cdn.example.com"
  bare_host      = trimprefix(trimprefix(local.url_with_https, "https://"), "http://")

  # Add protocol to a bare hostname
  hostname_only = "api.internal.example.com"
  full_endpoint = "https://${local.hostname_only}"

  # Switch from HTTP to HTTPS
  http_url  = "http://legacy.example.com/api"
  https_url = replace(local.http_url, "http://", "https://")
}

output "bare_host" {
  value = local.bare_host
  # Result: "cdn.example.com"
}

output "full_endpoint" {
  value = local.full_endpoint
  # Result: "https://api.internal.example.com"
}

output "https_url" {
  value = local.https_url
  # Result: "https://legacy.example.com/api"
}
```

## Building URLs from Components

When you need to construct URLs dynamically from multiple resource outputs, string interpolation combined with `join` works well:

```hcl
variable "environment" {
  default = "staging"
}

locals {
  # Build a URL from individual components
  protocol = "https"
  subdomain = var.environment == "production" ? "api" : "api-${var.environment}"
  domain    = "example.com"
  port      = var.environment == "production" ? "" : ":8443"
  base_path = "/v2"

  # Construct the full URL
  api_url = "${local.protocol}://${local.subdomain}.${local.domain}${local.port}${local.base_path}"
}

output "api_url" {
  value = local.api_url
  # Result for staging: "https://api-staging.example.com:8443/v2"
  # Result for production: "https://api.example.com/v2"
}
```

## Handling Trailing Slashes

Trailing slashes cause subtle bugs when URLs get concatenated. Use `trimsuffix` to remove them consistently:

```hcl
locals {
  # Some APIs return URLs with trailing slashes, some without
  base_url_messy = "https://api.example.com/v1/"
  path_segment   = "/users/123"

  # Remove trailing slash from base, remove leading slash from path
  base_url_clean = trimsuffix(local.base_url_messy, "/")
  path_clean     = trimprefix(local.path_segment, "/")

  # Join them properly
  full_url = "${local.base_url_clean}/${local.path_clean}"
}

output "full_url" {
  value = local.full_url
  # Result: "https://api.example.com/v1/users/123"
}
```

## Parsing Connection Strings

Database connection strings and other URIs often need to be broken down into components:

```hcl
locals {
  # Parse a PostgreSQL connection string
  connection_string = "postgresql://admin:secretpass@db.example.com:5432/mydb?sslmode=require"

  # Extract the host
  after_at   = split("@", local.connection_string)[1]
  host_port  = split("/", local.after_at)[0]
  db_host    = split(":", local.host_port)[0]
  db_port    = split(":", local.host_port)[1]

  # Extract the database name (without query params)
  path_and_params = split("/", local.after_at)[1]
  db_name         = split("?", local.path_and_params)[0]
}

output "parsed_connection" {
  value = {
    host = local.db_host     # "db.example.com"
    port = local.db_port     # "5432"
    name = local.db_name     # "mydb"
  }
}
```

## Constructing OAuth Callback URLs

OAuth setups need callback URLs that change between environments:

```hcl
variable "environment" {
  type    = string
  default = "staging"
}

variable "app_domain" {
  type    = string
  default = "myapp.example.com"
}

locals {
  # Build environment-specific callback URLs
  env_prefix = var.environment == "production" ? "" : "${var.environment}."
  callback_url = "https://${local.env_prefix}${var.app_domain}/auth/callback"

  # Build multiple redirect URIs for the OAuth client
  redirect_uris = [
    "https://${local.env_prefix}${var.app_domain}/auth/callback",
    "https://${local.env_prefix}${var.app_domain}/auth/silent-refresh",
  ]
}

# Use in an Auth0 client or similar OAuth resource
resource "auth0_client" "app" {
  name = "my-app-${var.environment}"

  callbacks   = local.redirect_uris
  allowed_origins = [
    "https://${local.env_prefix}${var.app_domain}"
  ]
}
```

## URL Encoding Path Segments

When a URL component might contain special characters, use the `urlencode` function:

```hcl
locals {
  # Encode a value that will be used in a URL path or query string
  search_query = "status=active&type=premium"
  encoded_query = urlencode(local.search_query)

  # Build an API URL with the encoded query
  api_search_url = "https://api.example.com/search?q=${local.encoded_query}"
}

output "api_search_url" {
  value = local.api_search_url
  # Result: "https://api.example.com/search?q=status%3Dactive%26type%3Dpremium"
}
```

## Joining Path Segments Safely

When building paths from a list of segments, `join` helps avoid double slashes:

```hcl
locals {
  # Clean up path segments and join them
  segments = ["api", "v2", "users", "profile"]
  path     = join("/", local.segments)

  # Full URL construction
  base = "https://example.com"
  url  = "${local.base}/${local.path}"
}

output "url" {
  value = local.url
  # Result: "https://example.com/api/v2/users/profile"
}
```

## Working with S3 Endpoint URLs

AWS S3 URLs come in multiple formats, and you sometimes need to convert between them:

```hcl
locals {
  # Convert S3 path-style to virtual-hosted-style
  bucket_name = "my-assets"
  region      = "us-east-1"
  object_key  = "images/logo.png"

  # Path-style URL
  s3_path_url = "https://s3.${local.region}.amazonaws.com/${local.bucket_name}/${local.object_key}"

  # Virtual-hosted-style URL
  s3_vhost_url = "https://${local.bucket_name}.s3.${local.region}.amazonaws.com/${local.object_key}"

  # S3 URI format
  s3_uri = "s3://${local.bucket_name}/${local.object_key}"
}

output "s3_urls" {
  value = {
    path_style    = local.s3_path_url
    vhost_style   = local.s3_vhost_url
    s3_uri        = local.s3_uri
  }
}
```

## Extracting Domain Parts

Sometimes you need to work with specific parts of a domain name:

```hcl
locals {
  fqdn = "api.us-east.staging.example.com"

  # Split the domain into parts
  domain_parts = split(".", local.fqdn)

  # Get the subdomain (first part)
  subdomain = local.domain_parts[0]

  # Get the root domain (last two parts)
  root_domain = join(".", slice(local.domain_parts, length(local.domain_parts) - 2, length(local.domain_parts)))

  # Get everything except the root domain
  subdomain_full = join(".", slice(local.domain_parts, 0, length(local.domain_parts) - 2))
}

output "domain_parts" {
  value = {
    subdomain      = local.subdomain        # "api"
    root_domain    = local.root_domain       # "example.com"
    subdomain_full = local.subdomain_full    # "api.us-east.staging"
  }
}
```

## Summary

URL manipulation in Terraform relies on combining basic string functions creatively. The key functions are `split` and `join` for breaking apart and reassembling URLs, `replace` for pattern-based transformations, `trimprefix` and `trimsuffix` for cleaning up protocols and slashes, and `urlencode` for safe query parameter handling. While Terraform does not offer a dedicated URL parser, these functions cover the vast majority of real-world scenarios you will encounter when building infrastructure.
