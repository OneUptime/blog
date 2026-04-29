# How to Manage Splunk Resources with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Splunk, Logging, SIEM, Monitoring

Description: Learn how to manage Splunk indexes, saved searches, alerts, and data inputs using OpenTofu for code-driven Splunk administration.

## Introduction

The Splunk provider for OpenTofu manages Splunk Enterprise configuration including indexes, saved searches, alerts, dashboards, and inputs. Managing Splunk Enterprise as code prevents configuration drift across clustered environments and enables change management for security-critical SIEM configurations.

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

## Index Management

```hcl
resource "splunk_indexes" "app_logs" {
  name              = "app-prod-logs"
  max_hot_buckets   = 10
  max_warm_db_count = 300
  max_total_data_size_mb = 10240

  # Retention settings
  frozen_time_period_in_secs = 7776000  # 90 days

  home_path         = "volume:hot/app-prod-logs/db"
  cold_path         = "volume:cold/app-prod-logs/colddb"
  thawed_path       = "/opt/splunk/var/lib/splunk/app-prod-logs/thaweddb"
}

resource "splunk_indexes" "security_events" {
  name                    = "security-events"
  max_total_data_size_mb  = 51200
  frozen_time_period_in_secs = 31536000  # 1 year for compliance
}
```

## Saved Searches and Alerts

```hcl
resource "splunk_saved_searches" "high_error_rate" {
  name        = "High Application Error Rate"
  search      = "index=app-prod-logs level=ERROR | timechart span=5m count as error_count | where error_count > 100"
  description = "Alert when error count exceeds 100 in 5 minutes"

  # Schedule
  cron_schedule      = "*/5 * * * *"
  is_scheduled       = true
  is_visible         = true
  realtime_schedule  = false

  # Alert configuration
  alert_type         = "number of events"
  alert_comparator   = "greater than"
  alert_threshold    = "0"
  alert_severity     = "3"  # WARN

  # Actions
  action_email_to     = "platform-team@example.com"
  action_email_subject = "HIGH: Application Error Rate Alert"

  # Webhook action
  action_webhook_param_url = "https://hooks.example.com/splunk-alerts"
  actions = "email,webhook"

  dispatch_earliest_time = "rt-5m"
  dispatch_latest_time   = "rt"
}
```

## HTTP Event Collector (HEC) Input

```hcl
resource "splunk_global_http_event_collector" "hec_config" {
  dedicated_io_threads    = 2
  disabled                = false
  enable_ssl              = true
  max_sockets             = 0
  max_threads             = 0
  port                    = 8088
}

resource "splunk_inputs_http_event_collector" "app_input" {
  name       = "app-prod-token"
  disabled   = false
  index      = splunk_indexes.app_logs.name
  indexes    = [splunk_indexes.app_logs.name]
  source     = "app-server"
  sourcetype = "json"

  token = var.hec_token  # Pre-generated or managed externally
}
```

## User and Role Management

```hcl
resource "splunk_authorization_roles" "app_team" {
  name                     = "app-team"
  default_app              = "search"
  imported_roles           = ["user"]
  capabilities             = ["search"]
  search_indexes_allowed   = [splunk_indexes.app_logs.name]
  search_indexes_default   = [splunk_indexes.app_logs.name]
}

resource "splunk_admin_saml_groups" "engineering_saml" {
  name  = "Engineering"
  roles = [splunk_authorization_roles.app_team.name]
}
```

## File Monitoring Input

```hcl
resource "splunk_inputs_monitor" "app_log_file" {
  name        = "/var/log/app/*.log"
  index       = splunk_indexes.app_logs.name
  sourcetype  = "app_log"
  recursive   = false
  follow_tail = false
}
```

## Conclusion

Managing Splunk configuration with OpenTofu prevents the index sprawl and saved search inconsistencies common in manually administered Splunk environments. Critical SIEM searches and alert configurations benefit from peer review through pull requests, and index retention settings are consistently applied rather than relying on operators remembering to set them. Use the module pattern to create standardized index configurations for different application tiers.
