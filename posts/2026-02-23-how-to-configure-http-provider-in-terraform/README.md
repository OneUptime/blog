# How to Configure HTTP Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Providers, HTTP, API, Infrastructure as Code

Description: Learn how to use the HTTP provider in Terraform to fetch data from REST APIs and web endpoints for use in your infrastructure configuration.

---

Sometimes your Terraform configuration needs information from an HTTP endpoint. Maybe you need to look up your current public IP address, fetch a configuration file from an internal API, check the latest version of a software package, or retrieve data from a service that does not have a dedicated Terraform provider. The HTTP provider handles these scenarios by making HTTP requests and making the response data available in your configuration.

It is a read-only data source - it fetches data but does not create or modify anything on the remote server. Think of it as `curl` integrated into Terraform's data flow.

## Prerequisites

- Terraform 1.0 or later
- Network access to the HTTP endpoints you want to query

## Declaring the Provider

```hcl
# versions.tf - Declare the HTTP provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    http = {
      source  = "hashicorp/http"
      version = "~> 3.4"
    }
  }
}
```

No configuration needed.

```hcl
# provider.tf - Nothing to configure
provider "http" {}
```

## Basic Usage

The HTTP provider has a single data source: `http`.

```hcl
# Fetch your public IP address
data "http" "my_ip" {
  url = "https://api.ipify.org?format=json"
}

output "my_public_ip" {
  value = jsondecode(data.http.my_ip.response_body).ip
}
```

## Request Configuration

### Setting Headers

```hcl
# Fetch data from an API with authentication
data "http" "api_config" {
  url = "https://api.example.com/config"

  # Set request headers
  request_headers = {
    Accept        = "application/json"
    Authorization = "Bearer ${var.api_token}"
    User-Agent    = "Terraform/HTTP-Provider"
  }
}
```

### POST Requests

The HTTP provider supports different HTTP methods.

```hcl
# Make a POST request
data "http" "token" {
  url    = "https://auth.example.com/oauth/token"
  method = "POST"

  request_headers = {
    Content-Type = "application/json"
  }

  request_body = jsonencode({
    grant_type    = "client_credentials"
    client_id     = var.client_id
    client_secret = var.client_secret
  })
}

locals {
  access_token = jsondecode(data.http.token.response_body).access_token
}
```

### Handling HTTPS and TLS

```hcl
# Fetch from an endpoint with a custom CA certificate
data "http" "internal_api" {
  url = "https://internal-api.example.com/health"

  # Path to a CA bundle for custom certificates
  ca_cert_pem = file("${path.module}/certs/internal-ca.pem")
}

# Skip TLS verification (development only)
data "http" "dev_api" {
  url      = "https://dev-api.local/status"
  insecure = true
}
```

## Working with JSON Responses

Most APIs return JSON, and you can parse it with Terraform's `jsondecode` function.

```hcl
# Fetch and parse a JSON configuration
data "http" "app_config" {
  url = "https://config.example.com/api/v1/services/myapp"

  request_headers = {
    Accept = "application/json"
  }
}

locals {
  config = jsondecode(data.http.app_config.response_body)
}

output "app_settings" {
  value = {
    port     = local.config.port
    replicas = local.config.replicas
    version  = local.config.version
  }
}
```

## Practical Use Cases

### Fetching Public IP for Security Groups

One of the most common uses is dynamically setting security group rules based on the current public IP.

```hcl
# Get the current public IP
data "http" "my_ip" {
  url = "https://checkip.amazonaws.com"
}

locals {
  # Trim whitespace from the response
  my_ip = trimspace(data.http.my_ip.response_body)
}

# Allow SSH from the current IP only
resource "aws_security_group_rule" "ssh_from_me" {
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = ["${local.my_ip}/32"]
  security_group_id = aws_security_group.bastion.id
  description       = "SSH from deployer IP"
}
```

### Checking Latest Software Version

```hcl
# Get the latest release version from GitHub
data "http" "latest_release" {
  url = "https://api.github.com/repos/hashicorp/consul/releases/latest"

  request_headers = {
    Accept = "application/vnd.github.v3+json"
  }
}

locals {
  consul_version = jsondecode(data.http.latest_release.response_body).tag_name
}

output "latest_consul_version" {
  value = local.consul_version
}
```

### Fetching Remote Configuration

```hcl
# Fetch a YAML configuration from a config server
data "http" "remote_config" {
  url = "${var.config_server_url}/config/${var.environment}.json"

  request_headers = {
    Accept        = "application/json"
    Authorization = "Bearer ${var.config_token}"
  }
}

locals {
  remote_config = jsondecode(data.http.remote_config.response_body)
}

# Use the fetched config to set up resources
resource "aws_instance" "app" {
  count         = local.remote_config.instance_count
  ami           = local.remote_config.ami_id
  instance_type = local.remote_config.instance_type
}
```

### Health Check Before Deployment

```hcl
# Check that a dependency service is healthy before deploying
data "http" "dependency_health" {
  url = "https://auth-service.example.com/health"

  request_headers = {
    Accept = "application/json"
  }

  # Retry configuration
  retry {
    attempts     = 3
    min_delay_ms = 1000
    max_delay_ms = 5000
  }
}

# Verify the service is healthy
locals {
  auth_service_healthy = jsondecode(data.http.dependency_health.response_body).status == "healthy"
}
```

### Fetching IP Ranges

```hcl
# Fetch AWS IP ranges for firewall rules
data "http" "aws_ip_ranges" {
  url = "https://ip-ranges.amazonaws.com/ip-ranges.json"
}

locals {
  aws_ranges = jsondecode(data.http.aws_ip_ranges.response_body)

  # Filter for CloudFront IP ranges
  cloudfront_ranges = [
    for prefix in local.aws_ranges.prefixes :
    prefix.ip_prefix
    if prefix.service == "CLOUDFRONT"
  ]
}

# Allow CloudFront to access the origin
resource "aws_security_group_rule" "cloudfront_ingress" {
  count             = length(local.cloudfront_ranges)
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = [local.cloudfront_ranges[count.index]]
  security_group_id = aws_security_group.origin.id
}
```

### Fetching SSH Keys from GitHub

```hcl
# Fetch a user's public SSH keys from GitHub
data "http" "github_keys" {
  url = "https://github.com/nawazdhandala.keys"
}

resource "aws_key_pair" "deployer" {
  key_name   = "deployer-key"
  # Take the first key from the response
  public_key = split("\n", data.http.github_keys.response_body)[0]
}
```

## Response Attributes

The HTTP data source provides several useful attributes.

```hcl
data "http" "example" {
  url = "https://api.example.com/data"
}

output "response_info" {
  value = {
    # The response body as a string
    body = data.http.example.response_body

    # HTTP status code
    status_code = data.http.example.status_code

    # Response headers
    headers = data.http.example.response_headers

    # Specific header value
    content_type = data.http.example.response_headers["Content-Type"]
  }
}
```

## Error Handling

By default, the HTTP provider will fail if the response status code is not in the 200 range. You can customize this behavior.

```hcl
# Accept 200 and 201 status codes
data "http" "api_call" {
  url = "https://api.example.com/resource"

  # Only fail if the status code is not in this list
  # By default, only 200 is accepted
}

# Use a lifecycle check to handle unexpected responses
data "http" "conditional" {
  url = "https://api.example.com/feature-flag"

  request_headers = {
    Accept = "application/json"
  }

  lifecycle {
    postcondition {
      condition     = self.status_code == 200
      error_message = "Feature flag API returned unexpected status: ${self.status_code}"
    }
  }
}
```

## Combining with Other Providers

```hcl
# Fetch configuration and use it across multiple cloud providers
data "http" "infra_config" {
  url = "https://config.example.com/api/infrastructure"

  request_headers = {
    Accept        = "application/json"
    Authorization = "Bearer ${var.config_token}"
  }
}

locals {
  infra = jsondecode(data.http.infra_config.response_body)
}

# Use in AWS
resource "aws_vpc" "main" {
  cidr_block = local.infra.aws.vpc_cidr
}

# Use in GCP
resource "google_compute_network" "main" {
  name = local.infra.gcp.network_name
}
```

## Limitations

Keep these limitations in mind:

1. The HTTP provider is a data source, so it runs during every `terraform plan`. If the endpoint returns different data each time, Terraform will detect changes.

2. There is no built-in caching. Every plan and apply will make the HTTP request.

3. For write operations (creating, updating, deleting resources via API), use the `restapi` community provider or write a custom provider.

4. Large responses can slow down Terraform operations since the entire response is stored in state.

5. The provider does not handle cookies, redirects beyond the basics, or complex authentication flows.

## Best Practices

1. Always set appropriate `request_headers`, especially `Accept: application/json` for JSON APIs.

2. Use `jsondecode()` to parse JSON responses and access individual fields.

3. Handle potential failures with `lifecycle` postconditions.

4. Do not fetch sensitive data with the HTTP provider if you can avoid it. Response bodies are stored in the Terraform state.

5. Add `retry` configuration for endpoints that might be temporarily unavailable.

## Wrapping Up

The HTTP provider is a convenient way to pull data from web endpoints into your Terraform configuration. Whether you are fetching your current IP address, checking API endpoints, or loading remote configuration, it integrates HTTP data into the Terraform workflow without requiring a dedicated provider for every service.

For monitoring the HTTP endpoints and APIs that your infrastructure depends on, [OneUptime](https://oneuptime.com) provides HTTP monitoring with alerting on status codes, response times, and content changes.
