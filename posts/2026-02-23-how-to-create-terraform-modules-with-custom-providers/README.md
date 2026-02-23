# How to Create Terraform Modules with Custom Providers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Custom Providers, Provider Development, Infrastructure as Code

Description: Learn how to create Terraform modules that use custom or third-party providers for managing specialized infrastructure, internal APIs, and non-standard resources.

---

While HashiCorp and the community maintain providers for most cloud services, there are times when you need a custom provider. Maybe you have an internal API that manages infrastructure, a SaaS tool without an official provider, or a legacy system you want to bring under Terraform management. This post covers how to build modules that use custom and third-party providers effectively.

## When You Need Custom Providers

Custom providers are useful in several scenarios:

- Managing resources in an internal platform or API
- Working with SaaS tools that lack official Terraform providers
- Extending existing providers with additional resource types
- Managing legacy infrastructure through custom automation
- Integrating with proprietary hardware management systems

## Using Third-Party Providers in Modules

Third-party providers from the Terraform Registry work just like official ones. Your module declares the requirement, and Terraform downloads the provider automatically.

```hcl
# modules/monitoring/versions.tf
# Using a third-party provider from the registry
terraform {
  required_providers {
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.30"
    }
    pagerduty = {
      source  = "PagerDuty/pagerduty"
      version = "~> 3.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}
```

```hcl
# modules/monitoring/main.tf
# Create Datadog monitors for an AWS service

resource "datadog_monitor" "cpu_high" {
  name    = "${var.service_name} - CPU Utilization High"
  type    = "metric alert"
  message = "CPU is above ${var.cpu_threshold}% on ${var.service_name}. @pagerduty-${var.pagerduty_service}"

  query = "avg(last_5m):avg:aws.ecs.cpuutilization{service_name:${var.service_name}} > ${var.cpu_threshold}"

  monitor_thresholds {
    critical = var.cpu_threshold
    warning  = var.cpu_threshold * 0.8
  }

  tags = concat(var.tags, ["service:${var.service_name}", "env:${var.environment}"])
}

resource "datadog_monitor" "error_rate" {
  name    = "${var.service_name} - Error Rate High"
  type    = "metric alert"
  message = "Error rate above ${var.error_threshold}% on ${var.service_name}. @pagerduty-${var.pagerduty_service}"

  query = "avg(last_5m):sum:trace.http.request.errors{service:${var.service_name}}.as_rate() / sum:trace.http.request.hits{service:${var.service_name}}.as_rate() * 100 > ${var.error_threshold}"

  monitor_thresholds {
    critical = var.error_threshold
    warning  = var.error_threshold * 0.5
  }

  tags = concat(var.tags, ["service:${var.service_name}", "env:${var.environment}"])
}

# Create a PagerDuty escalation policy
resource "pagerduty_escalation_policy" "this" {
  name      = "${var.service_name}-escalation"
  num_loops = 2

  rule {
    escalation_delay_in_minutes = 10
    target {
      type = "schedule_reference"
      id   = var.pagerduty_schedule_id
    }
  }
}
```

## Configuring Custom Provider Sources

For providers that are not in the public registry, you need to specify where to find them.

```hcl
# versions.tf - Custom provider from a private registry
terraform {
  required_providers {
    # Provider from a private Terraform Enterprise registry
    myplatform = {
      source  = "app.terraform.io/myorg/myplatform"
      version = "~> 1.0"
    }

    # Provider from a custom registry
    internal = {
      source  = "registry.myorg.com/myorg/internal"
      version = "~> 2.0"
    }
  }
}
```

For local development with a custom provider binary:

```hcl
# dev.tfrc - Development override file
provider_installation {
  dev_overrides {
    "myorg/myplatform" = "/Users/developer/go/bin"
  }

  direct {}
}
```

```bash
# Set the CLI config override
export TF_CLI_CONFIG_FILE="dev.tfrc"
terraform plan
```

## Building Modules with Mixed Providers

Many real-world modules combine official cloud providers with third-party providers for cross-cutting concerns.

```hcl
# modules/web-service/versions.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.30"
    }
  }
}
```

```hcl
# modules/web-service/main.tf
# AWS resources for the application
resource "aws_ecs_service" "this" {
  name            = var.name
  cluster         = var.ecs_cluster_id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }
}

# Cloudflare DNS record pointing to the AWS load balancer
resource "cloudflare_record" "this" {
  zone_id = var.cloudflare_zone_id
  name    = var.subdomain
  content = var.alb_dns_name
  type    = "CNAME"
  proxied = true
}

# Cloudflare page rule for caching
resource "cloudflare_page_rule" "cache" {
  zone_id  = var.cloudflare_zone_id
  target   = "${var.subdomain}.${var.domain}/*"
  priority = 1

  actions {
    cache_level = "aggressive"
    edge_cache_ttl = 3600
  }
}

# Datadog monitoring for the service
resource "datadog_monitor" "health" {
  name    = "${var.name} - Health Check Failing"
  type    = "service check"
  message = "${var.name} health check is failing. @slack-oncall"

  query = "\"http.can_connect\".over(\"instance:${var.subdomain}.${var.domain}\").by(\"*\").last(3).count_by_status()"

  monitor_thresholds {
    critical = 2
    warning  = 1
  }
}
```

## Provider Configuration for Modules

When your module uses multiple providers, the root module must configure all of them.

```hcl
# Root module - configure all providers the module needs
provider "aws" {
  region = "us-east-1"
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "datadog" {
  api_key = var.datadog_api_key
  app_key = var.datadog_app_key
}

# The module inherits all three providers
module "api_service" {
  source = "./modules/web-service"

  name              = "api"
  ecs_cluster_id    = module.ecs.cluster_id
  subnet_ids        = module.vpc.private_subnet_ids
  security_group_ids = [module.sg.app_sg_id]
  desired_count     = 3
  alb_dns_name      = module.alb.dns_name
  cloudflare_zone_id = var.cloudflare_zone_id
  subdomain         = "api"
  domain            = "myapp.com"
}
```

## Creating a Module for a Custom Provider

If you are building both a custom provider and modules that use it:

```hcl
# modules/internal-service/main.tf
# This module uses a custom provider for an internal platform

resource "myplatform_service" "this" {
  name        = var.name
  team        = var.team
  environment = var.environment
  tier        = var.tier

  config {
    replicas   = var.replicas
    cpu_limit  = var.cpu_limit
    memory_limit = var.memory_limit
    image      = var.container_image
    port       = var.port
  }

  health_check {
    path     = var.health_check_path
    interval = 30
    timeout  = 5
  }

  tags = var.tags
}

resource "myplatform_dns_record" "this" {
  service_id = myplatform_service.this.id
  subdomain  = var.subdomain
  zone       = var.dns_zone
}

resource "myplatform_monitoring" "this" {
  service_id = myplatform_service.this.id

  alert {
    name       = "cpu-high"
    metric     = "cpu_utilization"
    threshold  = 80
    duration   = "5m"
    severity   = "warning"
    notify     = var.alert_channel
  }

  alert {
    name       = "error-rate"
    metric     = "http_5xx_rate"
    threshold  = 5
    duration   = "2m"
    severity   = "critical"
    notify     = var.alert_channel
  }
}
```

## Handling Provider Authentication in Modules

Modules should never contain provider authentication. That always belongs in the root module.

```hcl
# Bad - credentials in the module
# modules/monitoring/main.tf
provider "datadog" {
  api_key = "hardcoded-key"  # NEVER do this
}

# Good - module declares the provider requirement
# The root module configures authentication
# modules/monitoring/versions.tf
terraform {
  required_providers {
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.30"
    }
  }
}

# Root module handles auth
provider "datadog" {
  api_key = var.datadog_api_key  # From environment or vault
  app_key = var.datadog_app_key
}
```

## Testing Modules with Custom Providers

Testing modules with multiple providers requires mocking or using test accounts:

```hcl
# tests/main.tftest.hcl
# Use provider mocking for unit tests (Terraform 1.7+)

mock_provider "datadog" {}
mock_provider "cloudflare" {}

# Only use real AWS provider for integration testing
run "validate_structure" {
  command = plan

  variables {
    name              = "test-service"
    ecs_cluster_id    = "arn:aws:ecs:us-east-1:123456789012:cluster/test"
    subnet_ids        = ["subnet-abc123"]
    security_group_ids = ["sg-abc123"]
    desired_count     = 1
    alb_dns_name      = "test-alb-1234567890.us-east-1.elb.amazonaws.com"
    cloudflare_zone_id = "mock-zone-id"
    subdomain         = "test"
    domain            = "test.com"
  }
}
```

## Conclusion

Custom and third-party providers extend Terraform's reach far beyond the major cloud providers. When building modules with custom providers, declare provider requirements clearly, keep authentication in the root module, and document which providers your module needs. Combine official cloud providers with third-party providers to build comprehensive modules that manage your entire infrastructure stack from a single configuration.

For more on provider configuration, see our posts on [how to create Terraform modules with dynamic provider configuration](https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-modules-with-dynamic-provider-configuration/view) and [how to create Terraform modules for multi-cloud](https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-modules-for-multi-cloud/view).
