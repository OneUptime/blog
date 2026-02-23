# How to Use Terraform with Internal APIs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, API, DevOps, Infrastructure as Code, REST API, Automation

Description: Learn how to use Terraform to interact with internal APIs using the HTTP provider, restapi provider, and custom scripts to manage resources that lack official Terraform providers.

---

Not every service your organization uses has an official Terraform provider. Internal platforms, legacy systems, and custom-built tools often expose REST APIs but have no Terraform support. Rather than managing these resources manually, you can use several Terraform techniques to integrate with any API, bringing internal services under the same infrastructure-as-code workflow as your cloud resources.

In this guide, we will explore multiple approaches for using Terraform with internal APIs: the HTTP data source for reading data, the restapi provider for full CRUD operations, shell provisioners for custom API calls, and when it makes sense to build a custom provider.

## Using the HTTP Data Source

The simplest way to read data from an internal API is the built-in HTTP data source. It makes GET requests and returns the response body, which you can parse in Terraform.

```hcl
# Read configuration from an internal API
data "http" "service_config" {
  url = "https://internal-api.company.com/v1/config/web-service"

  request_headers = {
    Accept        = "application/json"
    Authorization = "Bearer ${var.internal_api_token}"
  }
}

# Parse the response
locals {
  service_config = jsondecode(data.http.service_config.response_body)
  instance_count = local.service_config.desired_replicas
  instance_type  = local.service_config.recommended_instance_type
}

# Use the API-sourced configuration to create infrastructure
resource "aws_instance" "web" {
  count         = local.instance_count
  ami           = var.ami_id
  instance_type = local.instance_type

  tags = {
    Name = "web-server-${count.index + 1}"
  }
}
```

The limitation of the HTTP data source is that it only supports GET requests. It reads data but cannot create, update, or delete resources.

## Using the restapi Provider for Full CRUD

The `mastercard/restapi` provider enables full create, read, update, and delete operations against any REST API. This is the go-to solution when you need to manage internal API resources through Terraform.

```hcl
# providers.tf
terraform {
  required_providers {
    restapi = {
      source  = "Mastercard/restapi"
      version = "~> 1.18"
    }
  }
}

provider "restapi" {
  uri                  = "https://internal-api.company.com/v1"
  write_returns_object = true
  debug                = true

  headers = {
    Content-Type  = "application/json"
    Authorization = "Bearer ${var.internal_api_token}"
  }
}
```

Now you can manage resources through your internal API just like any other Terraform resource.

```hcl
# Create a team through the internal platform API
resource "restapi_object" "team" {
  path         = "/api/teams"
  read_path    = "/api/teams/{id}"
  update_path  = "/api/teams/{id}"
  destroy_path = "/api/teams/{id}"

  id_attribute = "id"

  data = jsonencode({
    name        = "platform-engineering"
    description = "Platform engineering team"
    slack_channel = "#platform-team"
    oncall_schedule = "primary-rotation"
    members = [
      { email = "alice@company.com", role = "lead" },
      { email = "bob@company.com", role = "member" },
      { email = "carol@company.com", role = "member" }
    ]
  })
}

# Create a service registration
resource "restapi_object" "service_registration" {
  path         = "/api/services"
  read_path    = "/api/services/{id}"
  update_path  = "/api/services/{id}"
  destroy_path = "/api/services/{id}"

  id_attribute = "id"

  data = jsonencode({
    name         = "user-api"
    team_id      = jsondecode(restapi_object.team.api_response).id
    tier         = "critical"
    language     = "go"
    repository   = "https://github.com/company/user-api"
    dependencies = ["auth-service", "database"]
  })
}

# Reference the created resource in other configurations
output "service_id" {
  value = jsondecode(restapi_object.service_registration.api_response).id
}
```

## Handling Complex API Authentication

Internal APIs often use non-standard authentication schemes. You can handle these with provider configuration or pre-authentication scripts.

```hcl
# Example: API that requires OAuth2 token exchange
data "http" "auth_token" {
  url    = "https://auth.company.com/oauth/token"
  method = "POST"

  request_headers = {
    Content-Type = "application/x-www-form-urlencoded"
  }

  request_body = "grant_type=client_credentials&client_id=${var.client_id}&client_secret=${var.client_secret}"
}

locals {
  access_token = jsondecode(data.http.auth_token.response_body).access_token
}

# Use the obtained token with the restapi provider
provider "restapi" {
  uri = "https://internal-api.company.com/v1"

  headers = {
    Content-Type  = "application/json"
    Authorization = "Bearer ${local.access_token}"
  }
}
```

## Using External Data Sources for API Queries

The external data source runs a script and reads its JSON output. This is useful when you need custom logic to query an internal API.

```hcl
# Query an internal API with custom logic
data "external" "network_assignment" {
  program = ["python3", "${path.module}/scripts/get_network.py"]

  query = {
    environment = var.environment
    region      = var.aws_region
    tier        = "production"
  }
}

# Use the result
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  subnet_id     = data.external.network_assignment.result.subnet_id

  tags = {
    Name         = "app-server"
    NetworkBlock = data.external.network_assignment.result.cidr_block
  }
}
```

The corresponding Python script queries the internal API and returns a JSON object.

```python
#!/usr/bin/env python3
# scripts/get_network.py - Query internal IPAM for network assignment

import json
import sys
import requests

def main():
    # Read input from Terraform
    input_data = json.load(sys.stdin)
    environment = input_data["environment"]
    region = input_data["region"]
    tier = input_data["tier"]

    # Query internal IPAM API
    response = requests.get(
        "https://ipam.company.com/api/v1/allocate",
        params={
            "environment": environment,
            "region": region,
            "tier": tier
        },
        headers={"Authorization": f"Bearer {os.environ['IPAM_TOKEN']}"}
    )

    data = response.json()

    # Return results to Terraform (must be map of strings)
    output = {
        "subnet_id": data["subnet_id"],
        "cidr_block": data["cidr_block"],
        "vpc_id": data["vpc_id"],
        "availability_zone": data["availability_zone"]
    }

    json.dump(output, sys.stdout)

if __name__ == "__main__":
    main()
```

## Managing Internal Resources with null_resource and Provisioners

For one-off API calls that do not fit neatly into the CRUD model, null_resource with provisioners gives you full control.

```hcl
# Register a deployment with the internal release tracker
resource "null_resource" "deployment_registration" {
  triggers = {
    # Re-run when the application version changes
    app_version = var.app_version
    deploy_time = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOT
      curl -s -X POST \
        "https://releases.company.com/api/v1/deployments" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${var.release_api_token}" \
        -d '{
          "service": "${var.service_name}",
          "version": "${var.app_version}",
          "environment": "${var.environment}",
          "deployer": "${var.deployer}",
          "terraform_workspace": "${terraform.workspace}",
          "resources": ${jsonencode(var.resource_ids)}
        }'
    EOT
  }

  # Clean up the registration on destroy
  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      curl -s -X DELETE \
        "https://releases.company.com/api/v1/deployments/${self.triggers.app_version}" \
        -H "Authorization: Bearer ${var.release_api_token}"
    EOT
  }
}
```

## Combining Internal and External APIs

A common pattern is using internal APIs to make decisions about external cloud resources.

```hcl
# Query internal cost optimization service
data "http" "cost_recommendation" {
  url = "https://finops.company.com/api/v1/recommend"

  request_headers = {
    Accept        = "application/json"
    Authorization = "Bearer ${var.finops_token}"
  }

  request_body = jsonencode({
    service     = var.service_name
    workload    = "web-server"
    environment = var.environment
  })
}

locals {
  recommendation = jsondecode(data.http.cost_recommendation.response_body)
}

# Use the recommendation to size infrastructure
resource "aws_instance" "optimized" {
  ami           = var.ami_id
  instance_type = local.recommendation.instance_type

  tags = {
    Name                 = var.service_name
    CostOptimized        = "true"
    RecommendedSavings   = local.recommendation.estimated_savings
  }
}
```

## Best Practices

Always handle API errors gracefully. Use `try()` and `can()` functions when parsing API responses to provide sensible defaults when APIs are unavailable.

Cache API responses where possible. If an internal API is slow, consider using the external data source with caching logic in your script to avoid slowing down every Terraform run.

Version your internal APIs. When your API evolves, pin Terraform configurations to specific API versions to avoid breaking changes.

Keep API tokens secure. Use environment variables or a secrets manager to provide API credentials. Never hardcode tokens in Terraform files.

For more on working with REST APIs in Terraform, see our guide on [Terraform REST API Calls](https://oneuptime.com/blog/post/2025-12-18-terraform-rest-api-calls/view).

## Conclusion

Terraform is not limited to resources with official providers. Using the HTTP data source, the restapi provider, external data sources, and provisioners, you can manage virtually any internal API as part of your infrastructure code. This brings consistency and version control to internal platform resources that would otherwise be managed through ad-hoc scripts or manual UI clicks. Choose the approach that best fits your API's complexity and your team's needs.
