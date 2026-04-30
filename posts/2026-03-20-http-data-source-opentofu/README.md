# How to Use the http Data Source in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Data Source, HTTP, REST API, Infrastructure as Code, DevOps

Description: A guide to using the http data source in OpenTofu to fetch data from HTTP APIs and web endpoints during configuration.

## Introduction

The `http` data source from the http provider makes an HTTP request to a given URL and exposes the response body, headers, and status code as data source attributes. By default, it uses `GET`. It is useful for fetching configuration data from APIs, checking remote resources, or retrieving content that doesn't have a dedicated provider.

## Setting Up the HTTP Provider

```hcl
terraform {
  required_providers {
    http = {
      source  = "hashicorp/http"
      version = "~> 3.3"
    }
  }
}
```

## Basic HTTP Request

```hcl
# Fetch data from a public API

data "http" "ip_info" {
  url = "https://api.ipify.org?format=json"
}

output "public_ip" {
  value = jsondecode(data.http.ip_info.response_body)["ip"]
}
```

## Fetching GitHub Release Information

```hcl
# Get the latest release of a GitHub repository
data "http" "github_release" {
  url = "https://api.github.com/repos/opentofu/opentofu/releases/latest"

  request_headers = {
    Accept = "application/vnd.github+json"
  }
}

locals {
  latest_version = jsondecode(data.http.github_release.response_body)["tag_name"]
}

output "latest_opentofu_version" {
  value = local.latest_version
}
```

## HTTP Request with Headers

```hcl
data "http" "internal_api" {
  url = "https://internal-api.company.com/config/app-settings"

  request_headers = {
    Authorization = "Bearer ${var.api_token}"
    Accept        = "application/json"
    X-API-Version = "v2"
  }
}

locals {
  app_settings = jsondecode(data.http.internal_api.response_body)
}
```

## Using Response Headers

```hcl
data "http" "check_endpoint" {
  url = "https://api.example.com/health"
}

output "response_info" {
  value = {
    status_code   = data.http.check_endpoint.status_code
    content_type  = data.http.check_endpoint.response_headers["Content-Type"]
    body          = data.http.check_endpoint.response_body
  }
}
```

## Fetching AWS IP Range Metadata

```hcl
# Fetch public AWS IP range metadata
data "http" "aws_ip_ranges" {
  url = "https://ip-ranges.amazonaws.com/ip-ranges.json"
}

locals {
  aws_ip_ranges = jsondecode(data.http.aws_ip_ranges.response_body)
  sync_token    = local.aws_ip_ranges["syncToken"]
  create_date   = local.aws_ip_ranges["createDate"]
}
```

## Conditional Response Handling

```hcl
data "http" "feature_flags" {
  url = "https://feature-flags.company.com/api/flags/${var.environment}"

  request_headers = {
    Authorization = "Bearer ${var.ff_token}"
  }
}

locals {
  flags = data.http.feature_flags.status_code == 200 ? (
    jsondecode(data.http.feature_flags.response_body)
  ) : {}

  enable_new_feature = lookup(local.flags, "new_feature", false)
}
```

## Adding Lifecycle Postcondition

```hcl
data "http" "config_api" {
  url = "https://config.company.com/api/v1/settings"

  request_headers = {
    Authorization = "Bearer ${var.config_token}"
  }

  lifecycle {
    postcondition {
      condition     = self.status_code == 200
      error_message = "Config API returned status ${self.status_code}. Expected 200."
    }
  }
}
```

## Retry Configuration

```hcl
data "http" "flaky_api" {
  url = "https://api.example.com/data"

  # Retry settings (provider version 3.3+)
  retry {
    attempts     = 3
    min_delay_ms = 1000
    max_delay_ms = 5000
  }
}
```

## Fetching Remote tfvars

```hcl
# Fetch centralized configuration from a remote .tfvars.json file
data "http" "remote_config" {
  url = "https://config.company.com/environments/${var.environment}/opentofu.tfvars.json"

  request_headers = {
    Authorization = "Bearer ${var.config_token}"
  }
}

locals {
  remote_settings = jsondecode(data.http.remote_config.response_body)
  db_instance_class = local.remote_settings["db_instance_class"]
  instance_type     = local.remote_settings["instance_type"]
}
```

## Validating TLS Certificates

```hcl
data "http" "verify_endpoint" {
  url = "https://api.company.com/health"

  # By default, TLS certificate validation is enforced
  # Do NOT disable unless absolutely necessary
  # insecure = false  # This is the default
}
```

## Caching Considerations

```hcl
# HTTP data sources are read during planning when possible and may be
# deferred until apply when values are unknown or dependencies change.
# OpenTofu does not provide built-in caching for this data source.
# For expensive or rate-limited APIs, consider persisting the response:

# Store results in SSM Parameter Store for downstream consumers
resource "aws_ssm_parameter" "cached_config" {
  name  = "/myapp/remote-config"
  type  = "String"
  value = data.http.remote_config.response_body
}
```

## Conclusion

The `http` data source is a versatile tool for fetching configuration data, checking external APIs, and retrieving remote content. It supports custom headers for authentication, response status validation through postconditions, and retry logic for unreliable endpoints. Since data resources are read during planning when possible and can be deferred until apply in some cases, be mindful of rate limits and latency. For authenticated requests, avoid hardcoding tokens in configuration; use sensitive variables and protect your state and plan files accordingly. The `http` data source works best for read-only configuration lookups from stable, low-latency APIs.
