# How to Integrate Terraform with Jira for Change Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Jira, Change Management, DevOps, Infrastructure as Code, Atlassian

Description: Learn how to integrate Terraform with Jira for infrastructure change management, including automated ticket creation, plan attachments, and approval workflows.

---

Jira is one of the most widely used project management tools in software development, and many organizations use it for change management as well. Integrating Terraform with Jira creates an auditable trail of infrastructure changes, links those changes to business requirements, and can enforce approval workflows for sensitive environments. This integration turns every Terraform apply into a documented, traceable event.

This guide covers practical approaches to connecting Terraform with Jira, from simple ticket creation to complete change management workflows.

## Understanding the Integration Goals

The primary goals of a Terraform-Jira integration are traceability, approval, and documentation. Every infrastructure change should be linked to a Jira ticket that describes why the change is being made. For production changes, the ticket should require approval before Terraform can apply. After the change is applied, the ticket should be updated with the results.

## Creating Jira Tickets for Infrastructure Changes

Use Terraform to automatically create Jira tickets when infrastructure changes are planned.

```hcl
# Variables for Jira integration
variable "jira_base_url" {
  description = "Jira instance URL"
  type        = string
}

variable "jira_api_token" {
  description = "Jira API token"
  type        = string
  sensitive   = true
}

variable "jira_email" {
  description = "Jira account email"
  type        = string
}

variable "jira_project_key" {
  description = "Jira project key for infrastructure changes"
  type        = string
  default     = "INFRA"
}

variable "change_summary" {
  description = "Summary of the infrastructure change"
  type        = string
}

# Create a Jira ticket for the infrastructure change
resource "null_resource" "jira_ticket" {
  triggers = {
    change_summary = var.change_summary
    timestamp      = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Create Jira ticket via REST API
      RESPONSE=$(curl -s -X POST \
        "${var.jira_base_url}/rest/api/3/issue" \
        -H "Content-Type: application/json" \
        -H "Authorization: Basic $(echo -n '${var.jira_email}:${var.jira_api_token}' | base64)" \
        -d '{
          "fields": {
            "project": {
              "key": "${var.jira_project_key}"
            },
            "summary": "Infrastructure Change: ${var.change_summary}",
            "description": {
              "type": "doc",
              "version": 1,
              "content": [
                {
                  "type": "paragraph",
                  "content": [
                    {
                      "type": "text",
                      "text": "Automated infrastructure change via Terraform"
                    }
                  ]
                },
                {
                  "type": "paragraph",
                  "content": [
                    {
                      "type": "text",
                      "text": "Environment: ${var.environment}"
                    }
                  ]
                },
                {
                  "type": "paragraph",
                  "content": [
                    {
                      "type": "text",
                      "text": "Workspace: ${terraform.workspace}"
                    }
                  ]
                }
              ]
            },
            "issuetype": {
              "name": "Task"
            },
            "priority": {
              "name": "${var.environment == "production" ? "High" : "Medium"}"
            },
            "labels": [
              "terraform",
              "infrastructure",
              "${var.environment}"
            ]
          }
        }')

      # Save the ticket key
      echo "$RESPONSE" | jq -r '.key' > /tmp/jira_ticket_key.txt
      echo "Jira ticket created: $(cat /tmp/jira_ticket_key.txt)"
    EOT
  }
}
```

## Building a Reusable Jira Integration Module

Create a module that handles the complete change management lifecycle.

```hcl
# modules/jira-change/variables.tf
variable "jira_config" {
  type = object({
    base_url    = string
    email       = string
    api_token   = string
    project_key = string
  })
  sensitive = true
}

variable "change" {
  type = object({
    summary     = string
    description = string
    environment = string
    components  = list(string)
    assignee    = string
  })
}

variable "terraform_plan_output" {
  description = "Output of terraform plan for attachment"
  type        = string
  default     = ""
}

# modules/jira-change/main.tf
# Create the change ticket
resource "null_resource" "create_ticket" {
  triggers = {
    change_hash = sha256("${var.change.summary}-${var.change.description}")
  }

  provisioner "local-exec" {
    command = <<-EOT
      python3 ${path.module}/scripts/jira_create.py \
        --base-url "${var.jira_config.base_url}" \
        --email "${var.jira_config.email}" \
        --token "${var.jira_config.api_token}" \
        --project "${var.jira_config.project_key}" \
        --summary "${var.change.summary}" \
        --description "${var.change.description}" \
        --environment "${var.change.environment}" \
        --components '${jsonencode(var.change.components)}' \
        --assignee "${var.change.assignee}" \
        --output "${path.module}/ticket.json"
    EOT
  }
}

# Attach Terraform plan output to the ticket
resource "null_resource" "attach_plan" {
  count = var.terraform_plan_output != "" ? 1 : 0

  triggers = {
    ticket_id = null_resource.create_ticket.id
  }

  provisioner "local-exec" {
    command = <<-EOT
      python3 ${path.module}/scripts/jira_attach.py \
        --base-url "${var.jira_config.base_url}" \
        --email "${var.jira_config.email}" \
        --token "${var.jira_config.api_token}" \
        --ticket-file "${path.module}/ticket.json" \
        --attachment "${var.terraform_plan_output}" \
        --filename "terraform-plan.txt"
    EOT
  }

  depends_on = [null_resource.create_ticket]
}

# Update ticket after successful apply
resource "null_resource" "update_ticket" {
  triggers = {
    ticket_id = null_resource.create_ticket.id
  }

  provisioner "local-exec" {
    command = <<-EOT
      python3 ${path.module}/scripts/jira_transition.py \
        --base-url "${var.jira_config.base_url}" \
        --email "${var.jira_config.email}" \
        --token "${var.jira_config.api_token}" \
        --ticket-file "${path.module}/ticket.json" \
        --transition "Done" \
        --comment "Terraform apply completed successfully at $(date -u)"
    EOT
  }

  depends_on = [null_resource.create_ticket]
}
```

## CI/CD Pipeline Integration

Integrate the Jira workflow into your CI/CD pipeline for fully automated change management.

```hcl
# GitHub Actions or similar CI/CD pipeline configuration
# managed through Terraform

# CodeBuild project for Terraform with Jira integration
resource "aws_codebuild_project" "terraform_with_jira" {
  name         = "terraform-deploy-${var.environment}"
  description  = "Terraform deployment with Jira change management"
  service_role = aws_iam_role.codebuild.arn

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type    = "BUILD_GENERAL1_SMALL"
    image           = "hashicorp/terraform:latest"
    type            = "LINUX_CONTAINER"
    privileged_mode = false

    environment_variable {
      name  = "JIRA_BASE_URL"
      value = var.jira_base_url
    }

    environment_variable {
      name  = "JIRA_EMAIL"
      value = var.jira_email
    }

    environment_variable {
      name  = "JIRA_API_TOKEN"
      value = var.jira_api_token
      type  = "SECRETS_MANAGER"
    }

    environment_variable {
      name  = "JIRA_PROJECT"
      value = var.jira_project_key
    }

    environment_variable {
      name  = "ENVIRONMENT"
      value = var.environment
    }
  }

  source {
    type      = "GITHUB"
    location  = var.github_repo_url
    buildspec = <<-YAML
      version: 0.2
      phases:
        pre_build:
          commands:
            - terraform init
            - terraform plan -out=tfplan
            - terraform show -no-color tfplan > plan_output.txt
            # Create Jira ticket with plan details
            - python3 scripts/create_jira_change.py
        build:
          commands:
            # Wait for approval if production
            - |
              if [ "$ENVIRONMENT" = "production" ]; then
                python3 scripts/wait_for_jira_approval.py
              fi
            - terraform apply tfplan
        post_build:
          commands:
            # Update Jira ticket with results
            - python3 scripts/update_jira_change.py --status success
    YAML
  }
}
```

## Linking Terraform State to Jira

Track which Jira tickets correspond to which Terraform state changes.

```hcl
# Store Jira ticket reference in Terraform tags
locals {
  jira_ticket = try(trimspace(file("/tmp/jira_ticket_key.txt")), "UNKNOWN")
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type

  tags = merge(var.common_tags, {
    Name             = "app-server-${var.environment}"
    ChangeTicket     = local.jira_ticket
    LastDeployedBy   = var.deployer_email
    LastDeployedAt   = timestamp()
  })
}

# Output the change tracking info
output "change_tracking" {
  description = "Change management tracking information"
  value = {
    jira_ticket     = local.jira_ticket
    environment     = var.environment
    workspace       = terraform.workspace
    deployed_by     = var.deployer_email
    deployment_time = timestamp()
  }
}
```

## Querying Jira for Change History

Use Terraform data sources to query Jira for historical change information.

```hcl
# Query recent infrastructure changes from Jira
resource "null_resource" "change_history" {
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Search for recent infrastructure change tickets
      curl -s -X POST \
        "${var.jira_base_url}/rest/api/3/search" \
        -H "Content-Type: application/json" \
        -H "Authorization: Basic $(echo -n '${var.jira_email}:${var.jira_api_token}' | base64)" \
        -d '{
          "jql": "project = ${var.jira_project_key} AND labels = terraform AND labels = ${var.environment} AND created >= -30d ORDER BY created DESC",
          "maxResults": 20,
          "fields": ["summary", "status", "created", "assignee"]
        }' > /tmp/recent_changes.json

      echo "Recent infrastructure changes:"
      cat /tmp/recent_changes.json | jq '.issues[] | {key: .key, summary: .fields.summary, status: .fields.status.name}'
    EOT
  }
}
```

## Approval Workflow for Production Changes

Implement a Jira-based approval gate for production deployments.

```hcl
# Script to wait for Jira approval
resource "null_resource" "wait_for_approval" {
  count = var.environment == "production" ? 1 : 0

  triggers = {
    ticket_id = null_resource.jira_ticket.id
  }

  provisioner "local-exec" {
    command = <<-EOT
      TICKET_KEY=$(cat /tmp/jira_ticket_key.txt)
      echo "Waiting for approval on $TICKET_KEY..."

      # Poll Jira until ticket is approved or timeout
      TIMEOUT=3600
      ELAPSED=0
      INTERVAL=30

      while [ $ELAPSED -lt $TIMEOUT ]; do
        STATUS=$(curl -s \
          "${var.jira_base_url}/rest/api/3/issue/$TICKET_KEY" \
          -H "Authorization: Basic $(echo -n '${var.jira_email}:${var.jira_api_token}' | base64)" \
          | jq -r '.fields.status.name')

        if [ "$STATUS" = "Approved" ] || [ "$STATUS" = "Done" ]; then
          echo "Change approved. Proceeding with apply."
          exit 0
        elif [ "$STATUS" = "Rejected" ]; then
          echo "Change rejected. Aborting."
          exit 1
        fi

        echo "Status: $STATUS. Waiting..."
        sleep $INTERVAL
        ELAPSED=$((ELAPSED + INTERVAL))
      done

      echo "Timeout waiting for approval."
      exit 1
    EOT
  }

  depends_on = [null_resource.jira_ticket]
}
```

## Best Practices

Keep Jira tickets focused and informative. Include the Terraform plan output as an attachment so reviewers can see exactly what will change. Use Jira labels consistently to categorize infrastructure changes by environment, service, and team. Automate as much of the workflow as possible to avoid manual steps that slow down deployments.

For enterprise teams, consider using Jira Service Management for more structured change management workflows with built-in approval chains and risk assessment.

For related integration patterns, see our guides on [integrating Terraform with ServiceNow](https://oneuptime.com/blog/post/2026-02-23-how-to-integrate-terraform-with-servicenow/view) and [implementing cost governance with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-cost-governance-with-terraform/view).

## Conclusion

Integrating Terraform with Jira creates an auditable, traceable change management process that satisfies both engineering and compliance requirements. By automating ticket creation, plan attachment, approval workflows, and status updates, you maintain the speed of infrastructure-as-code while providing the documentation and approval gates that enterprise environments require. The result is a deployment process that is both fast and compliant, giving teams confidence that every infrastructure change is properly documented and authorized.
