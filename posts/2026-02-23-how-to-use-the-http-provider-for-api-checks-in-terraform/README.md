# How to Use the HTTP Provider for API Checks in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HTTP Provider, API, Health Checks, Infrastructure as Code

Description: Learn how to use the Terraform HTTP provider to make API calls, perform health checks, fetch remote configuration, and validate endpoints during infrastructure deployment.

---

The HTTP provider in Terraform makes HTTP requests and exposes the response data for use in your configuration. It is useful for health checks before deployment, fetching remote configuration, validating API endpoints, and reading data from HTTP-accessible services. The http data source makes a GET request and provides the response body, status code, and headers.

In this guide, we will explore the HTTP provider for various use cases including health checks, configuration fetching, API validation, and conditional deployment based on API responses.

## Provider Setup

```hcl
# main.tf
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    http = {
      source  = "hashicorp/http"
      version = "~> 3.4"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

variable "environment" {
  type    = string
  default = "production"
}
```

## Basic HTTP GET Request

```hcl
# basic.tf - Simple HTTP request
data "http" "example" {
  url = "https://api.ipify.org?format=json"

  request_headers = {
    Accept = "application/json"
  }
}

output "public_ip" {
  value = jsondecode(data.http.example.response_body)["ip"]
}

output "status_code" {
  value = data.http.example.status_code
}
```

## Health Check Before Deployment

```hcl
# health-check.tf - Verify service health before deploying
data "http" "api_health" {
  url = "https://api.${var.domain}/health"

  request_headers = {
    Accept = "application/json"
  }

  # Retry on failure
  retry {
    attempts     = 3
    min_delay_ms = 1000
    max_delay_ms = 5000
  }
}

variable "domain" {
  type    = string
  default = "example.com"
}

# Validate the health check response
locals {
  api_healthy = data.http.api_health.status_code == 200
}

output "api_status" {
  value = {
    healthy     = local.api_healthy
    status_code = data.http.api_health.status_code
  }
}
```

## Fetching Remote Configuration

```hcl
# remote-config.tf - Fetch configuration from a remote endpoint
data "http" "remote_config" {
  url = "https://config.example.com/api/v1/config/${var.environment}"

  request_headers = {
    Accept        = "application/json"
    Authorization = "Bearer ${var.config_api_token}"
  }
}

variable "config_api_token" {
  type      = string
  sensitive = true
  default   = "placeholder"
}

locals {
  remote_config = jsondecode(data.http.remote_config.response_body)
}

output "remote_settings" {
  value = local.remote_config
}
```

## Checking External IP for Security Group Rules

```hcl
# my-ip.tf - Get current IP for security group rules
data "http" "my_ip" {
  url = "https://api.ipify.org?format=json"
}

locals {
  my_ip = jsondecode(data.http.my_ip.response_body)["ip"]
}

resource "aws_security_group_rule" "ssh_access" {
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = ["${local.my_ip}/32"]
  security_group_id = var.security_group_id
  description       = "SSH from deployer IP"
}

variable "security_group_id" {
  type    = string
  default = "sg-12345"
}
```

## Validating SSL Certificates

```hcl
# ssl-check.tf - Verify an HTTPS endpoint is accessible
data "http" "ssl_check" {
  url = "https://api.${var.domain}"

  request_headers = {
    Accept = "application/json"
  }
}

output "ssl_valid" {
  value = data.http.ssl_check.status_code >= 200 && data.http.ssl_check.status_code < 400
}
```

## Checking GitHub Release Versions

```hcl
# github-release.tf - Get latest release version
data "http" "latest_release" {
  url = "https://api.github.com/repos/${var.github_repo}/releases/latest"

  request_headers = {
    Accept = "application/vnd.github.v3+json"
  }
}

variable "github_repo" {
  type    = string
  default = "hashicorp/terraform"
}

locals {
  latest_version = jsondecode(data.http.latest_release.response_body)["tag_name"]
}

output "latest_version" {
  value = local.latest_version
}
```

## Reading HashiCorp Vault Health

```hcl
# vault-health.tf - Check Vault server health
data "http" "vault_health" {
  url = "${var.vault_address}/v1/sys/health"

  request_headers = {
    Accept = "application/json"
  }
}

variable "vault_address" {
  type    = string
  default = "https://vault.example.com:8200"
}

locals {
  vault_status = jsondecode(data.http.vault_health.response_body)
}

output "vault_health" {
  value = {
    initialized = local.vault_status["initialized"]
    sealed      = local.vault_status["sealed"]
    version     = local.vault_status["version"]
  }
}
```

## Multiple Endpoint Health Checks

```hcl
# multi-check.tf - Check multiple endpoints
variable "health_endpoints" {
  type = map(string)
  default = {
    "api"    = "https://api.example.com/health"
    "web"    = "https://www.example.com/health"
    "admin"  = "https://admin.example.com/health"
  }
}

data "http" "health_checks" {
  for_each = var.health_endpoints

  url = each.value

  request_headers = {
    Accept = "application/json"
  }
}

output "health_status" {
  value = {
    for name, check in data.http.health_checks :
    name => {
      status_code = check.status_code
      healthy     = check.status_code == 200
    }
  }
}
```

## Conclusion

The HTTP provider is a lightweight way to integrate external HTTP services into your Terraform workflow. Whether you are performing pre-deployment health checks, fetching remote configuration, or validating endpoints, the http data source provides the data you need. For more complex API interactions that require POST requests or authentication flows, consider using the [external provider](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-external-provider-for-custom-scripts-in-terraform/view) with custom scripts instead.
