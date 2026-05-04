# How to Create Datadog Log Pipelines with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Datadog, Log Management, Pipeline, Infrastructure as Code

Description: Learn how to create and manage Datadog log pipelines and processors with OpenTofu to parse, enrich, and route log data at scale.

Datadog log pipelines transform raw log data into structured, searchable events. Managing pipelines as code ensures consistent log parsing across environments and makes pipeline changes reviewable and version-controlled.

## Provider Configuration

```hcl
terraform {
  required_providers {
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.0"
    }
  }
}

provider "datadog" {
  api_key = var.datadog_api_key
  app_key = var.datadog_app_key
}
```

## Creating a Log Pipeline

```hcl
resource "datadog_logs_custom_pipeline" "web_access" {
  name       = "Web Access Logs"
  is_enabled = true

  # Only process logs matching this filter
  filter {
    query = "source:nginx OR source:apache"
  }

  processor {
    grok_parser {
      name       = "Parse access log"
      is_enabled = true
      source     = "message"

      grok {
        support_rules = ""
        match_rules   = "access_log %{ip:network.client.ip} - %{notSpace:http.auth} \\[%{date(\"dd/MMM/yyyy:HH:mm:ss Z\"):date_access}\\] \"%{word:http.method} %{notSpace:http.url} HTTP/%{number:http.version}\" %{integer:http.status_code} %{integer:network.bytes_written}"
      }
    }
  }

  processor {
    category_processor {
      name       = "Categorize HTTP status"
      is_enabled = true
      target     = "http.status_category"

      category {
        name   = "ok"
        filter { query = "@http.status_code:[200 TO 299]" }
      }

      category {
        name   = "redirect"
        filter { query = "@http.status_code:[300 TO 399]" }
      }

      category {
        name   = "error"
        filter { query = "@http.status_code:[400 TO 599]" }
      }
    }
  }

  processor {
    geo_ip_parser {
      name       = "GeoIP Lookup"
      is_enabled = true
      sources    = ["network.client.ip"]
      target     = "network.client.geoip"
    }
  }
}
```

## Adding a Remapper Processor

```hcl
resource "datadog_logs_custom_pipeline" "application" {
  name       = "Application Logs"
  is_enabled = true

  filter {
    query = "service:myapp"
  }

  # Remap log levels to standard Datadog severity
  processor {
    status_remapper {
      name       = "Remap log level"
      is_enabled = true
      sources    = ["level", "severity", "log_level"]
    }
  }

  # Extract the trace ID for APM correlation
  processor {
    trace_id_remapper {
      name       = "Remap trace ID"
      is_enabled = true
      sources    = ["dd.trace_id", "traceId"]
    }
  }

  processor {
    service_remapper {
      name       = "Remap service name"
      is_enabled = true
      sources    = ["app_name", "service_name"]
    }
  }
}
```

## Creating a Custom Index

```hcl
resource "datadog_logs_index" "production" {
  name           = "production"
  retention_days = 15

  filter {
    query = "env:production -source:healthcheck"
  }

  # Exclude high-volume debug logs
  exclusion_filter {
    name       = "exclude-debug"
    is_enabled = true

    filter {
      query       = "status:debug"
      sample_rate = 0.9  # Keep 10% of debug logs
    }
  }
}
```

## Custom Parsing Rules

```hcl
resource "datadog_logs_custom_pipeline" "json_enrichment" {
  name       = "JSON Enrichment"
  is_enabled = true

  filter {
    query = "service:api"
  }

  processor {
    grok_parser {
      name       = "Parse JSON body"
      is_enabled = true
      source     = "message"

      grok {
        support_rules = ""
        match_rules   = "json_rule %{data::json}"
      }
    }
  }

  processor {
    attribute_remapper {
      name                 = "Remap user ID"
      is_enabled           = true
      sources              = ["userId", "user_id"]
      source_type          = "attribute"
      target               = "usr.id"
      target_type          = "attribute"
      preserve_source      = true
      override_on_conflict = false
    }
  }
}
```

## Conclusion

Datadog log pipelines codified in OpenTofu give you version-controlled, reviewable log processing rules. Define grok parsers for structured parsing, category processors for classification, and remappers for normalization. Changes go through code review before reaching production, preventing accidental pipeline breakage.
