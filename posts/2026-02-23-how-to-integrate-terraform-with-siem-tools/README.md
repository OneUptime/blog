# How to Integrate Terraform with SIEM Tools

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, SIEM, Security, DevOps, Infrastructure as Code, Compliance, Monitoring

Description: Learn how to integrate Terraform with SIEM tools like Splunk, Elastic SIEM, and Microsoft Sentinel to monitor infrastructure changes and detect security threats.

---

Security Information and Event Management (SIEM) tools are essential for monitoring security events across your infrastructure. Integrating Terraform with SIEM tools ensures that infrastructure changes are tracked, analyzed, and correlated with other security events. This guide covers how to send Terraform activity to popular SIEM platforms and how to manage SIEM infrastructure with Terraform.

## Why Integrate Terraform with SIEM?

Every Terraform operation modifies your cloud infrastructure. These changes can create security vulnerabilities if not monitored properly. A new security group rule might expose a service to the internet. An IAM policy change might grant excessive permissions. By sending Terraform activity to your SIEM, you can detect unauthorized infrastructure changes, correlate infrastructure modifications with security incidents, maintain audit trails for compliance requirements, alert on high-risk changes like security group modifications, and track who made changes and when.

## Prerequisites

You need Terraform version 1.0 or later, access to a SIEM platform (Splunk, Elastic, or Microsoft Sentinel), appropriate API keys or credentials for your SIEM, and a CI/CD pipeline for running Terraform.

## Method 1: Integrating Terraform with Splunk

Splunk is one of the most popular SIEM platforms. Here is how to send Terraform events to Splunk.

```hcl
# splunk-integration.tf
# Configure the Splunk provider for Terraform
terraform {
  required_providers {
    splunk = {
      source  = "splunk/splunk"
      version = "~> 1.4"
    }
  }
}

provider "splunk" {
  url                  = var.splunk_url
  username             = var.splunk_username
  password             = var.splunk_password
  insecure_skip_verify = false
}

# Create a Splunk index for Terraform events
resource "splunk_indexes" "terraform" {
  name                  = "terraform_events"
  datatype              = "event"
  max_total_data_size_mb = 10240
  frozen_time_period_in_secs = 7776000  # 90 days
}

# Create a Splunk saved search for detecting high-risk changes
resource "splunk_saved_searches" "high_risk_changes" {
  name    = "Terraform High Risk Changes"
  search  = "index=terraform_events action=apply (resource_type=aws_security_group OR resource_type=aws_iam_policy OR resource_type=aws_s3_bucket_policy) | stats count by resource_type, change_type, user"

  alert_type            = "number of events"
  alert_comparator      = "greater than"
  alert_threshold       = "0"
  alert_suppress        = true
  alert_suppress_period = "1h"

  cron_schedule         = "*/15 * * * *"
  is_scheduled          = true

  actions               = "email"
  action_email_to       = var.security_team_email
  action_email_subject  = "Terraform High Risk Infrastructure Change Detected"
}

# Create a HEC (HTTP Event Collector) input for receiving Terraform events
resource "splunk_inputs_http_event_collector" "terraform" {
  name       = "terraform-events"
  index      = splunk_indexes.terraform.name
  sourcetype = "terraform:event"
  disabled   = false

  use_ack = true
}
```

Send events to Splunk from your Terraform pipeline:

```bash
#!/bin/bash
# send-to-splunk.sh
# Send Terraform events to Splunk HEC

SPLUNK_HEC_URL="$1"
SPLUNK_HEC_TOKEN="$2"
EVENT_TYPE="$3"  # plan, apply, destroy
WORKSPACE="$4"
STATUS="$5"
PLAN_SUMMARY="$6"
USER="$7"

# Build the event payload
PAYLOAD=$(cat <<EOF
{
  "event": {
    "action": "${EVENT_TYPE}",
    "workspace": "${WORKSPACE}",
    "status": "${STATUS}",
    "plan_summary": "${PLAN_SUMMARY}",
    "user": "${USER}",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  },
  "sourcetype": "terraform:event",
  "index": "terraform_events"
}
EOF
)

# Send to Splunk HEC
curl -k -X POST \
  -H "Authorization: Splunk ${SPLUNK_HEC_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}" \
  "${SPLUNK_HEC_URL}/services/collector/event"
```

```hcl
# terraform-splunk-logging.tf
# Send Terraform apply events to Splunk
resource "null_resource" "splunk_event" {
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOT
      bash ${path.module}/scripts/send-to-splunk.sh \
        "${var.splunk_hec_url}" \
        "${var.splunk_hec_token}" \
        "apply" \
        "${terraform.workspace}" \
        "success" \
        "Infrastructure apply completed" \
        "${var.terraform_user}"
    EOT
  }
}
```

## Method 2: Integrating Terraform with Elastic SIEM

Elastic Security (formerly Elastic SIEM) can ingest Terraform events through Elasticsearch.

```hcl
# elastic-integration.tf
# Configure the Elasticsearch provider
terraform {
  required_providers {
    elasticstack = {
      source  = "elastic/elasticstack"
      version = "~> 0.9"
    }
  }
}

provider "elasticstack" {
  elasticsearch {
    endpoints = [var.elasticsearch_url]
    username  = var.elasticsearch_username
    password  = var.elasticsearch_password
  }
}

# Create an index template for Terraform events
resource "elasticstack_elasticsearch_index_template" "terraform" {
  name = "terraform-events"

  index_patterns = ["terraform-events-*"]

  template {
    settings = jsonencode({
      number_of_shards   = 1
      number_of_replicas = 1
      "index.lifecycle.name" = "terraform-events-policy"
    })

    mappings = jsonencode({
      properties = {
        "@timestamp" = { type = "date" }
        action       = { type = "keyword" }
        workspace    = { type = "keyword" }
        status       = { type = "keyword" }
        user         = { type = "keyword" }
        resource_type = { type = "keyword" }
        change_type  = { type = "keyword" }
        plan_summary = { type = "text" }
        resources_created  = { type = "integer" }
        resources_modified = { type = "integer" }
        resources_destroyed = { type = "integer" }
      }
    })
  }
}

# Create an ILM policy for Terraform event retention
resource "elasticstack_elasticsearch_index_lifecycle" "terraform" {
  name = "terraform-events-policy"

  hot {
    min_age = "0ms"
    set_priority {
      priority = 100
    }
    rollover {
      max_primary_shard_size = "50gb"
      max_age                = "7d"
    }
  }

  warm {
    min_age = "30d"
    set_priority {
      priority = 50
    }
  }

  delete {
    min_age = "90d"
    delete {}
  }
}
```

```hcl
# elastic-alerts.tf
# Create Kibana detection rules for Terraform events

# Send Terraform events to Elasticsearch
resource "null_resource" "elastic_event" {
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOT
      curl -X POST \
        -H "Content-Type: application/json" \
        -u "${var.elasticsearch_username}:${var.elasticsearch_password}" \
        -d '{
          "@timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
          "action": "apply",
          "workspace": "${terraform.workspace}",
          "status": "success",
          "user": "${var.terraform_user}",
          "event.kind": "event",
          "event.category": "configuration",
          "event.type": "change"
        }' \
        "${var.elasticsearch_url}/terraform-events-$(date +%Y.%m.%d)/_doc"
    EOT
  }
}
```

## Method 3: Integrating Terraform with Microsoft Sentinel

Microsoft Sentinel is Azure's cloud-native SIEM solution.

```hcl
# sentinel-integration.tf
# Configure Azure resources for Sentinel integration
provider "azurerm" {
  features {}
}

# Create a Log Analytics workspace for Sentinel
resource "azurerm_log_analytics_workspace" "sentinel" {
  name                = "sentinel-terraform"
  location            = var.azure_location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 90
}

# Enable Microsoft Sentinel on the workspace
resource "azurerm_sentinel_log_analytics_workspace_onboarding" "main" {
  workspace_id = azurerm_log_analytics_workspace.sentinel.id
}

# Create a custom table for Terraform events
resource "azurerm_log_analytics_workspace_table" "terraform_events" {
  workspace_id = azurerm_log_analytics_workspace.sentinel.id
  name         = "TerraformEvents_CL"

  retention_in_days      = 90
  total_retention_in_days = 180
}

# Create a Sentinel analytics rule for detecting suspicious changes
resource "azurerm_sentinel_alert_rule_scheduled" "suspicious_iam_changes" {
  name                       = "Suspicious Terraform IAM Changes"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.sentinel.id
  display_name               = "Suspicious Terraform IAM Changes"
  severity                   = "High"
  query                      = <<-QUERY
    TerraformEvents_CL
    | where action_s == "apply"
    | where resource_type_s has_any ("aws_iam", "azurerm_role", "google_project_iam")
    | where TimeGenerated > ago(1h)
    | summarize count() by user_s, resource_type_s, workspace_s
  QUERY

  query_frequency = "PT15M"
  query_period    = "PT1H"

  trigger_operator  = "GreaterThan"
  trigger_threshold = 0

  incident_configuration {
    create_incident = true
    grouping {
      enabled                 = true
      lookback_duration       = "PT5H"
      reopen_closed_incidents = false
      entity_matching_method  = "AllEntities"
    }
  }
}
```

## Parsing Terraform Plan Output for SIEM

Extract structured data from Terraform plan output to send to your SIEM.

```bash
#!/bin/bash
# parse-terraform-plan.sh
# Parse Terraform plan JSON output for SIEM ingestion

PLAN_FILE="$1"
OUTPUT_FILE="$2"

# Generate JSON plan output
terraform show -json "$PLAN_FILE" > /tmp/plan.json

# Extract resource changes using jq
jq '[.resource_changes[] | {
  address: .address,
  resource_type: .type,
  change_type: .change.actions[0],
  provider: .provider_name,
  before: (.change.before | keys // []),
  after: (.change.after | keys // [])
}]' /tmp/plan.json > "$OUTPUT_FILE"

# Count changes by type
CREATED=$(jq '[.[] | select(.change_type == "create")] | length' "$OUTPUT_FILE")
UPDATED=$(jq '[.[] | select(.change_type == "update")] | length' "$OUTPUT_FILE")
DELETED=$(jq '[.[] | select(.change_type == "delete")] | length' "$OUTPUT_FILE")

echo "Resources to create: $CREATED"
echo "Resources to update: $UPDATED"
echo "Resources to delete: $DELETED"
```

## CI/CD Pipeline with SIEM Integration

```yaml
# .github/workflows/terraform-siem.yml
name: Terraform with SIEM Logging

on:
  push:
    branches: [main]

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan -out=tfplan

      # Parse plan and send to SIEM
      - name: Send Plan to SIEM
        run: |
          terraform show -json tfplan > plan.json
          # Extract and send resource changes
          python3 scripts/send-to-siem.py \
            --plan-file plan.json \
            --siem-url "${{ secrets.SIEM_URL }}" \
            --siem-token "${{ secrets.SIEM_TOKEN }}" \
            --event-type "plan" \
            --user "${{ github.actor }}"

      - name: Terraform Apply
        run: terraform apply -auto-approve tfplan

      # Log the apply event to SIEM
      - name: Log Apply to SIEM
        if: always()
        run: |
          python3 scripts/send-to-siem.py \
            --siem-url "${{ secrets.SIEM_URL }}" \
            --siem-token "${{ secrets.SIEM_TOKEN }}" \
            --event-type "apply" \
            --status "${{ steps.apply.outcome }}" \
            --user "${{ github.actor }}"
```

## Best Practices

Send both plan and apply events to your SIEM for complete visibility. Parse Terraform plan JSON output to extract detailed resource change information. Create SIEM detection rules specifically for high-risk Terraform changes like IAM modifications and security group changes. Include user identity, workspace, and timestamp in all events. Set up dashboards in your SIEM to visualize infrastructure change patterns. Use correlation rules to connect Terraform changes with subsequent security events. Retain Terraform SIEM data for at least 90 days to support incident investigation.

## Conclusion

Integrating Terraform with SIEM tools closes an important security gap by ensuring that infrastructure changes are visible to your security team. Whether you use Splunk, Elastic, or Microsoft Sentinel, the pattern is similar: capture Terraform events, send them to your SIEM, and create detection rules for suspicious activity. This integration is essential for organizations that need to maintain strong security postures while using infrastructure as code.
