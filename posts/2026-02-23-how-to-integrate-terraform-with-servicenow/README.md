# How to Integrate Terraform with ServiceNow

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, ServiceNow, ITSM, Change Management, Infrastructure as Code, Enterprise

Description: Learn how to integrate Terraform with ServiceNow for automated change management, CMDB updates, incident creation, and approval workflows in enterprise environments.

---

Enterprise organizations running Terraform often need to integrate with ServiceNow for change management, configuration management database (CMDB) updates, and approval workflows. This integration bridges the gap between infrastructure-as-code automation and traditional IT service management processes. When done well, it allows teams to maintain the speed of automated deployments while satisfying compliance and audit requirements.

This guide covers practical approaches to integrating Terraform with ServiceNow, from automatic change request creation to CMDB synchronization.

## Understanding the Integration Points

Terraform and ServiceNow typically integrate at several points. Before applying changes, Terraform can create change requests in ServiceNow for approval. After applying changes, it can update the CMDB with new or modified configuration items. If something goes wrong, it can create incidents automatically. The integration happens through the ServiceNow REST API.

## Creating Change Requests Before Apply

Use Terraform's HTTP provider or a custom provider to create ServiceNow change requests as part of the plan-apply workflow.

```hcl
# Variables for ServiceNow integration
variable "servicenow_instance" {
  description = "ServiceNow instance URL"
  type        = string
}

variable "servicenow_username" {
  description = "ServiceNow API username"
  type        = string
  sensitive   = true
}

variable "servicenow_password" {
  description = "ServiceNow API password"
  type        = string
  sensitive   = true
}

variable "change_description" {
  description = "Description of the infrastructure change"
  type        = string
}

# Create a change request in ServiceNow
resource "null_resource" "change_request" {
  triggers = {
    # Trigger when infrastructure changes are planned
    change_hash = sha256(var.change_description)
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Create a change request in ServiceNow
      RESPONSE=$(curl -s -X POST \
        "https://${var.servicenow_instance}/api/now/table/change_request" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        -u "${var.servicenow_username}:${var.servicenow_password}" \
        -d '{
          "short_description": "Terraform Infrastructure Change - ${var.environment}",
          "description": "${var.change_description}",
          "type": "standard",
          "category": "Infrastructure",
          "assignment_group": "${var.assignment_group}",
          "cmdb_ci": "${var.cmdb_ci_sys_id}",
          "risk": "${var.environment == "production" ? "moderate" : "low"}",
          "impact": "${var.environment == "production" ? "2" : "3"}",
          "state": "-5"
        }')

      # Extract and save the change request number
      echo "$RESPONSE" | jq -r '.result.number' > /tmp/change_request_number.txt
      echo "Change Request created: $(cat /tmp/change_request_number.txt)"
    EOT

    environment = {
      SERVICENOW_INSTANCE = var.servicenow_instance
    }
  }
}

# Read the change request number for use in other resources
data "local_file" "change_number" {
  filename   = "/tmp/change_request_number.txt"
  depends_on = [null_resource.change_request]
}
```

## Using a Terraform Module for ServiceNow Integration

Create a reusable module that handles the full lifecycle of ServiceNow change requests.

```hcl
# modules/servicenow-change/main.tf
variable "instance_url" {
  type = string
}

variable "credentials" {
  type = object({
    username = string
    password = string
  })
  sensitive = true
}

variable "change_details" {
  type = object({
    short_description = string
    description       = string
    environment       = string
    category          = string
    assignment_group  = string
    planned_start     = string
    planned_end       = string
  })
}

# Create the change request
resource "null_resource" "create_change" {
  triggers = {
    description = var.change_details.description
    environment = var.change_details.environment
  }

  provisioner "local-exec" {
    command = <<-EOT
      python3 ${path.module}/scripts/create_change.py \
        --instance "${var.instance_url}" \
        --username "${var.credentials.username}" \
        --password "${var.credentials.password}" \
        --short-description "${var.change_details.short_description}" \
        --description "${var.change_details.description}" \
        --category "${var.change_details.category}" \
        --assignment-group "${var.change_details.assignment_group}" \
        --planned-start "${var.change_details.planned_start}" \
        --planned-end "${var.change_details.planned_end}" \
        --output-file "${path.module}/change_result.json"
    EOT
  }
}

# Close the change request after successful apply
resource "null_resource" "close_change" {
  triggers = {
    change_id = null_resource.create_change.id
  }

  provisioner "local-exec" {
    command = <<-EOT
      python3 ${path.module}/scripts/close_change.py \
        --instance "${var.instance_url}" \
        --username "${var.credentials.username}" \
        --password "${var.credentials.password}" \
        --change-file "${path.module}/change_result.json" \
        --status "successful"
    EOT
  }

  depends_on = [null_resource.create_change]
}
```

## CMDB Synchronization

After Terraform creates or modifies infrastructure, update the ServiceNow CMDB to keep it in sync.

```hcl
# Update CMDB after infrastructure provisioning
resource "null_resource" "cmdb_update" {
  for_each = aws_instance.servers

  triggers = {
    instance_id   = each.value.id
    instance_type = each.value.instance_type
    private_ip    = each.value.private_ip
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Update or create CMDB CI for this server
      curl -s -X POST \
        "https://${var.servicenow_instance}/api/now/cmdb/instance/cmdb_ci_server" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        -u "${var.servicenow_username}:${var.servicenow_password}" \
        -d '{
          "name": "${each.value.tags["Name"]}",
          "ip_address": "${each.value.private_ip}",
          "dns_domain": "${var.dns_domain}",
          "os": "Linux",
          "os_version": "Ubuntu 22.04",
          "cpu_count": "${each.value.cpu_core_count}",
          "ram": "${each.value.root_block_device[0].volume_size}",
          "serial_number": "${each.value.id}",
          "environment": "${var.environment}",
          "operational_status": "1",
          "install_status": "1",
          "discovery_source": "Terraform",
          "attributes": {
            "instance_type": "${each.value.instance_type}",
            "availability_zone": "${each.value.availability_zone}",
            "vpc_id": "${each.value.vpc_security_group_ids[0]}",
            "terraform_workspace": "${terraform.workspace}"
          }
        }'
    EOT
  }

  # Remove from CMDB when destroyed
  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      curl -s -X PATCH \
        "https://${var.servicenow_instance}/api/now/cmdb/instance/cmdb_ci_server" \
        -H "Content-Type: application/json" \
        -u "${var.servicenow_username}:${var.servicenow_password}" \
        -d '{
          "serial_number": "${each.value.id}",
          "operational_status": "6",
          "install_status": "7"
        }'
    EOT
  }
}
```

## Incident Creation on Failure

Automatically create ServiceNow incidents when Terraform operations fail.

```hcl
# Lambda function for creating ServiceNow incidents
resource "aws_lambda_function" "snow_incident" {
  filename         = data.archive_file.snow_incident.output_path
  function_name    = "servicenow-incident-creator"
  role             = aws_iam_role.snow_lambda.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 30
  source_code_hash = data.archive_file.snow_incident.output_base64sha256

  environment {
    variables = {
      SERVICENOW_INSTANCE = var.servicenow_instance
      SERVICENOW_USER     = var.servicenow_username
      SERVICENOW_PASS     = var.servicenow_password
      ASSIGNMENT_GROUP    = var.incident_assignment_group
    }
  }
}

# EventBridge rule to catch Terraform Cloud run failures
resource "aws_cloudwatch_event_rule" "terraform_failure" {
  name        = "terraform-run-failure"
  description = "Capture Terraform Cloud run failures"

  event_pattern = jsonencode({
    source      = ["app.terraform.io"]
    detail-type = ["Run Errored"]
  })
}

resource "aws_cloudwatch_event_target" "snow_incident" {
  rule      = aws_cloudwatch_event_rule.terraform_failure.name
  target_id = "CreateSNOWIncident"
  arn       = aws_lambda_function.snow_incident.arn
}
```

## Approval Workflows

For production changes, require ServiceNow approval before Terraform can apply.

```hcl
# CI/CD integration that waits for ServiceNow approval
resource "null_resource" "wait_for_approval" {
  count = var.environment == "production" ? 1 : 0

  triggers = {
    change_id = null_resource.change_request.id
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Poll ServiceNow until change is approved
      python3 ${path.module}/scripts/wait_for_approval.py \
        --instance "${var.servicenow_instance}" \
        --username "${var.servicenow_username}" \
        --password "${var.servicenow_password}" \
        --change-file "${path.module}/change_result.json" \
        --timeout 3600 \
        --poll-interval 30
    EOT
  }

  depends_on = [null_resource.change_request]
}
```

## Terraform Cloud Integration

For teams using Terraform Cloud, integrate ServiceNow via run tasks.

```hcl
# Terraform Cloud run task for ServiceNow
resource "tfe_organization_run_task" "servicenow" {
  organization = var.tfc_organization
  url          = "https://${var.servicenow_instance}/api/hcl/terraform/run-task"
  name         = "servicenow-change-management"
  enabled      = true
  hmac_key     = var.run_task_hmac_key
}

# Associate run task with workspaces
resource "tfe_workspace_run_task" "servicenow" {
  for_each = toset(var.production_workspace_ids)

  workspace_id      = each.value
  task_id           = tfe_organization_run_task.servicenow.id
  enforcement_level = "mandatory"
  stage             = "pre_apply"
}
```

## Best Practices

Use standard change templates for routine Terraform operations to avoid manual approval bottlenecks. Keep CMDB records updated through automation rather than relying on manual processes. Implement a feedback loop where ServiceNow incidents created from Terraform failures are linked back to the relevant change request.

For related enterprise integration patterns, see our guide on [integrating Terraform with Jira for change management](https://oneuptime.com/blog/post/2026-02-23-how-to-integrate-terraform-with-jira-for-change-management/view) and [implementing cost governance with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-cost-governance-with-terraform/view).

## Conclusion

Integrating Terraform with ServiceNow bridges the gap between modern infrastructure automation and enterprise IT governance. By automating change requests, CMDB updates, and incident creation, you maintain compliance and audit trails without slowing down your deployment velocity. The key is to automate as much of the ServiceNow workflow as possible so that it supports rather than hinders your infrastructure-as-code practices.
