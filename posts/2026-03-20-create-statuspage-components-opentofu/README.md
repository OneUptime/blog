# How to Create Statuspage Components with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, StatusPage, Status Page, Incident Communication, Infrastructure as Code

Description: Learn how to manage Atlassian Statuspage components, component groups, and subscribers with OpenTofu for consistent status page configuration.

Statuspage communicates service health to customers during incidents. Managing components in OpenTofu ensures your status page accurately reflects your service architecture and changes are reviewed before going live.

## Provider Configuration

```hcl
terraform {
  required_providers {
    statuspage = {
      source  = "sbecker59/statuspage"
      version = "~> 1.0"
    }
  }
}

provider "statuspage" {
  api_key = var.statuspage_api_key
}
```

## Creating Components

Components are created first; the page must already exist and its ID is passed in via a variable.

```hcl
resource "statuspage_component" "api_v1" {
  page_id     = var.statuspage_page_id
  name        = "REST API v1"
  description = "Public REST API - authentication, data access, and user management"
  status      = "operational"  # operational, under_maintenance, degraded_performance, partial_outage, major_outage
}

resource "statuspage_component" "api_v2" {
  page_id     = var.statuspage_page_id
  name        = "REST API v2"
  description = "Next-generation REST API with enhanced performance"
  status      = "operational"
}

resource "statuspage_component" "webhooks" {
  page_id     = var.statuspage_page_id
  name        = "Webhooks"
  description = "Outbound webhook delivery"
  status      = "operational"
}

resource "statuspage_component" "database" {
  page_id     = var.statuspage_page_id
  name        = "Database"
  description = "Primary database cluster"
  status      = "operational"
}

resource "statuspage_component" "cdn" {
  page_id     = var.statuspage_page_id
  name        = "CDN"
  description = "Content delivery network"
  status      = "operational"
}
```

## Creating Component Groups

Group membership is declared on the group resource via the `components` attribute, which takes a set of component IDs.

```hcl
resource "statuspage_component_group" "api" {
  page_id     = var.statuspage_page_id
  name        = "API Services"
  description = "Public API endpoints"
  components  = [
    statuspage_component.api_v1.id,
    statuspage_component.api_v2.id,
    statuspage_component.webhooks.id,
  ]
}

resource "statuspage_component_group" "infrastructure" {
  page_id     = var.statuspage_page_id
  name        = "Infrastructure"
  description = "Core infrastructure components"
  components  = [
    statuspage_component.database.id,
    statuspage_component.cdn.id,
  ]
}
```

## Creating Components with for_each

```hcl
locals {
  api_components = {
    "REST API"        = "Primary REST API endpoint"
    "GraphQL API"     = "GraphQL query and mutation endpoint"
    "WebSocket API"   = "Real-time WebSocket connections"
    "Webhooks"        = "Outbound webhook delivery"
    "SDK Downloads"   = "Client SDK download service"
  }
}

resource "statuspage_component" "api" {
  for_each = local.api_components

  page_id     = var.statuspage_page_id
  name        = each.key
  description = each.value
  status      = "operational"
}

resource "statuspage_component_group" "api_group" {
  page_id     = var.statuspage_page_id
  name        = "API Services"
  description = "Public API endpoints"
  components  = [for c in statuspage_component.api : c.id]
}
```

## Outputting Component IDs

Component IDs are needed for PagerDuty/Datadog integrations that auto-update status during incidents.

```hcl
output "component_ids" {
  description = "Statuspage component IDs for incident management integrations"
  value = {
    api_v1   = statuspage_component.api_v1.id
    api_v2   = statuspage_component.api_v2.id
    webhooks = statuspage_component.webhooks.id
    database = statuspage_component.database.id
  }
}
```

## Connecting to PagerDuty

```hcl
# Use the component IDs to automatically update status during incidents
resource "pagerduty_extension" "statuspage" {
  name              = "Statuspage Integration"
  extension_schema  = data.pagerduty_extension_schema.statuspage.id
  endpoint_url      = "https://api.statuspage.io/v1/pages/${var.statuspage_page_id}"
  extension_objects = [pagerduty_service.api.id]

  config = jsonencode({
    components = {
      "${pagerduty_service.api.id}" = statuspage_component.api_v1.id
    }
  })
}
```

## Conclusion

Statuspage components managed in OpenTofu keep your status page synchronized with your actual service architecture. As services are added or renamed, update the OpenTofu configuration and apply - keeping the status page accurate. Output component IDs to wire up automatic incident status updates from PagerDuty or Datadog.
