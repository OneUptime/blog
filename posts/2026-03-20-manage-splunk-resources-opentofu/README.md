# How to Manage Splunk Resources with OpenTofu - Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Splunk, SIEM, Log Management, Infrastructure as Code

Description: Learn how to manage Splunk indexes, saved searches, dashboards, and data inputs using OpenTofu and the official Splunk provider.

## Introduction

Splunk is a powerful platform for searching, monitoring, and analyzing machine-generated data. Managing Splunk Enterprise configurations with OpenTofu enables consistent, version-controlled deployments of indexes, alerts, and dashboards across Splunk environments.

## Prerequisites

- OpenTofu installed (v1.6+)
- Access to a Splunk Enterprise instance
- Splunk admin credentials, or an auth token if your deployment supports token-based authentication

## Provider Configuration

```hcl
terraform {
  required_providers {
    splunk = {
      source  = "splunk/splunk"
      version = "~> 1.5"
    }
  }
}

provider "splunk" {
  url                  = "https://splunk.example.com:8089"
  username             = var.splunk_username
  password             = var.splunk_password
  insecure_skip_verify = false
}
```

## Creating Indexes

```hcl
resource "splunk_indexes" "app_logs" {
  name                   = "app-logs"
  max_hot_buckets        = 10
  max_data_size          = "auto"
  frozen_time_period_in_secs = 7776000  # 90 days
  home_path              = "$SPLUNK_DB/app-logs/db"
  cold_path              = "$SPLUNK_DB/app-logs/colddb"
  thawed_path            = "$SPLUNK_DB/app-logs/thaweddb"
}

resource "splunk_indexes" "security_logs" {
  name                       = "security-logs"
  max_hot_buckets            = 6
  frozen_time_period_in_secs = 31536000  # 1 year (compliance)
  home_path                  = "$SPLUNK_DB/security-logs/db"
  cold_path                  = "$SPLUNK_DB/security-logs/colddb"
  thawed_path                = "$SPLUNK_DB/security-logs/thaweddb"
}
```

## Saved Searches and Alerts

```hcl
resource "splunk_saved_searches" "high_error_rate" {
  name   = "High Error Rate Alert"
  search = "index=app-logs level=ERROR | stats count by host | where count > 100"

  cron_schedule = "*/5 * * * *"
  is_scheduled  = true
  is_visible    = true

  dispatch_earliest_time = "-5m"
  dispatch_latest_time   = "now"

  alert_type              = "number of events"
  alert_comparator        = "greater than"
  alert_threshold         = "0"
  alert_digest_mode       = false
  alert_expires           = "24h"

  actions = "email"
  action_email_to         = "ops-team@example.com"
  action_email_subject    = "High Error Rate Detected"
  action_email_message_alert = "High error rate detected on $result.host$"

  acl {
    app   = "search"
    owner = "admin"
    sharing = "app"
  }
}
```

## HTTP Event Collector (HEC) Tokens

```hcl
resource "splunk_global_http_event_collector" "http" {
  disabled   = false
  enable_ssl = true
  port       = 8088
}

resource "splunk_inputs_http_event_collector" "app" {
  name     = "app-hec-token"
  index    = splunk_indexes.app_logs.name
  indexes  = [splunk_indexes.app_logs.name]
  source   = "http:app"
  sourcetype = "json"
  disabled = false

  acl {
    app     = "launcher"
    owner   = "admin"
    sharing = "global"
  }

  depends_on = [
    splunk_global_http_event_collector.http
  ]
}

output "hec_token" {
  value     = splunk_inputs_http_event_collector.app.token
  sensitive = true
}
```

## Data Inputs (Monitor)

```hcl
resource "splunk_inputs_monitor" "nginx_access" {
  name       = "/var/log/nginx/access.log"
  index      = splunk_indexes.app_logs.name
  sourcetype = "nginx_combined"
  disabled   = false
  recursive  = false

  acl {
    app     = "search"
    owner   = "admin"
    sharing = "global"
  }
}
```

## User and Role Management

```hcl
resource "splunk_authorization_roles" "analyst" {
  name                     = "analyst"
  default_app              = "search"
  imported_roles           = ["user"]
  capabilities             = ["search", "schedule_search"]
  search_indexes_allowed   = [splunk_indexes.app_logs.name]
  search_indexes_default   = [splunk_indexes.app_logs.name]
}

resource "splunk_admin_saml_groups" "ops" {
  name  = "ops-team"
  roles = ["analyst", "power"]
}
```

## Best Practices

- Use separate indexes for different data types to optimize storage and access control.
- Set appropriate `frozen_time_period_in_secs` based on compliance and retention requirements.
- Store HEC tokens in a secrets manager; never hardcode them.
- Use SAML group mappings for role assignments rather than managing individual users.
- Use scheduled saved searches sparingly - favor summary indexes for high-volume data.

## Conclusion

OpenTofu enables systematic management of Splunk Enterprise configurations including indexes, alerts, and data inputs. By treating your Splunk setup as infrastructure code, you can maintain consistency across environments, review changes through pull requests, and quickly recover from misconfigurations.
