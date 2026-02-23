# How to Create Azure Application Insights in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Application Insights, Monitoring, APM, Infrastructure as Code

Description: Step-by-step guide to provisioning Azure Application Insights with Terraform, including workspace-based setup, availability tests, and smart detection rules.

---

Application Insights is Azure's application performance management (APM) service. It helps you understand how your applications are performing, where they are failing, and what your users are actually doing. Whether you are running a .NET API, a Node.js web app, or a Java microservice, Application Insights gives you deep visibility into request rates, response times, failure rates, dependency calls, and exceptions.

Provisioning Application Insights through Terraform means every environment - dev, staging, production - gets the same monitoring configuration. No more manually clicking through the portal and hoping you remembered all the settings.

## Classic vs Workspace-Based Application Insights

There are two flavors of Application Insights: classic and workspace-based. Classic resources store data in their own internal storage, while workspace-based resources forward everything to a Log Analytics workspace. Microsoft has been pushing workspace-based as the default since 2020, and new features only land there. Always use workspace-based for new deployments.

## Prerequisites

- Terraform 1.3+
- Azure subscription with Contributor access
- Azure CLI authenticated

## Provider Setup

```hcl
# main.tf
terraform {
  required_version = ">= 1.3.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {}
}
```

## Creating a Workspace-Based Application Insights Resource

```hcl
# Resource group for monitoring resources
resource "azurerm_resource_group" "monitoring" {
  name     = "rg-monitoring-prod"
  location = "eastus"

  tags = {
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}

# Log Analytics workspace (required for workspace-based App Insights)
resource "azurerm_log_analytics_workspace" "main" {
  name                = "law-prod-eastus-001"
  location            = azurerm_resource_group.monitoring.location
  resource_group_name = azurerm_resource_group.monitoring.name
  sku                 = "PerGB2018"
  retention_in_days   = 90

  tags = {
    Environment = "Production"
  }
}

# Create workspace-based Application Insights
resource "azurerm_application_insights" "main" {
  name                = "appi-webapp-prod-001"
  location            = azurerm_resource_group.monitoring.location
  resource_group_name = azurerm_resource_group.monitoring.name
  workspace_id        = azurerm_log_analytics_workspace.main.id

  # Application type affects the default dashboards and experiences
  # Options: web, ios, java, MobileCenter, Node.JS, other, phone, store
  application_type = "web"

  # Daily data cap in GB (0 means no cap)
  daily_data_cap_in_gb = 5

  # Notify when the daily cap is hit
  daily_data_cap_notifications_disabled = false

  # Sampling percentage (100 = no sampling, collect everything)
  sampling_percentage = 100

  # Disable IP masking if you need full IP addresses for geolocation
  disable_ip_masking = false

  # Retention is controlled by the linked Log Analytics workspace
  # but you can set a shorter retention here
  retention_in_days = 90

  tags = {
    Environment = "Production"
    Application = "WebApp"
  }
}
```

## Outputting the Instrumentation Key and Connection String

Your application needs either the instrumentation key or (preferably) the connection string to send telemetry:

```hcl
# Output the connection string for application configuration
output "app_insights_connection_string" {
  description = "Application Insights connection string"
  value       = azurerm_application_insights.main.connection_string
  sensitive   = true
}

output "app_insights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = azurerm_application_insights.main.instrumentation_key
  sensitive   = true
}

output "app_insights_app_id" {
  description = "Application Insights App ID (for API queries)"
  value       = azurerm_application_insights.main.app_id
}
```

## Storing the Connection String in Key Vault

A common pattern is to store the connection string in Azure Key Vault so your applications can retrieve it securely:

```hcl
data "azurerm_client_config" "current" {}

# Key Vault for storing secrets
resource "azurerm_key_vault" "main" {
  name                = "kv-monitoring-prod-01"
  location            = azurerm_resource_group.monitoring.location
  resource_group_name = azurerm_resource_group.monitoring.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  # Allow the current deployment identity to manage secrets
  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    secret_permissions = [
      "Get", "List", "Set", "Delete", "Purge"
    ]
  }
}

# Store the connection string as a secret
resource "azurerm_key_vault_secret" "app_insights_connection_string" {
  name         = "app-insights-connection-string"
  value        = azurerm_application_insights.main.connection_string
  key_vault_id = azurerm_key_vault.main.id

  tags = {
    ManagedBy = "Terraform"
  }
}
```

## Setting Up Availability Tests

Availability tests (formerly web tests) let you monitor your application's uptime from multiple locations around the world:

```hcl
# Standard availability test - pings a URL from multiple locations
resource "azurerm_application_insights_standard_web_test" "homepage" {
  name                    = "webtest-homepage-ping"
  location                = azurerm_resource_group.monitoring.location
  resource_group_name     = azurerm_resource_group.monitoring.name
  application_insights_id = azurerm_application_insights.main.id

  # How often to run the test (in seconds)
  frequency = 300

  # How long to wait before marking as timeout (in seconds)
  timeout = 30

  # Test from these locations
  geo_locations = [
    "us-tx-sn1-azr",  # South Central US
    "us-il-ch1-azr",  # North Central US
    "emea-gb-db3-azr", # UK South
    "emea-nl-ams-azr", # West Europe
    "apac-hk-hkn-azr"  # East Asia
  ]

  enabled = true

  request {
    url = "https://myapp.example.com/health"

    # Add custom headers if needed
    header {
      name  = "Accept"
      value = "application/json"
    }
  }

  # Validate the response
  validation_rules {
    expected_status_code = 200

    content {
      content_match      = "healthy"
      ignore_case        = true
      pass_if_text_found = true
    }

    ssl_check_enabled           = true
    ssl_cert_remaining_lifetime = 30
  }

  tags = {
    Environment = "Production"
  }
}
```

## Creating Alerts Based on Application Insights Data

You can create metric alerts that trigger based on App Insights telemetry:

```hcl
# Action group for notifications
resource "azurerm_monitor_action_group" "ops_team" {
  name                = "ag-ops-team"
  resource_group_name = azurerm_resource_group.monitoring.name
  short_name          = "OpsTeam"

  email_receiver {
    name          = "ops-email"
    email_address = "ops@example.com"
  }
}

# Alert when server response time exceeds threshold
resource "azurerm_monitor_metric_alert" "response_time" {
  name                = "alert-high-response-time"
  resource_group_name = azurerm_resource_group.monitoring.name
  scopes              = [azurerm_application_insights.main.id]
  description         = "Alert when average server response time exceeds 3 seconds"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "microsoft.insights/components"
    metric_name      = "requests/duration"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 3000 # milliseconds
  }

  action {
    action_group_id = azurerm_monitor_action_group.ops_team.id
  }
}

# Alert on high failure rate
resource "azurerm_monitor_metric_alert" "failure_rate" {
  name                = "alert-high-failure-rate"
  resource_group_name = azurerm_resource_group.monitoring.name
  scopes              = [azurerm_application_insights.main.id]
  description         = "Alert when request failure rate exceeds 5%"
  severity            = 1
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "microsoft.insights/components"
    metric_name      = "requests/failed"
    aggregation      = "Count"
    operator         = "GreaterThan"
    threshold        = 50
  }

  action {
    action_group_id = azurerm_monitor_action_group.ops_team.id
  }
}
```

## Smart Detection Rules

Application Insights includes built-in anomaly detection. You can configure the notification settings through Terraform:

```hcl
# Configure smart detection for slow server response time
resource "azurerm_application_insights_smart_detection_rule" "slow_response" {
  name                    = "Slow server response time"
  application_insights_id = azurerm_application_insights.main.id
  enabled                 = true
  send_emails_to_subscription_owners = true
  additional_email_recipients        = ["dev-lead@example.com"]
}

# Configure smart detection for degradation in dependency duration
resource "azurerm_application_insights_smart_detection_rule" "dependency_degradation" {
  name                    = "Degradation in dependency duration"
  application_insights_id = azurerm_application_insights.main.id
  enabled                 = true
  send_emails_to_subscription_owners = false
  additional_email_recipients        = ["ops@example.com"]
}
```

## Multiple Environments with a Module

When you need App Insights for multiple applications or environments, wrap it in a module:

```hcl
# modules/app-insights/variables.tf
variable "name" {
  description = "Name of the Application Insights resource"
  type        = string
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "workspace_id" {
  description = "Log Analytics workspace ID"
  type        = string
}

variable "application_type" {
  type    = string
  default = "web"
}

variable "daily_cap_gb" {
  type    = number
  default = 5
}

variable "tags" {
  type    = map(string)
  default = {}
}
```

```hcl
# modules/app-insights/main.tf
resource "azurerm_application_insights" "this" {
  name                = var.name
  location            = var.location
  resource_group_name = var.resource_group_name
  workspace_id        = var.workspace_id
  application_type    = var.application_type

  daily_data_cap_in_gb                  = var.daily_cap_gb
  daily_data_cap_notifications_disabled = false

  tags = var.tags
}
```

```hcl
# Root module usage - deploy App Insights for each service
module "app_insights_api" {
  source              = "./modules/app-insights"
  name                = "appi-api-prod"
  resource_group_name = azurerm_resource_group.monitoring.name
  location            = azurerm_resource_group.monitoring.location
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"
  daily_cap_gb        = 10

  tags = {
    Service     = "API"
    Environment = "Production"
  }
}

module "app_insights_frontend" {
  source              = "./modules/app-insights"
  name                = "appi-frontend-prod"
  resource_group_name = azurerm_resource_group.monitoring.name
  location            = azurerm_resource_group.monitoring.location
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"
  daily_cap_gb        = 3

  tags = {
    Service     = "Frontend"
    Environment = "Production"
  }
}
```

## Best Practices

**Always use workspace-based resources.** Classic Application Insights is on a deprecation path. Workspace-based resources give you unified querying across App Insights and infrastructure logs in the same Log Analytics workspace.

**Use connection strings over instrumentation keys.** Connection strings support newer ingestion endpoints and offer better regional flexibility. Microsoft recommends connection strings for all new integrations.

**Set daily caps in non-production environments.** A misconfigured debug logging level can generate massive amounts of telemetry data. Daily caps prevent surprise bills.

**Configure sampling for high-traffic applications.** If your app handles thousands of requests per second, collecting every single trace is unnecessary and expensive. Use adaptive sampling on the SDK side and set a reasonable `sampling_percentage`.

**Separate App Insights per service.** Each microservice or application should have its own Application Insights resource. This keeps the data clean and makes it easier to set up service-specific alerts.

## Conclusion

Application Insights is essential for understanding how your applications behave in production. With Terraform, you can ensure every application gets consistent monitoring from day one - complete with availability tests, alerts, and smart detection. Combined with a Log Analytics workspace, you get a complete observability picture that scales with your infrastructure.

For related monitoring topics, check out [How to Create Azure Log Analytics Workspaces in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-log-analytics-workspaces-in-terraform/view).
