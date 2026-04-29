# How to Manage Elastic Cloud Resources with OpenTofu - Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Elastic Cloud, Elasticsearch, Infrastructure as Code, Observability

Description: Learn how to provision and manage Elastic Cloud deployments, including Elasticsearch clusters and Kibana instances, using OpenTofu and the official Elastic provider.

## Introduction

Elastic Cloud is the managed service for the Elastic Stack (Elasticsearch, Kibana, APM, and more). Managing Elastic Cloud resources with OpenTofu allows teams to automate deployment creation, configure cluster topologies, and manage access control - all through version-controlled infrastructure code.

## Prerequisites

- OpenTofu installed (v1.6+)
- An Elastic Cloud account
- Elastic Cloud API key

## Provider Configuration

```hcl
terraform {
  required_providers {
    ec = {
      source  = "elastic/ec"
      version = "~> 0.12"
    }
  }
}

provider "ec" {}
```

Set the API key via environment variable:

```bash
export EC_API_KEY="your-elastic-cloud-api-key"
```

## Creating a Deployment

```hcl
data "ec_stack" "latest" {
  version_regex = "latest"
  region        = "us-east-1"
}

resource "ec_deployment" "app_search" {
  name                   = "app-search-production"
  region                 = "us-east-1"
  version                = data.ec_stack.latest.version
  deployment_template_id = "aws-storage-optimized"

  elasticsearch = {
    hot = {
      autoscaling = {}
      size        = "4g"
      zone_count  = 2
    }
    warm = {
      autoscaling = {}
      size        = "2g"
      zone_count  = 1
    }
  }

  kibana = {
    size       = "1g"
    zone_count = 1
  }
}
```

## Configuring Elasticsearch Plugins

```hcl
resource "ec_deployment" "logs" {
  name                   = "logs-cluster"
  region                 = "us-east-1"
  version                = data.ec_stack.latest.version
  deployment_template_id = "aws-general-purpose"

  elasticsearch = {
    hot = {
      autoscaling = {}
      size        = "2g"
      zone_count  = 2
    }

    config = {
      plugins = ["analysis-icu", "analysis-phonetic"]
    }
  }

  kibana = {
    size       = "1g"
    zone_count = 1
  }

  integrations_server = {
    size       = "0.5g"
    zone_count = 1
  }
}
```

## Managing Traffic Filtering

Restrict access to your deployment by IP:

```hcl
resource "ec_deployment_traffic_filter" "office" {
  name   = "office-ip-filter"
  region = "us-east-1"
  type   = "ip"

  rule {
    source = "203.0.113.0/24"
  }

  rule {
    source = "198.51.100.42/32"
  }
}

resource "ec_deployment_traffic_filter_association" "app_search" {
  traffic_filter_id = ec_deployment_traffic_filter.office.id
  deployment_id     = ec_deployment.app_search.id
}
```

## Outputs

```hcl
output "elasticsearch_https_endpoint" {
  value = ec_deployment.app_search.elasticsearch.https_endpoint
}

output "kibana_https_endpoint" {
  value = ec_deployment.app_search.kibana.https_endpoint
}

output "elasticsearch_username" {
  value = ec_deployment.app_search.elasticsearch_username
}

output "elasticsearch_password" {
  value     = ec_deployment.app_search.elasticsearch_password
  sensitive = true
}
```

## Scaling a Deployment

Update the `size` field to scale vertically:

```hcl
elasticsearch = {
  hot = {
    autoscaling = {}
    size        = "8g"  # scaled up from 4g
    zone_count  = 3     # added a zone
  }
}
```

Run `tofu apply` to apply the change. Elastic Cloud applies the resize plan in the background, and highly available deployments are resized without downtime.

## Best Practices

- Use `data.ec_stack.latest` in development but pin versions in production.
- Enable autoscaling for production workloads to handle traffic spikes automatically.
- Restrict deployments with traffic filters to known IP ranges.
- Store the generated Elasticsearch password in a secrets manager immediately after deployment.
- Use separate deployments for logging and application search use cases.

## Conclusion

OpenTofu's Elastic Cloud provider makes it easy to automate the full lifecycle of Elastic Stack deployments. By managing cluster topologies, plugins, and security rules as code, you can ensure consistent, reproducible search and observability infrastructure across all environments.
