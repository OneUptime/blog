# How to Manage Elastic Cloud Resources with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Elastic Cloud, Elasticsearch, Kibana, Search

Description: Learn how to manage Elastic Cloud deployments, Elasticsearch clusters, and Kibana spaces using OpenTofu for reproducible search infrastructure.

## Introduction

The Elastic Cloud provider for OpenTofu manages Elastic Cloud deployments including Elasticsearch clusters, Kibana instances, Integrations Server, and Enterprise Search. This enables treating your search and observability infrastructure as code.

## Provider Configuration

```hcl
terraform {
  required_providers {
    ec = {
      source  = "elastic/ec"
      version = "~> 0.12"
    }
    elasticstack = {
      source  = "elastic/elasticstack"
      version = "~> 0.14"
    }
  }
}

provider "ec" {
  apikey = var.elastic_cloud_api_key
}
```

## Creating an Elastic Cloud Deployment

```hcl
# Get the latest supported Elastic Stack version for AWS us-east-1
data "ec_stack" "latest" {
  version_regex = "latest"
  region = "us-east-1"
}

resource "ec_deployment" "main" {
  name                   = "prod-search"
  region                 = "us-east-1"
  version                = data.ec_stack.latest.version
  deployment_template_id = "aws-io-optimized-v2"

  elasticsearch = {
    hot = {
      autoscaling = {}
      size        = "4g"
      zone_count  = 2
    }
    warm = {
      autoscaling = {}
      size        = "2g"
      zone_count = 2
    }
  }

  kibana = {
    size       = "1g"
    zone_count = 1
  }

  integrations_server = {}

  tags = {
    Environment = "production"
    ManagedBy   = "OpenTofu"
  }
}

output "elasticsearch_endpoint" {
  value = ec_deployment.main.elasticsearch.https_endpoint
}

output "kibana_endpoint" {
  value = ec_deployment.main.kibana.https_endpoint
}
```

## Managing Elasticsearch Index Templates

```hcl
provider "elasticstack" {
  elasticsearch {
    endpoints = [ec_deployment.main.elasticsearch.https_endpoint]
    username  = ec_deployment.main.elasticsearch_username
    password  = ec_deployment.main.elasticsearch_password
  }

  kibana {
    endpoints = [ec_deployment.main.kibana.https_endpoint]
    username  = ec_deployment.main.elasticsearch_username
    password  = ec_deployment.main.elasticsearch_password
  }
}

resource "elasticstack_elasticsearch_index_template" "logs" {
  name = "app-logs"

  index_patterns = ["app-logs-*"]

  template {
    settings = jsonencode({
      number_of_shards   = 2
      number_of_replicas = 1
      "index.lifecycle.name" = "logs-policy"
    })

    mappings = jsonencode({
      properties = {
        "@timestamp" = { type = "date" }
        level        = { type = "keyword" }
        message      = { type = "text" }
        service      = { type = "keyword" }
        trace_id     = { type = "keyword" }
      }
    })
  }

  priority        = 100
  composed_of     = []
}
```

## ILM Policy for Index Lifecycle

```hcl
resource "elasticstack_elasticsearch_index_lifecycle" "logs" {
  name = "logs-policy"

  hot {
    min_age = "0ms"
    set_priority {
      priority = 100
    }
  }

  warm {
    min_age = "7d"
    set_priority {
      priority = 50
    }
    shrink {
      number_of_shards = 1
    }
    forcemerge {
      max_num_segments = 1
    }
  }

  cold {
    min_age = "30d"
    set_priority {
      priority = 0
    }
  }

  delete {
    min_age = "90d"
    delete {}
  }
}
```

## Kibana Spaces and Saved Objects

```hcl
resource "elasticstack_kibana_space" "engineering" {
  space_id         = "engineering"
  name             = "Engineering"
  description      = "Engineering team workspace"
  disabled_features = ["discover", "apm"]
}
```

## Conclusion

Managing Elastic Cloud with OpenTofu enables reproducible search infrastructure with consistent index templates, lifecycle policies, and cluster configurations. The two-provider pattern (ec for cluster creation, elasticstack for cluster configuration) mirrors how you'd provision a server with OpenTofu and configure it with Ansible - each tool in its domain.
