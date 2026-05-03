# How to Manage Datadog Log Pipelines with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Datadog, Infrastructure as Code, Log Pipeline, Log Processing, Observability

Description: Learn how to configure and manage Datadog log processing pipelines with parsers, processors, and filters using OpenTofu.

## Introduction

Datadog log pipelines parse, enrich, and filter incoming logs before they are indexed. Managing pipelines as code with OpenTofu ensures consistent log processing configurations across environments and enables change review via pull requests.

## Prerequisites

- OpenTofu v1.6+
- Datadog API key and Application key with `logs_write_pipelines` permission
- The `DataDog/datadog` OpenTofu provider

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.39"
    }
  }
}

provider "datadog" {
  api_key = var.datadog_api_key
  app_key = var.datadog_app_key
}
```

## Create a Log Processing Pipeline

```hcl
# log_pipelines.tf

resource "datadog_logs_custom_pipeline" "nginx" {
  name       = "Nginx Access Logs"
  is_enabled = true
  filter {
    query = "source:nginx"
  }

  processor {
    grok_parser {
      name       = "Parse Nginx access log"
      is_enabled = true
      source     = "message"
      grok {
        support_rules = ""
        match_rules   = "access_log %{ip:network.client.ip} - - \\[%{date(\"dd/MMM/yyyy:HH:mm:ss Z\"):date_access}\\] \"%{word:http.method} %{notSpace:http.url} HTTP/%{number:http.version}\" %{integer:http.status_code} %{integer:network.bytes_written}"
      }
    }
  }

  processor {
    status_remapper {
      name       = "Define status from HTTP status code"
      is_enabled = true
      sources    = ["http.status_code"]
    }
  }

  processor {
    url_parser {
      name              = "Parse request URL"
      is_enabled        = true
      sources           = ["http.url"]
      target            = "http.url_details"
      normalize_ending_slashes = false
    }
  }
}
```

## Create a Log Processing Pipeline with Category Processor

```hcl
resource "datadog_logs_custom_pipeline" "app_logs" {
  name       = "Application Logs"
  is_enabled = true

  filter {
    query = "service:myapp"
  }

  # Remap the log level to Datadog's reserved status field
  processor {
    status_remapper {
      name       = "Remap log level to status"
      is_enabled = true
      sources    = ["level", "log_level", "severity"]
    }
  }

  # Categorize HTTP status codes
  processor {
    category_processor {
      name       = "Categorize HTTP responses"
      is_enabled = true
      target     = "http.response_category"

      category {
        filter { query = "@http.status_code:[200 TO 299]" }
        name = "success"
      }
      category {
        filter { query = "@http.status_code:[400 TO 499]" }
        name = "client_error"
      }
      category {
        filter { query = "@http.status_code:[500 TO 599]" }
        name = "server_error"
      }
    }
  }

  # Add the environment tag
  processor {
    string_builder_processor {
      name              = "Set environment tag"
      is_enabled        = true
      template          = "%{env}"
      target            = "environment"
      is_replace_missing = true
    }
  }
}
```

## Log Index with Exclusion Filter

```hcl
resource "datadog_logs_index" "main" {
  name           = "main"
  daily_limit    = 150000000

  retention_days = 15

  # Required: defines which logs flow into this index
  filter {
    query = "*"
  }

  # Exclude health check logs from being indexed
  exclusion_filter {
    name       = "Exclude health checks"
    is_enabled = true
    filter {
      query       = "service:myapp @http.url_details.path:\"/health\""
      sample_rate = 1.0  # Exclude 100% of matching logs
    }
  }
}
```

## Deploy

```bash
export DD_API_KEY="your-datadog-api-key"
export DD_APP_KEY="your-datadog-app-key"

tofu init
tofu validate
tofu apply
```

## Conclusion

Datadog log pipelines managed with OpenTofu provide reproducible, reviewable log processing configurations. Use `grok_parser` for unstructured log parsing, `status_remapper` to normalize log levels, and `category_processor` to add business-context tags. Define exclusion filters on log indexes to reduce indexing costs for high-volume, low-value logs like health checks. Changes to pipeline configuration are visible in Git history, making debugging log processing issues easier.
