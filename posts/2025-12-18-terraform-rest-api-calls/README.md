# How to Make REST API Calls from Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, API, REST, Infrastructure as Code, DevOps

Description: Learn how to make REST API calls from Terraform using the http data source, external data source, and custom providers for integrating with external services.

---

Sometimes you need Terraform to interact with external APIs - fetching configuration, registering resources, or integrating with services that do not have Terraform providers. This guide covers multiple approaches for making REST API calls from Terraform.

## Method 1: The HTTP Data Source

The simplest approach uses the built-in `http` data source for GET requests:

```hcl
# Fetch data from a REST API
data "http" "api_config" {
  url = "https://api.example.com/config"

  # Optional: Add headers
  request_headers = {
    Accept        = "application/json"
    Authorization = "Bearer ${var.api_token}"
  }
}

# Use the response
locals {
  config = jsondecode(data.http.api_config.response_body)
}

output "api_response" {
  value = local.config
}

# Use data in resources
resource "aws_instance" "server" {
  ami           = local.config.recommended_ami
  instance_type = local.config.instance_type

  tags = {
    Name = "server-from-api"
  }
}
```

## Method 2: HTTP Data Source with Error Handling

Handle API failures gracefully:

```hcl
data "http" "external_config" {
  url = "https://api.example.com/config"

  request_headers = {
    Accept = "application/json"
  }
}

locals {
  # Check if request was successful
  api_success = data.http.external_config.status_code == 200

  # Parse response only if successful
  raw_config = local.api_success ? jsondecode(data.http.external_config.response_body) : {}

  # Provide defaults for failed requests
  config = {
    environment = lookup(local.raw_config, "environment", "production")
    replicas    = lookup(local.raw_config, "replicas", 3)
    region      = lookup(local.raw_config, "region", "us-east-1")
  }
}

output "config" {
  value = local.config
}
```

## Method 3: External Data Source for Complex Requests

For POST requests or complex logic, use the `external` data source with a script:

```hcl
data "external" "api_call" {
  program = ["python3", "${path.module}/scripts/api_call.py"]

  query = {
    url     = "https://api.example.com/register"
    method  = "POST"
    token   = var.api_token
    payload = jsonencode({
      name        = var.resource_name
      environment = var.environment
    })
  }
}

output "registration_id" {
  value = data.external.api_call.result.id
}
```

Python script (`scripts/api_call.py`):

```python
#!/usr/bin/env python3
import json
import sys
import urllib.request
import urllib.error

def main():
    # Read input from Terraform
    input_data = json.load(sys.stdin)

    url = input_data["url"]
    method = input_data["method"]
    token = input_data["token"]
    payload = input_data.get("payload", "{}")

    # Prepare request
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    req = urllib.request.Request(
        url,
        data=payload.encode("utf-8"),
        headers=headers,
        method=method
    )

    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))

            # External data source requires all values to be strings
            output = {k: str(v) for k, v in result.items()}
            print(json.dumps(output))

    except urllib.error.HTTPError as e:
        # Return error information
        print(json.dumps({
            "error": str(e),
            "status": str(e.code)
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
```

## Method 4: Using curl with local-exec

For one-time API calls during resource creation:

```hcl
resource "null_resource" "register_service" {
  triggers = {
    service_id = aws_ecs_service.main.id
  }

  provisioner "local-exec" {
    command = <<-EOT
      curl -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${var.api_token}" \
        -d '{"service_id": "${aws_ecs_service.main.id}", "name": "${var.service_name}"}' \
        https://api.example.com/services/register
    EOT
  }
}
```

## Method 5: The restapi Provider

For full CRUD operations, use the `restapi` provider:

```hcl
terraform {
  required_providers {
    restapi = {
      source  = "Mastercard/restapi"
      version = "~> 1.18"
    }
  }
}

provider "restapi" {
  uri                  = "https://api.example.com"
  write_returns_object = true

  headers = {
    Authorization = "Bearer ${var.api_token}"
    Content-Type  = "application/json"
  }
}

# Create a resource via API
resource "restapi_object" "service_registration" {
  path = "/api/v1/services"

  data = jsonencode({
    name        = var.service_name
    environment = var.environment
    endpoints   = var.endpoints
  })

  # Define how to read the ID from the response
  id_attribute = "id"
}

# Reference the created resource
output "service_id" {
  value = restapi_object.service_registration.id
}
```

## Method 6: Fetch Dynamic AMI IDs

A practical example - fetching the latest AMI from an API:

```hcl
data "http" "latest_ami" {
  url = "https://ami-registry.example.com/api/v1/amis/latest"

  request_headers = {
    Accept = "application/json"
    X-API-Key = var.ami_registry_key
  }
}

locals {
  ami_data = jsondecode(data.http.latest_ami.response_body)
}

resource "aws_instance" "app" {
  ami           = local.ami_data.ami_id
  instance_type = "t3.micro"

  tags = {
    Name       = "app-server"
    AMIVersion = local.ami_data.version
    AMIDate    = local.ami_data.build_date
  }
}
```

## Method 7: Webhook Notifications

Send notifications when infrastructure changes:

```hcl
resource "null_resource" "deployment_notification" {
  depends_on = [aws_ecs_service.main]

  triggers = {
    deployment_id = aws_ecs_service.main.id
    task_definition = aws_ecs_task_definition.main.revision
  }

  provisioner "local-exec" {
    command = <<-EOT
      curl -X POST \
        -H "Content-Type: application/json" \
        -d '{
          "text": "Deployment completed",
          "service": "${var.service_name}",
          "environment": "${var.environment}",
          "task_definition": "${aws_ecs_task_definition.main.revision}",
          "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
        }' \
        ${var.slack_webhook_url}
    EOT

    interpreter = ["bash", "-c"]
  }
}
```

## Method 8: GraphQL API Calls

For GraphQL APIs, structure your query properly:

```hcl
data "external" "graphql_query" {
  program = ["bash", "-c", <<-EOT
    curl -s -X POST \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${var.api_token}" \
      -d '{"query": "{ configuration { region instanceType } }"}' \
      https://api.example.com/graphql | \
    jq '{region: .data.configuration.region, instanceType: .data.configuration.instanceType}'
  EOT
  ]
}

output "graphql_result" {
  value = data.external.graphql_query.result
}
```

## Method 9: Paginated API Responses

Handle paginated APIs with an external script:

```hcl
data "external" "paginated_data" {
  program = ["python3", "${path.module}/scripts/fetch_all_pages.py"]

  query = {
    base_url = "https://api.example.com/items"
    token    = var.api_token
  }
}
```

Python script for pagination:

```python
#!/usr/bin/env python3
import json
import sys
import urllib.request

def fetch_all_pages(base_url, token):
    all_items = []
    page = 1

    while True:
        url = f"{base_url}?page={page}&per_page=100"
        headers = {"Authorization": f"Bearer {token}"}

        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode("utf-8"))

            items = data.get("items", [])
            if not items:
                break

            all_items.extend(items)
            page += 1

    return all_items

def main():
    input_data = json.load(sys.stdin)
    items = fetch_all_pages(input_data["base_url"], input_data["token"])

    # Return as JSON string (external data source limitation)
    output = {
        "count": str(len(items)),
        "items": json.dumps(items)
    }
    print(json.dumps(output))

if __name__ == "__main__":
    main()
```

## Best Practices

### 1. Handle Sensitive Data

```hcl
data "http" "secrets" {
  url = "https://vault.example.com/v1/secret/data/app"

  request_headers = {
    X-Vault-Token = var.vault_token
  }
}

locals {
  secrets = jsondecode(data.http.secrets.response_body)
}

# Mark outputs as sensitive
output "database_password" {
  value     = local.secrets.data.data.db_password
  sensitive = true
}
```

### 2. Add Retry Logic

```hcl
data "external" "reliable_api_call" {
  program = ["bash", "-c", <<-EOT
    for i in {1..3}; do
      response=$(curl -s -w "\n%{http_code}" https://api.example.com/data)
      status=$(echo "$response" | tail -n1)
      body=$(echo "$response" | sed '$d')

      if [ "$status" = "200" ]; then
        echo "$body"
        exit 0
      fi

      sleep $((i * 2))
    done

    echo '{"error": "API call failed after 3 retries"}'
    exit 1
  EOT
  ]
}
```

### 3. Cache API Responses

Use triggers to control when data is refreshed:

```hcl
resource "null_resource" "api_cache_trigger" {
  triggers = {
    # Refresh daily
    date = formatdate("YYYY-MM-DD", timestamp())
  }
}

data "external" "cached_api_call" {
  depends_on = [null_resource.api_cache_trigger]
  program    = ["python3", "${path.module}/scripts/api_call.py"]

  query = {
    url = "https://api.example.com/config"
  }
}
```

---

Making REST API calls from Terraform enables integration with external services and dynamic configuration. Use the `http` data source for simple GET requests, the `external` data source for complex logic, and the `restapi` provider for full CRUD operations. Always handle errors gracefully and consider caching for frequently accessed APIs.
