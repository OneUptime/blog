# How to Use Terraform with CMDB Tools

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CMDB, DevOps, Infrastructure as Code, Configuration Management

Description: Learn how to integrate Terraform with Configuration Management Database tools to maintain accurate infrastructure records and improve change tracking across your organization.

---

Configuration Management Databases (CMDBs) are critical for organizations that need to track what infrastructure exists, how it is configured, and how components relate to each other. When you combine Terraform with CMDB tools, you get a powerful workflow where infrastructure changes are automatically reflected in your asset registry. This eliminates the manual data entry that causes CMDBs to become stale and unreliable.

In this guide, we will explore practical patterns for integrating Terraform with popular CMDB platforms like ServiceNow, Device42, and open-source alternatives. You will learn how to push resource data into your CMDB automatically, query CMDB records during Terraform runs, and keep everything synchronized.

## Why Integrate Terraform with a CMDB

Most organizations struggle with CMDB accuracy. Teams provision infrastructure through Terraform but forget to update the CMDB, leaving it out of date within weeks. By automating the integration, every `terraform apply` can update your CMDB records in real time.

The benefits include accurate asset tracking, automated relationship mapping between resources, compliance reporting that reflects actual infrastructure, and change history that ties directly to Terraform runs.

## Using Terraform Outputs to Feed CMDB Records

The simplest integration pattern is to use Terraform outputs combined with a post-apply script that pushes data into your CMDB API.

```hcl
# main.tf - Define your infrastructure with outputs for CMDB
resource "aws_instance" "web_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"

  tags = {
    Name        = "web-server-prod"
    Environment = "production"
    Owner       = "platform-team"
    # CMDB tracking tag
    CIType      = "EC2Instance"
  }
}

# Output values that will be sent to the CMDB
output "cmdb_ci_data" {
  value = {
    ci_name       = aws_instance.web_server.tags["Name"]
    ci_type       = "EC2Instance"
    ip_address    = aws_instance.web_server.private_ip
    instance_id   = aws_instance.web_server.id
    instance_type = aws_instance.web_server.instance_type
    environment   = "production"
    managed_by    = "terraform"
    state_file    = "s3://terraform-state/prod/web-server"
  }
  description = "Configuration item data for CMDB registration"
}
```

After applying, you can extract this output and send it to your CMDB.

```bash
#!/bin/bash
# scripts/update-cmdb.sh
# Push Terraform outputs to ServiceNow CMDB after apply

# Extract the CMDB data from Terraform output
CMDB_DATA=$(terraform output -json cmdb_ci_data)

CI_NAME=$(echo "$CMDB_DATA" | jq -r '.ci_name')
CI_TYPE=$(echo "$CMDB_DATA" | jq -r '.ci_type')
IP_ADDRESS=$(echo "$CMDB_DATA" | jq -r '.ip_address')
INSTANCE_ID=$(echo "$CMDB_DATA" | jq -r '.instance_id')

# Push to ServiceNow CMDB API
curl -s -X POST \
  "https://your-instance.service-now.com/api/now/table/cmdb_ci_server" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic ${SNOW_AUTH}" \
  -d "{
    \"name\": \"${CI_NAME}\",
    \"ip_address\": \"${IP_ADDRESS}\",
    \"serial_number\": \"${INSTANCE_ID}\",
    \"category\": \"${CI_TYPE}\",
    \"environment\": \"production\",
    \"managed_by_group\": \"terraform-automation\"
  }"

echo "CMDB updated for CI: ${CI_NAME}"
```

## Using the ServiceNow Terraform Provider

ServiceNow has a community Terraform provider that lets you manage CMDB records directly as Terraform resources. This approach is more declarative and keeps CMDB updates within the Terraform lifecycle.

```hcl
# Configure the ServiceNow provider
terraform {
  required_providers {
    servicenow = {
      source  = "tylerhatton/servicenow"
      version = "~> 0.10"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "servicenow" {
  instance_url = var.servicenow_instance_url
  username     = var.servicenow_username
  password     = var.servicenow_password
}

# Create the AWS resource
resource "aws_instance" "app_server" {
  ami           = var.ami_id
  instance_type = var.instance_type
}

# Register it in the CMDB as a configuration item
resource "servicenow_cmdb_ci_server" "app_server_ci" {
  name          = "app-server-${var.environment}"
  ip_address    = aws_instance.app_server.private_ip
  serial_number = aws_instance.app_server.id
  category      = "Virtual Machine"
  environment   = var.environment

  # Custom attributes
  attributes = {
    "u_terraform_workspace" = terraform.workspace
    "u_managed_by"          = "terraform"
    "u_last_updated"        = timestamp()
  }

  # When the instance is destroyed, the CMDB record goes with it
  depends_on = [aws_instance.app_server]
}
```

## Querying CMDB Data During Terraform Runs

Sometimes you need to read from the CMDB to make infrastructure decisions. For example, you might query the CMDB to find which subnet a server should be placed in based on its classification.

```hcl
# Use a data source to query CMDB for network assignments
data "http" "cmdb_network_info" {
  url = "${var.servicenow_instance_url}/api/now/table/cmdb_ci_network"

  request_headers = {
    Accept        = "application/json"
    Authorization = "Basic ${base64encode("${var.snow_user}:${var.snow_pass}")}"
  }
}

# Parse the CMDB response with locals
locals {
  cmdb_networks = jsondecode(data.http.cmdb_network_info.response_body)
  # Find the approved subnet for production workloads
  prod_subnet = [
    for network in local.cmdb_networks.result :
    network.subnet_id
    if network.environment == "production" && network.status == "approved"
  ][0]
}

# Use CMDB-sourced data in resource creation
resource "aws_instance" "regulated_workload" {
  ami           = var.ami_id
  instance_type = var.instance_type
  subnet_id     = local.prod_subnet

  tags = {
    Name       = "regulated-workload"
    CMDBSource = "true"
  }
}
```

## Building a Terraform Wrapper for CMDB Synchronization

For larger organizations, a wrapper script that automatically synchronizes all Terraform-managed resources with the CMDB provides the best experience.

```python
#!/usr/bin/env python3
# cmdb_sync.py - Synchronize Terraform state with CMDB

import json
import subprocess
import requests

class CMDBSync:
    def __init__(self, cmdb_url, cmdb_token):
        self.cmdb_url = cmdb_url
        self.headers = {
            "Authorization": f"Bearer {cmdb_token}",
            "Content-Type": "application/json"
        }

    def get_terraform_resources(self):
        """Extract all resources from Terraform state."""
        result = subprocess.run(
            ["terraform", "show", "-json"],
            capture_output=True, text=True
        )
        state = json.loads(result.stdout)
        resources = []

        for module in state.get("values", {}).get("root_module", {}).get("resources", []):
            resources.append({
                "type": module["type"],
                "name": module["name"],
                "provider": module["provider_name"],
                "attributes": module["values"]
            })
        return resources

    def upsert_ci(self, resource):
        """Create or update a configuration item in the CMDB."""
        ci_data = {
            "name": f"{resource['type']}.{resource['name']}",
            "ci_type": resource["type"],
            "provider": resource["provider"],
            "managed_by": "terraform",
            "attributes": resource["attributes"]
        }

        # Check if CI already exists
        response = requests.get(
            f"{self.cmdb_url}/api/ci",
            params={"name": ci_data["name"]},
            headers=self.headers
        )

        if response.json().get("count", 0) > 0:
            ci_id = response.json()["results"][0]["id"]
            requests.put(
                f"{self.cmdb_url}/api/ci/{ci_id}",
                json=ci_data,
                headers=self.headers
            )
        else:
            requests.post(
                f"{self.cmdb_url}/api/ci",
                json=ci_data,
                headers=self.headers
            )

    def sync(self):
        """Run a full synchronization."""
        resources = self.get_terraform_resources()
        for resource in resources:
            self.upsert_ci(resource)
        print(f"Synchronized {len(resources)} resources with CMDB")

if __name__ == "__main__":
    sync = CMDBSync(
        cmdb_url="https://cmdb.example.com",
        cmdb_token="your-api-token"
    )
    sync.sync()
```

## Integrating CMDB Checks into CI/CD Pipelines

A robust integration includes CMDB validation as part of your CI/CD pipeline. Before Terraform applies changes, the pipeline checks the CMDB for approval status and compliance.

```yaml
# .github/workflows/terraform-cmdb.yml
name: Terraform with CMDB Integration

on:
  pull_request:
    paths:
      - 'terraform/**'

jobs:
  plan-and-validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Terraform Plan
        run: |
          cd terraform
          terraform init
          terraform plan -out=tfplan
          terraform show -json tfplan > plan.json

      - name: Validate against CMDB policies
        run: |
          # Check that all planned resources have CMDB classification
          python scripts/validate_cmdb_compliance.py plan.json

      - name: Apply and sync CMDB
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        run: |
          cd terraform
          terraform apply -auto-approve tfplan
          # Sync state to CMDB after successful apply
          python scripts/cmdb_sync.py
```

## Handling CMDB Relationships

One of the most valuable aspects of a CMDB is tracking relationships between configuration items. Terraform's dependency graph maps naturally to CMDB relationships.

```hcl
# Define resources with explicit relationships
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "web" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}

resource "aws_instance" "web" {
  subnet_id = aws_subnet.web.id
  ami       = var.ami_id
  instance_type = "t3.medium"
}

# Use null_resource to register relationships in CMDB
resource "null_resource" "cmdb_relationships" {
  triggers = {
    vpc_id      = aws_vpc.main.id
    subnet_id   = aws_subnet.web.id
    instance_id = aws_instance.web.id
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Register parent-child relationships in CMDB
      python3 scripts/register_cmdb_relationship.py \
        --parent "vpc:${aws_vpc.main.id}" \
        --child "subnet:${aws_subnet.web.id}" \
        --type "contains"

      python3 scripts/register_cmdb_relationship.py \
        --parent "subnet:${aws_subnet.web.id}" \
        --child "instance:${aws_instance.web.id}" \
        --type "hosts"
    EOT
  }
}
```

## Best Practices for Terraform-CMDB Integration

When integrating Terraform with CMDB tools, follow these guidelines for a reliable setup.

First, use unique identifiers consistently. Map Terraform resource IDs to CMDB configuration item IDs so you can always reconcile the two systems. Store the CMDB CI ID as a tag on the cloud resource and the Terraform resource address in the CMDB record.

Second, handle drift detection. Schedule regular comparisons between Terraform state and CMDB records. When they diverge, flag the discrepancy for review rather than automatically overwriting either source.

Third, implement lifecycle hooks. Use Terraform's provisioners or wrapper scripts to update the CMDB at each stage of the resource lifecycle: creation, modification, and destruction.

Fourth, keep CMDB updates idempotent. Your integration scripts should safely handle being run multiple times without creating duplicate records. Use upsert operations wherever possible.

Finally, consider using Terraform Cloud or Terraform Enterprise run tasks to trigger CMDB updates as part of the managed workflow. This provides a more reliable integration point than local scripts.

For more on managing Terraform state and tracking infrastructure changes, see our guide on [Terraform State File Structure](https://oneuptime.com/blog/post/2026-02-23-terraform-state-file-structure/view).

## Conclusion

Integrating Terraform with CMDB tools transforms your configuration database from a manually maintained spreadsheet into a living, accurate record of your infrastructure. Whether you use direct API calls, provider-based resources, or wrapper scripts, the key is automating the synchronization so that every Terraform change is reflected in the CMDB without human intervention. Start with simple output-based integrations and evolve toward fully declarative CMDB management as your needs grow.
