# How to Use Terraform with Webhook-Based Workflows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Webhooks, Automation, DevOps, Infrastructure as Code, CI/CD

Description: Learn how to integrate Terraform with webhook-based workflows to trigger infrastructure changes, send notifications, and connect with external systems automatically.

---

Webhooks are the glue that connects modern systems together. When you combine Terraform with webhook-based workflows, you can trigger infrastructure changes from external events, notify downstream systems when infrastructure is provisioned, and create end-to-end automation pipelines that span multiple platforms. This guide shows you how to build webhook integrations that make Terraform a first-class participant in event-driven architectures.

## Understanding Webhooks in the Terraform Context

Webhooks work in two directions with Terraform. Inbound webhooks trigger Terraform runs when external events occur, such as a new release being published or an alert firing. Outbound webhooks notify external systems when Terraform completes an operation, such as posting to Slack when a deployment finishes or updating a CMDB after resources are created.

Both directions are valuable, and most production setups use a combination of the two.

## Creating Webhook Endpoints with Terraform

You can use Terraform to provision the infrastructure that receives webhooks, such as API Gateway endpoints backed by Lambda functions.

```hcl
# Create an API Gateway to receive webhooks
resource "aws_apigatewayv2_api" "webhook_receiver" {
  name          = "terraform-webhook-receiver"
  protocol_type = "HTTP"
  description   = "Receives webhooks and triggers Terraform runs"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.webhook_receiver.id
  name        = "$default"
  auto_deploy = true
}

# Lambda function to process incoming webhooks
resource "aws_lambda_function" "webhook_processor" {
  filename         = "lambda/webhook_processor.zip"
  function_name    = "terraform-webhook-processor"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "python3.12"
  source_code_hash = filebase64sha256("lambda/webhook_processor.zip")

  environment {
    variables = {
      TFC_TOKEN         = var.tfc_token
      TFC_ORGANIZATION  = var.tfc_organization
      WEBHOOK_SECRET    = var.webhook_secret
    }
  }
}

# Connect API Gateway to Lambda
resource "aws_apigatewayv2_integration" "webhook" {
  api_id                 = aws_apigatewayv2_api.webhook_receiver.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.webhook_processor.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "webhook" {
  api_id    = aws_apigatewayv2_api.webhook_receiver.id
  route_key = "POST /webhook/{source}"
  target    = "integrations/${aws_apigatewayv2_integration.webhook.id}"
}

# Allow API Gateway to invoke Lambda
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.webhook_processor.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.webhook_receiver.execution_arn}/*/*"
}

output "webhook_url" {
  value = "${aws_apigatewayv2_stage.default.invoke_url}/webhook"
}
```

## Processing Inbound Webhooks to Trigger Terraform

The Lambda function validates incoming webhooks and triggers Terraform Cloud runs.

```python
# lambda/index.py - Process webhooks and trigger Terraform runs

import json
import hmac
import hashlib
import os
import urllib.request

TFC_TOKEN = os.environ["TFC_TOKEN"]
TFC_ORG = os.environ["TFC_ORGANIZATION"]
WEBHOOK_SECRET = os.environ["WEBHOOK_SECRET"]

# Map webhook sources to Terraform Cloud workspaces
WEBHOOK_WORKSPACE_MAP = {
    "github-release": "production-deploy",
    "alert-scaling": "auto-scaler",
    "security-scan": "security-remediation",
    "config-change": "configuration-update"
}

def handler(event, context):
    """Process incoming webhook and trigger appropriate Terraform run."""
    # Extract source from path parameter
    source = event.get("pathParameters", {}).get("source", "unknown")
    body = event.get("body", "")

    # Verify webhook signature
    signature = event.get("headers", {}).get("x-webhook-signature", "")
    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        body.encode(),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(signature, f"sha256={expected}"):
        return {"statusCode": 401, "body": "Invalid signature"}

    # Parse the webhook payload
    payload = json.loads(body)

    # Find the matching workspace
    workspace_name = WEBHOOK_WORKSPACE_MAP.get(source)
    if not workspace_name:
        return {"statusCode": 404, "body": f"No workspace mapped for source: {source}"}

    # Get workspace ID from Terraform Cloud
    workspace_id = get_workspace_id(workspace_name)

    # Trigger a Terraform run with variables from the webhook
    run_id = trigger_run(workspace_id, payload, source)

    return {
        "statusCode": 200,
        "body": json.dumps({
            "message": f"Triggered run {run_id} in workspace {workspace_name}",
            "source": source
        })
    }

def get_workspace_id(workspace_name):
    """Look up a Terraform Cloud workspace ID by name."""
    url = f"https://app.terraform.io/api/v2/organizations/{TFC_ORG}/workspaces/{workspace_name}"
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {TFC_TOKEN}",
        "Content-Type": "application/vnd.api+json"
    })
    response = urllib.request.urlopen(req)
    data = json.loads(response.read())
    return data["data"]["id"]

def trigger_run(workspace_id, webhook_payload, source):
    """Trigger a new run in Terraform Cloud."""
    run_data = {
        "data": {
            "attributes": {
                "message": f"Triggered by webhook: {source}",
                "auto-apply": source != "github-release",
                "variables": [
                    {
                        "key": "webhook_payload",
                        "value": json.dumps(webhook_payload)
                    }
                ]
            },
            "relationships": {
                "workspace": {
                    "data": {"type": "workspaces", "id": workspace_id}
                }
            },
            "type": "runs"
        }
    }

    url = "https://app.terraform.io/api/v2/runs"
    data = json.dumps(run_data).encode()
    req = urllib.request.Request(url, data=data, method="POST", headers={
        "Authorization": f"Bearer {TFC_TOKEN}",
        "Content-Type": "application/vnd.api+json"
    })
    response = urllib.request.urlopen(req)
    result = json.loads(response.read())
    return result["data"]["id"]
```

## Sending Outbound Webhooks After Terraform Apply

Use Terraform provisioners or Terraform Cloud notifications to send webhooks when infrastructure changes complete.

```hcl
# Send a webhook notification after resource creation
resource "aws_instance" "web_server" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  tags = {
    Name = "web-server-${var.environment}"
  }
}

# Notify external systems via webhook after creation
resource "null_resource" "notify_deployment" {
  triggers = {
    instance_id = aws_instance.web_server.id
  }

  provisioner "local-exec" {
    command = <<-EOT
      curl -s -X POST "${var.deployment_webhook_url}" \
        -H "Content-Type: application/json" \
        -H "X-Webhook-Secret: ${var.webhook_secret}" \
        -d '{
          "event": "resource_created",
          "resource_type": "aws_instance",
          "resource_id": "${aws_instance.web_server.id}",
          "environment": "${var.environment}",
          "ip_address": "${aws_instance.web_server.private_ip}",
          "timestamp": "${timestamp()}"
        }'
    EOT
  }

  # Send webhook on destroy too
  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      curl -s -X POST "${var.deployment_webhook_url}" \
        -H "Content-Type: application/json" \
        -d '{
          "event": "resource_destroyed",
          "resource_type": "aws_instance",
          "resource_id": "${self.triggers.instance_id}",
          "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"
        }'
    EOT
  }
}
```

## Terraform Cloud Notification Webhooks

If you use Terraform Cloud, you can configure run notifications to send webhooks automatically.

```hcl
# Configure Terraform Cloud workspace notifications
resource "tfe_notification_configuration" "deployment_webhook" {
  name             = "Deployment Notifications"
  enabled          = true
  workspace_id     = tfe_workspace.production.id
  destination_type = "generic"
  url              = var.deployment_webhook_url
  token            = var.webhook_auth_token

  triggers = [
    "run:completed",
    "run:errored",
    "run:needs_attention"
  ]
}

# Send notifications to Slack as well
resource "tfe_notification_configuration" "slack_notification" {
  name             = "Slack Notifications"
  enabled          = true
  workspace_id     = tfe_workspace.production.id
  destination_type = "slack"
  url              = var.slack_webhook_url

  triggers = [
    "run:completed",
    "run:errored"
  ]
}
```

## Building a Webhook Chain

You can create sophisticated automation pipelines by chaining webhooks together. One Terraform apply sends a webhook that triggers another Terraform run.

```hcl
# Stage 1: Provision infrastructure
resource "aws_ecs_cluster" "app" {
  name = "application-cluster"
}

# After cluster is created, trigger the application deployment workspace
resource "null_resource" "trigger_app_deploy" {
  triggers = {
    cluster_arn = aws_ecs_cluster.app.arn
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Trigger the application deployment workspace in Terraform Cloud
      curl -s -X POST \
        "https://app.terraform.io/api/v2/runs" \
        -H "Authorization: Bearer ${var.tfc_token}" \
        -H "Content-Type: application/vnd.api+json" \
        -d '{
          "data": {
            "attributes": {
              "message": "Triggered by infrastructure provisioning",
              "auto-apply": true
            },
            "relationships": {
              "workspace": {
                "data": {
                  "type": "workspaces",
                  "id": "${var.app_deploy_workspace_id}"
                }
              }
            },
            "type": "runs"
          }
        }'
    EOT
  }
}
```

## Webhook Security

Always verify webhook signatures to prevent unauthorized triggers.

```python
# webhook_verification.py - Verify webhook signatures

import hmac
import hashlib

def verify_github_webhook(payload, signature, secret):
    """Verify a GitHub webhook signature."""
    expected = "sha256=" + hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

def verify_generic_webhook(payload, signature, secret):
    """Verify a generic HMAC webhook signature."""
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

## Best Practices

Always validate webhook payloads before triggering Terraform runs. An unvalidated webhook could trigger unintended infrastructure changes.

Use webhook secrets and signature verification on every endpoint. Never expose a webhook URL without authentication.

Implement idempotency in your webhook handlers. The same webhook might be delivered multiple times, and your handler should produce the same result regardless.

Log all webhook events for auditing. Include the source, timestamp, payload hash, and resulting action in your logs.

Set timeouts on webhook-triggered runs. If a Terraform apply takes too long, the webhook handler should not block indefinitely.

For related automation patterns, see our guide on [Terraform Pipeline with GitHub Actions](https://oneuptime.com/blog/post/2025-12-20-terraform-pipeline-github-actions/view).

## Conclusion

Webhooks connect Terraform to the broader ecosystem of tools and services your organization uses. By setting up inbound webhooks to trigger Terraform runs and outbound webhooks to notify external systems, you create automated infrastructure pipelines that respond to events in real time. Whether you are triggering deployments from release events or notifying CMDBs after provisioning, webhooks make Terraform a responsive participant in your automation workflow.
