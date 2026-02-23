# How to Use the http Data Source in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Data Sources, HTTP, API, Infrastructure as Code

Description: Learn how to use the http data source in Terraform to fetch data from HTTP endpoints, APIs, and web services to use in your infrastructure configuration.

---

The `http` data source makes HTTP GET requests to arbitrary URLs and returns the response body. This lets you pull data from APIs, configuration services, metadata endpoints, and web services directly into your Terraform configuration. It is part of the `hashicorp/http` provider and is useful for integrating with systems that do not have a dedicated Terraform provider.

## Basic Usage

The simplest form fetches a URL and makes the response available:

```hcl
terraform {
  required_providers {
    http = {
      source  = "hashicorp/http"
      version = "~> 3.0"
    }
  }
}

data "http" "my_ip" {
  url = "https://api.ipify.org?format=json"
}

output "terraform_host_ip" {
  value = jsondecode(data.http.my_ip.response_body).ip
}
```

This fetches the public IP of the machine running Terraform. The response body is available as a string, which you can parse with `jsondecode()` if it is JSON.

## Available Attributes

After the HTTP request completes, you can access:

- `response_body` - The body of the response as a string
- `response_headers` - A map of response headers
- `status_code` - The HTTP status code (200, 404, etc.)
- `response_body_base64` - The body encoded as base64

```hcl
data "http" "example" {
  url = "https://api.example.com/config"
}

output "status" {
  value = data.http.example.status_code
}

output "content_type" {
  value = data.http.example.response_headers["Content-Type"]
}

output "body" {
  value = data.http.example.response_body
}
```

## Adding Request Headers

You can add custom headers for authentication or content negotiation:

```hcl
data "http" "api_config" {
  url = "https://api.example.com/v1/config"

  request_headers = {
    Accept        = "application/json"
    Authorization = "Bearer ${var.api_token}"
  }
}
```

## Real-World Use Cases

### Fetching Your Public IP for Security Groups

A common pattern is to restrict SSH access to only the IP of the machine running Terraform.

```hcl
data "http" "my_ip" {
  url = "https://api.ipify.org?format=json"
}

locals {
  my_ip = jsondecode(data.http.my_ip.response_body).ip
}

resource "aws_security_group" "ssh" {
  name_prefix = "ssh-access-"
  vpc_id      = var.vpc_id

  ingress {
    description = "SSH from Terraform host"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["${local.my_ip}/32"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

### Reading Configuration from a Remote Service

If you have a central configuration service, pull values directly:

```hcl
data "http" "app_config" {
  url = "https://config-service.internal/api/v1/environments/${var.environment}"

  request_headers = {
    Accept        = "application/json"
    Authorization = "Token ${var.config_service_token}"
  }
}

locals {
  config = jsondecode(data.http.app_config.response_body)
}

resource "aws_instance" "app" {
  ami           = local.config.ami_id
  instance_type = local.config.instance_type
  subnet_id     = local.config.subnet_id

  tags = {
    Name        = local.config.app_name
    Environment = var.environment
  }
}
```

### Checking Service Health in Check Blocks

The `http` data source works well inside Terraform `check` blocks for post-deployment validation:

```hcl
check "app_health" {
  data "http" "health" {
    url = "https://${aws_lb.main.dns_name}/health"
  }

  assert {
    condition     = data.http.health.status_code == 200
    error_message = "Application health check failed with status ${data.http.health.status_code}"
  }
}
```

### Fetching GitHub Release Information

```hcl
data "http" "latest_release" {
  url = "https://api.github.com/repos/hashicorp/terraform/releases/latest"

  request_headers = {
    Accept = "application/vnd.github.v3+json"
  }
}

locals {
  latest_terraform_version = jsondecode(data.http.latest_release.response_body).tag_name
}

output "latest_terraform" {
  value = local.latest_terraform_version
}
```

### Reading IP Allowlists

Some organizations maintain IP allowlists as web-accessible files:

```hcl
data "http" "office_ips" {
  url = "https://internal-tools.example.com/api/office-ips"

  request_headers = {
    Accept = "application/json"
  }
}

locals {
  office_cidrs = jsondecode(data.http.office_ips.response_body).cidrs
}

resource "aws_security_group" "office_access" {
  name_prefix = "office-access-"
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = local.office_cidrs
    content {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
      description = "Office IP access"
    }
  }
}
```

### Fetching SSL Certificate Information

```hcl
data "http" "cert_check" {
  url = "https://app.example.com"
}

# The response_headers can tell you about the connection
output "server_header" {
  value = lookup(data.http.cert_check.response_headers, "Server", "unknown")
}
```

### Integrating with HashiCorp Vault

While there is a dedicated Vault provider, you can also use the HTTP data source for simple lookups:

```hcl
data "http" "vault_secret" {
  url = "${var.vault_addr}/v1/secret/data/app/config"

  request_headers = {
    "X-Vault-Token" = var.vault_token
  }
}

locals {
  vault_data = jsondecode(data.http.vault_secret.response_body).data.data
}
```

## Handling JSON Responses

Most API responses are JSON. Use `jsondecode()` to parse them:

```hcl
data "http" "api_response" {
  url = "https://api.example.com/infrastructure"
}

locals {
  infra_data = jsondecode(data.http.api_response.response_body)

  # Access nested fields
  vpc_id    = local.infra_data.network.vpc_id
  subnet_ids = local.infra_data.network.subnets[*].id
  db_host   = local.infra_data.database.endpoint
}
```

## Handling Non-JSON Responses

For plain text or other formats, work with the raw string:

```hcl
# Fetch a PGP public key
data "http" "pgp_key" {
  url = "https://keyserver.example.com/pks/lookup?op=get&search=admin@example.com"
}

# Fetch a plain text IP list
data "http" "ip_list" {
  url = "https://example.com/ip-allowlist.txt"
}

locals {
  # Split by newlines and filter empty lines
  allowed_ips = [
    for ip in split("\n", data.http.ip_list.response_body) :
    trimspace(ip) if trimspace(ip) != ""
  ]
}
```

## Error Handling

By default, the `http` data source fails if the request returns a non-success status code. You can customize this:

```hcl
data "http" "maybe_exists" {
  url = "https://api.example.com/resource/123"

  # Retry configuration
  retry {
    attempts     = 3
    min_delay_ms = 1000
    max_delay_ms = 5000
  }
}
```

For handling potential 404s or other expected failures, consider wrapping the data source in a conditional:

```hcl
variable "check_external_api" {
  type    = bool
  default = true
}

data "http" "optional_config" {
  count = var.check_external_api ? 1 : 0
  url   = "https://api.example.com/config"
}

locals {
  external_config = var.check_external_api ? jsondecode(data.http.optional_config[0].response_body) : {}
}
```

## Limitations

1. **GET requests only.** The `http` data source only supports HTTP GET. For POST, PUT, or DELETE, use `local-exec` with curl or the `restapi` provider.

2. **No authentication beyond headers.** OAuth flows, mutual TLS, and other complex auth mechanisms are not supported. You need to pass tokens directly in headers.

3. **Runs during plan.** The HTTP request happens during `terraform plan`, which means the endpoint must be reachable from wherever Terraform runs.

4. **No caching.** Every plan and apply triggers a fresh HTTP request. If the endpoint is rate-limited, this could be a problem.

5. **Sensitive data exposure.** Response bodies are stored in state. If the API returns sensitive data, it will be in your state file.

## Security Considerations

- **Never put secrets in URLs.** Use headers for authentication tokens.
- **Encrypt your state.** API responses stored in state may contain sensitive information.
- **Use HTTPS.** Always use HTTPS URLs to prevent interception.
- **Restrict network access.** In CI/CD, ensure the Terraform runner can reach the HTTP endpoints securely.

## Summary

The `http` data source connects Terraform to any HTTP-accessible service. It is ideal for fetching configuration from APIs, checking service health, reading IP allowlists, and integrating with systems that lack a dedicated Terraform provider. Parse JSON responses with `jsondecode()`, pass authentication via headers, and be mindful that responses are stored in state.

For other data source types, see our posts on the [external data source](https://oneuptime.com/blog/post/2026-02-23-terraform-external-data-source/view) and [querying infrastructure with data sources](https://oneuptime.com/blog/post/2026-02-23-terraform-query-infrastructure-data-sources/view).
