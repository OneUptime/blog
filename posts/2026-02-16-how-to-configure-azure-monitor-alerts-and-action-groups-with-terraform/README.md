# How to Configure Azure Monitor Alerts and Action Groups with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Azure, Monitoring, Alerts, Action Groups, IaC, Observability

Description: Set up Azure Monitor metric alerts, log alerts, and action groups using Terraform for proactive infrastructure monitoring and incident response.

---

Monitoring without alerting is just watching. You need alerts that notify the right people when something goes wrong - high CPU on your VMs, failed requests on your App Service, or a storage account approaching its capacity limit. Azure Monitor provides metric alerts, log-based alerts, and activity log alerts. Action groups define who gets notified and how.

Setting all of this up through the portal is click-heavy and does not scale across environments. Terraform lets you define your entire alerting configuration as code, version it, and deploy it consistently.

## Setting Up Action Groups

Action groups are the notification targets. They define email recipients, SMS numbers, webhook endpoints, and integrations with tools like PagerDuty or ServiceNow. You typically create a few action groups and reuse them across multiple alerts.

```hcl
# Action group for critical alerts - pages the on-call team
resource "azurerm_monitor_action_group" "critical" {
  name                = "ag-critical-alerts"
  resource_group_name = azurerm_resource_group.monitoring.name
  short_name          = "critical"
  enabled             = true

  # Email notification to the ops team distribution list
  email_receiver {
    name                    = "ops-team"
    email_address           = "ops-team@company.com"
    use_common_alert_schema = true
  }

  # SMS to the on-call engineer
  sms_receiver {
    name         = "oncall-sms"
    country_code = "1"
    phone_number = "5551234567"
  }

  # Webhook to PagerDuty for incident creation
  webhook_receiver {
    name                    = "pagerduty"
    service_uri             = var.pagerduty_webhook_url
    use_common_alert_schema = true
  }
}

# Action group for warnings - emails only, no paging
resource "azurerm_monitor_action_group" "warning" {
  name                = "ag-warning-alerts"
  resource_group_name = azurerm_resource_group.monitoring.name
  short_name          = "warning"
  enabled             = true

  email_receiver {
    name                    = "ops-team"
    email_address           = "ops-team@company.com"
    use_common_alert_schema = true
  }

  email_receiver {
    name                    = "dev-team"
    email_address           = "dev-team@company.com"
    use_common_alert_schema = true
  }
}

# Action group for informational alerts - just logs to a webhook
resource "azurerm_monitor_action_group" "info" {
  name                = "ag-info-alerts"
  resource_group_name = azurerm_resource_group.monitoring.name
  short_name          = "info"
  enabled             = true

  webhook_receiver {
    name                    = "slack-webhook"
    service_uri             = var.slack_webhook_url
    use_common_alert_schema = true
  }
}
```

## Metric Alerts

Metric alerts fire when a metric crosses a threshold. They are the most common alert type for infrastructure monitoring.

### CPU Alert for Virtual Machines

```hcl
# Alert when VM CPU exceeds 90% for 5 minutes
resource "azurerm_monitor_metric_alert" "vm_high_cpu" {
  name                = "alert-vm-high-cpu"
  resource_group_name = azurerm_resource_group.monitoring.name
  scopes              = [azurerm_linux_virtual_machine.app.id]
  description         = "VM CPU utilization is above 90% for 5 minutes"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"
  enabled             = true

  criteria {
    metric_namespace = "Microsoft.Compute/virtualMachines"
    metric_name      = "Percentage CPU"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 90
  }

  action {
    action_group_id = azurerm_monitor_action_group.critical.id
  }
}
```

### App Service Response Time and Error Rate

```hcl
# Alert when App Service response time exceeds 3 seconds
resource "azurerm_monitor_metric_alert" "app_slow_response" {
  name                = "alert-app-slow-response"
  resource_group_name = azurerm_resource_group.monitoring.name
  scopes              = [azurerm_linux_web_app.api.id]
  description         = "API response time exceeds 3 seconds"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "HttpResponseTime"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 3
  }

  action {
    action_group_id = azurerm_monitor_action_group.warning.id
  }
}

# Alert when HTTP 5xx errors exceed 10 in 5 minutes
resource "azurerm_monitor_metric_alert" "app_server_errors" {
  name                = "alert-app-server-errors"
  resource_group_name = azurerm_resource_group.monitoring.name
  scopes              = [azurerm_linux_web_app.api.id]
  description         = "API is returning HTTP 5xx errors"
  severity            = 1
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "Http5xx"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 10
  }

  action {
    action_group_id = azurerm_monitor_action_group.critical.id
  }
}
```

### Database DTU Alerts

```hcl
# Alert when SQL Database DTU usage exceeds 80%
resource "azurerm_monitor_metric_alert" "sql_high_dtu" {
  name                = "alert-sql-high-dtu"
  resource_group_name = azurerm_resource_group.monitoring.name
  scopes              = [azurerm_mssql_database.main.id]
  description         = "SQL Database DTU consumption above 80%"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.Sql/servers/databases"
    metric_name      = "dtu_consumption_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.warning.id
  }
}
```

## Dynamic Threshold Alerts

Instead of fixed thresholds, dynamic alerts use machine learning to establish baselines and alert on anomalies.

```hcl
# Dynamic alert on request count - detects unusual spikes or drops
resource "azurerm_monitor_metric_alert" "app_request_anomaly" {
  name                = "alert-app-request-anomaly"
  resource_group_name = azurerm_resource_group.monitoring.name
  scopes              = [azurerm_linux_web_app.api.id]
  description         = "Unusual request volume detected"
  severity            = 3
  frequency           = "PT5M"
  window_size         = "PT15M"

  dynamic_criteria {
    metric_namespace  = "Microsoft.Web/sites"
    metric_name       = "Requests"
    aggregation       = "Total"
    operator          = "GreaterOrLessThan"
    alert_sensitivity = "Medium"
  }

  action {
    action_group_id = azurerm_monitor_action_group.warning.id
  }
}
```

Dynamic thresholds are good for metrics where you do not know a reasonable fixed threshold, or where the normal baseline varies by time of day.

## Log-Based Alerts

Log alerts query Log Analytics and fire when the query returns results matching your criteria.

```hcl
# Alert when error logs exceed a threshold
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "app_errors" {
  name                = "alert-app-error-logs"
  resource_group_name = azurerm_resource_group.monitoring.name
  location            = azurerm_resource_group.monitoring.location
  description         = "Application error rate exceeds threshold"
  severity            = 2
  enabled             = true

  scopes                    = [azurerm_log_analytics_workspace.central.id]
  evaluation_frequency      = "PT5M"
  window_duration           = "PT10M"
  target_resource_types     = ["Microsoft.OperationalInsights/workspaces"]

  criteria {
    query = <<-QUERY
      AppServiceHTTPLogs
      | where ScStatus >= 500
      | summarize ErrorCount = count() by bin(TimeGenerated, 5m)
    QUERY

    time_aggregation_method = "Total"
    operator                = "GreaterThan"
    threshold               = 50
    metric_measure_column   = "ErrorCount"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.critical.id]
  }
}
```

## Creating Alerts at Scale with for_each

When you need the same type of alert across multiple resources, use `for_each`.

```hcl
# Define alert configurations for multiple App Services
locals {
  app_services = {
    api = {
      id          = azurerm_linux_web_app.api.id
      threshold   = 3
      severity    = 1
    }
    web = {
      id          = azurerm_linux_web_app.web.id
      threshold   = 5
      severity    = 2
    }
    admin = {
      id          = azurerm_linux_web_app.admin.id
      threshold   = 5
      severity    = 3
    }
  }
}

# Create response time alerts for all App Services
resource "azurerm_monitor_metric_alert" "response_time" {
  for_each = local.app_services

  name                = "alert-${each.key}-response-time"
  resource_group_name = azurerm_resource_group.monitoring.name
  scopes              = [each.value.id]
  description         = "Response time alert for ${each.key}"
  severity            = each.value.severity
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "HttpResponseTime"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = each.value.threshold
  }

  action {
    action_group_id = azurerm_monitor_action_group.warning.id
  }
}
```

## Best Practices

Use severity levels consistently. Severity 0 and 1 should page someone. Severity 2 and 3 should send emails. Severity 4 is informational. Stick to this convention so people know what to expect when they see an alert.

Avoid alert fatigue. Too many alerts train people to ignore them. Start with a few critical alerts and add more based on actual incidents.

Set appropriate evaluation windows. A 1-minute window on a metric that fluctuates naturally will cause flapping. Use 5 or 15-minute windows for most alerts.

Test your action groups. Create a test alert that fires immediately and verify that emails, SMS, and webhooks all work.

## Conclusion

Terraform makes it straightforward to define a comprehensive alerting strategy as code. From metric alerts on VMs and databases to log-based alerts from Log Analytics, everything can be versioned, reviewed, and deployed consistently across environments. The combination of action groups for notification routing and `for_each` for scaling alerts across resources gives you a maintainable alerting setup that grows with your infrastructure.
