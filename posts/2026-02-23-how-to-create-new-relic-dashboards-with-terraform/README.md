# How to Create New Relic Dashboards with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, New Relic, Dashboard, Monitoring, Infrastructure as Code

Description: Learn how to create New Relic dashboards using Terraform to build reproducible, version-controlled observability visualizations with NRQL queries.

---

New Relic dashboards provide customizable views into your application and infrastructure performance. Managing them through Terraform ensures consistency across environments and teams. This guide shows you how to create dashboards with various widget types using NRQL queries.

## Setting Up the Provider

```hcl
terraform {
  required_providers {
    newrelic = {
      source  = "newrelic/newrelic"
      version = "~> 3.0"
    }
  }
}

provider "newrelic" {
  account_id = var.account_id
  api_key    = var.api_key
  region     = "US"
}

variable "account_id" { type = number }
variable "api_key" { type = string; sensitive = true }
```

## Service Overview Dashboard

```hcl
resource "newrelic_one_dashboard" "service_overview" {
  name        = "Service Overview"
  permissions = "public_read_only"

  page {
    name = "Overview"

    # Request throughput
    widget_line {
      title  = "Request Throughput"
      row    = 1
      column = 1
      width  = 6
      height = 3

      nrql_query {
        account_id = var.account_id
        query      = "SELECT rate(count(*), 1 minute) FROM Transaction WHERE appName = 'api-service' TIMESERIES"
      }
    }

    # Error rate
    widget_line {
      title  = "Error Rate (%)"
      row    = 1
      column = 7
      width  = 6
      height = 3

      nrql_query {
        account_id = var.account_id
        query      = "SELECT percentage(count(*), WHERE error IS true) FROM Transaction WHERE appName = 'api-service' TIMESERIES"
      }
    }

    # Response time percentiles
    widget_line {
      title  = "Response Time Percentiles"
      row    = 4
      column = 1
      width  = 6
      height = 3

      nrql_query {
        account_id = var.account_id
        query      = "SELECT percentile(duration, 50, 90, 95, 99) FROM Transaction WHERE appName = 'api-service' TIMESERIES"
      }
    }

    # Apdex score
    widget_billboard {
      title  = "Apdex Score"
      row    = 4
      column = 7
      width  = 3
      height = 3

      nrql_query {
        account_id = var.account_id
        query      = "SELECT apdex(duration, t: 0.5) FROM Transaction WHERE appName = 'api-service'"
      }

      critical = 0.7
      warning  = 0.85
    }

    # Active sessions
    widget_billboard {
      title  = "Active Sessions"
      row    = 4
      column = 10
      width  = 3
      height = 3

      nrql_query {
        account_id = var.account_id
        query      = "SELECT uniqueCount(session) FROM PageView WHERE appName = 'web-frontend' SINCE 5 minutes ago"
      }
    }

    # Top transactions by response time
    widget_bar {
      title  = "Slowest Transactions"
      row    = 7
      column = 1
      width  = 6
      height = 3

      nrql_query {
        account_id = var.account_id
        query      = "SELECT average(duration) FROM Transaction WHERE appName = 'api-service' FACET name LIMIT 10"
      }
    }

    # Error breakdown
    widget_pie {
      title  = "Errors by Type"
      row    = 7
      column = 7
      width  = 6
      height = 3

      nrql_query {
        account_id = var.account_id
        query      = "SELECT count(*) FROM TransactionError WHERE appName = 'api-service' FACET error.class LIMIT 10"
      }
    }

    # Recent deployments marker
    widget_markdown {
      title  = "Dashboard Info"
      row    = 10
      column = 1
      width  = 12
      height = 1
      text   = "This dashboard shows key metrics for the API service. Managed by Terraform."
    }
  }

  page {
    name = "Infrastructure"

    widget_line {
      title  = "CPU Usage by Host"
      row    = 1
      column = 1
      width  = 6
      height = 3

      nrql_query {
        account_id = var.account_id
        query      = "SELECT average(cpuPercent) FROM SystemSample FACET hostname TIMESERIES"
      }
    }

    widget_line {
      title  = "Memory Usage by Host"
      row    = 1
      column = 7
      width  = 6
      height = 3

      nrql_query {
        account_id = var.account_id
        query      = "SELECT average(memoryUsedPercent) FROM SystemSample FACET hostname TIMESERIES"
      }
    }

    widget_table {
      title  = "Host Health Summary"
      row    = 4
      column = 1
      width  = 12
      height = 3

      nrql_query {
        account_id = var.account_id
        query      = "SELECT latest(cpuPercent) AS 'CPU %', latest(memoryUsedPercent) AS 'Memory %', latest(diskUsedPercent) AS 'Disk %' FROM SystemSample FACET hostname"
      }
    }
  }
}
```

## Database Dashboard

```hcl
resource "newrelic_one_dashboard" "database" {
  name = "Database Performance"

  page {
    name = "Queries"

    widget_line {
      title  = "Query Throughput"
      row    = 1
      column = 1
      width  = 6
      height = 3
      nrql_query {
        account_id = var.account_id
        query      = "SELECT rate(count(*), 1 minute) FROM DatabaseQuery TIMESERIES"
      }
    }

    widget_bar {
      title  = "Slowest Queries"
      row    = 1
      column = 7
      width  = 6
      height = 3
      nrql_query {
        account_id = var.account_id
        query      = "SELECT average(duration) FROM DatabaseQuery FACET query LIMIT 10"
      }
    }
  }
}
```

## Best Practices

Organize dashboards with multiple pages for different aspects of your system. Use billboard widgets for key metrics that need immediate visibility. Place the most important metrics at the top of each page. Use consistent time ranges and NRQL patterns across widgets. Include markdown widgets for context and documentation. Set warning and critical thresholds on billboard widgets for visual indicators.

For setting up the alerts that complement your dashboards, see our guide on [New Relic alert policies](https://oneuptime.com/blog/post/2026-02-23-how-to-create-new-relic-alert-policies-with-terraform/view).

## Conclusion

New Relic dashboards managed through Terraform provide consistent, reproducible observability views. By defining dashboards as code with NRQL queries, you ensure that every team has the same high-quality visualizations. The multi-page layout lets you organize information logically, from high-level overviews to detailed deep-dives.
