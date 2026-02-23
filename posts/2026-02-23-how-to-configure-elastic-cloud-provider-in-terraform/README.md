# How to Configure Elastic Cloud Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Providers, Elastic Cloud, Elasticsearch, Observability, Infrastructure as Code

Description: Learn how to configure the Elastic Cloud provider in Terraform to manage Elasticsearch deployments, Kibana, and observability resources as code.

---

Elastic Cloud is the managed service for running Elasticsearch, Kibana, and the rest of the Elastic Stack. When you are running multiple deployments across environments, managing them through the Elastic Cloud console becomes repetitive. The Elastic Cloud Terraform provider (also known as the Elastic Cloud Enterprise/ECE provider) lets you define your deployments as code, making it easy to create consistent environments and track changes.

This guide covers setting up the provider, creating deployments, configuring resources, and managing your Elastic infrastructure through Terraform.

## Prerequisites

- Terraform 1.0 or later
- An Elastic Cloud account (cloud.elastic.co)
- An Elastic Cloud API key

## Getting Your API Key

1. Log in to cloud.elastic.co
2. Go to the user menu (top right) and select Organization
3. Navigate to API keys
4. Click Create API key
5. Copy the key (it is shown only once)

## Declaring the Provider

```hcl
# versions.tf - Declare the Elastic Cloud provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    ec = {
      source  = "elastic/ec"
      version = "~> 0.9"
    }
  }
}
```

## Provider Configuration

```hcl
# provider.tf - Configure with API key
provider "ec" {
  apikey = var.ec_api_key
}

variable "ec_api_key" {
  type        = string
  sensitive   = true
  description = "Elastic Cloud API key"
}
```

### Environment Variables

```bash
# Set the API key via environment variable
export EC_API_KEY="your-elastic-cloud-api-key"
```

```hcl
# Provider picks up the key from EC_API_KEY
provider "ec" {}
```

### Self-Managed ECE

If you are running Elastic Cloud Enterprise on-premises, specify the endpoint.

```hcl
# Connect to a self-managed ECE installation
provider "ec" {
  endpoint = "https://ece.example.com:12443"
  apikey   = var.ec_api_key
  insecure = true  # For self-signed certificates
}
```

## Getting Deployment Templates

Before creating a deployment, you need to know what templates are available in your region.

```hcl
# Look up available deployment templates
data "ec_stack" "latest" {
  version_regex = "latest"
  region        = "us-east-1"
}

output "latest_stack_version" {
  value = data.ec_stack.latest.version
}
```

## Creating Deployments

### Basic Deployment

```hcl
# Create a basic Elasticsearch deployment
resource "ec_deployment" "production" {
  name                   = "production"
  region                 = "us-east-1"
  version                = data.ec_stack.latest.version
  deployment_template_id = "aws-io-optimized-v2"

  elasticsearch = {
    hot = {
      autoscaling = {}
      size        = "8g"
      zone_count  = 2
    }
  }

  kibana = {
    size       = "1g"
    zone_count = 1
  }
}

# Output the deployment endpoints
output "elasticsearch_endpoint" {
  value = ec_deployment.production.elasticsearch.https_endpoint
}

output "elasticsearch_cloud_id" {
  value = ec_deployment.production.elasticsearch.cloud_id
}

output "kibana_endpoint" {
  value = ec_deployment.production.kibana.https_endpoint
}

# Output the elastic user credentials
output "elasticsearch_username" {
  value = ec_deployment.production.elasticsearch_username
}

output "elasticsearch_password" {
  value     = ec_deployment.production.elasticsearch_password
  sensitive = true
}
```

### Hot-Warm-Cold Architecture

```hcl
# Create a deployment with hot-warm-cold architecture
resource "ec_deployment" "logging" {
  name                   = "logging-cluster"
  region                 = "us-east-1"
  version                = data.ec_stack.latest.version
  deployment_template_id = "aws-hot-warm-v2"

  elasticsearch = {
    # Hot tier for recent data
    hot = {
      size       = "16g"
      zone_count = 2
      autoscaling = {
        max_size = "64g"
      }
    }

    # Warm tier for older data
    warm = {
      size       = "8g"
      zone_count = 2
      autoscaling = {
        max_size = "32g"
      }
    }

    # Cold tier for archive data
    cold = {
      size       = "4g"
      zone_count = 1
      autoscaling = {
        max_size = "16g"
      }
    }
  }

  kibana = {
    size       = "2g"
    zone_count = 1
  }
}
```

### Deployment with APM and Fleet

```hcl
# Full observability deployment with APM
resource "ec_deployment" "observability" {
  name                   = "observability"
  region                 = "us-east-1"
  version                = data.ec_stack.latest.version
  deployment_template_id = "aws-io-optimized-v2"

  elasticsearch = {
    hot = {
      size       = "8g"
      zone_count = 2
      autoscaling = {}
    }
  }

  kibana = {
    size       = "2g"
    zone_count = 1
  }

  integrations_server = {
    size       = "2g"
    zone_count = 1
  }
}
```

## Elasticsearch Keystore

Store sensitive settings in the Elasticsearch keystore.

```hcl
# Add a secret to the Elasticsearch keystore
resource "ec_deployment_elasticsearch_keystore" "s3_key" {
  deployment_id = ec_deployment.production.id
  setting_name  = "s3.client.default.access_key"
  value         = var.aws_access_key
}

resource "ec_deployment_elasticsearch_keystore" "s3_secret" {
  deployment_id = ec_deployment.production.id
  setting_name  = "s3.client.default.secret_key"
  value         = var.aws_secret_key
}
```

## Traffic Filters (IP Restrictions)

```hcl
# Create a traffic filter to restrict access
resource "ec_deployment_traffic_filter" "office" {
  name   = "Office Network"
  region = "us-east-1"
  type   = "ip"

  rule {
    source = "203.0.113.0/24"
    description = "Office IP range"
  }

  rule {
    source = "198.51.100.0/24"
    description = "VPN IP range"
  }
}

# Associate the traffic filter with a deployment
resource "ec_deployment_traffic_filter_association" "production" {
  traffic_filter_id = ec_deployment_traffic_filter.office.id
  deployment_id     = ec_deployment.production.id
}
```

### Private Link Traffic Filter (AWS)

```hcl
# Create a Private Link traffic filter
resource "ec_deployment_traffic_filter" "private_link" {
  name   = "AWS Private Link"
  region = "us-east-1"
  type   = "vpce"

  rule {
    source = var.aws_vpc_endpoint_id
  }
}

resource "ec_deployment_traffic_filter_association" "private" {
  traffic_filter_id = ec_deployment_traffic_filter.private_link.id
  deployment_id     = ec_deployment.production.id
}
```

## Extension Management

```hcl
# Upload a custom plugin or bundle
resource "ec_deployment_extension" "custom_analyzer" {
  name           = "custom-analyzer"
  version        = "*"
  extension_type = "bundle"
  description    = "Custom analysis plugin"

  file_path = "${path.module}/extensions/custom-analyzer.zip"
  file_hash = filebase64sha256("${path.module}/extensions/custom-analyzer.zip")
}
```

## Multiple Environments

```hcl
# Define environments as a map
locals {
  environments = {
    dev = {
      es_size    = "2g"
      zones      = 1
      kibana_size = "1g"
    }
    staging = {
      es_size    = "4g"
      zones      = 2
      kibana_size = "1g"
    }
    production = {
      es_size    = "16g"
      zones      = 2
      kibana_size = "2g"
    }
  }
}

resource "ec_deployment" "env" {
  for_each = local.environments

  name                   = each.key
  region                 = "us-east-1"
  version                = data.ec_stack.latest.version
  deployment_template_id = "aws-io-optimized-v2"

  elasticsearch = {
    hot = {
      size       = each.value.es_size
      zone_count = each.value.zones
      autoscaling = {}
    }
  }

  kibana = {
    size       = each.value.kibana_size
    zone_count = 1
  }
}
```

## Using the Elasticsearch Provider Together

For managing Elasticsearch resources (indices, templates, roles), use the separate Elasticsearch provider.

```hcl
# Use the Elasticsearch provider for index management
provider "elasticstack" {
  elasticsearch {
    endpoints = [ec_deployment.production.elasticsearch.https_endpoint]
    username  = ec_deployment.production.elasticsearch_username
    password  = ec_deployment.production.elasticsearch_password
  }
}

# Create an index lifecycle policy
resource "elasticstack_elasticsearch_index_lifecycle" "logs" {
  name = "logs-policy"

  hot {
    min_age = "0ms"
    rollover {
      max_age  = "1d"
      max_size = "50gb"
    }
  }

  warm {
    min_age = "7d"
  }

  cold {
    min_age = "30d"
  }

  delete {
    min_age = "90d"
  }
}
```

## Data Sources

```hcl
# Look up an existing deployment
data "ec_deployment" "existing" {
  id = "deployment-id-here"
}

# List available regions and templates
data "ec_stack" "v8" {
  version_regex = "8\\..*"
  region        = "us-east-1"
}
```

## Best Practices

1. Use autoscaling wherever possible. It lets Elastic Cloud adjust resources based on actual usage.

2. Apply traffic filters to restrict network access. Do not leave deployments open to the internet unless necessary.

3. Use the hot-warm-cold architecture for logging use cases. It optimizes costs by moving older data to cheaper storage.

4. Store sensitive Elasticsearch settings in the keystore instead of in the deployment configuration.

5. Pin your Elastic Stack version to avoid unexpected upgrades. Use `data.ec_stack` to discover available versions.

6. Use separate deployments for different environments rather than sharing one cluster.

## Wrapping Up

The Elastic Cloud Terraform provider simplifies managing your Elasticsearch deployments as code. From basic single-node setups to multi-tier architectures with hot-warm-cold storage, everything can be defined, versioned, and deployed consistently. Combined with traffic filters for network security and autoscaling for cost optimization, it gives you full control over your Elastic infrastructure.

For monitoring your Elastic deployments alongside your broader infrastructure, [OneUptime](https://oneuptime.com) provides a unified monitoring platform that complements Elastic's own observability tools.
