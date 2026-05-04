# How to Configure Container Image Scanning with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Container Security, Image Scanning, ECR, Infrastructure as Code

Description: Learn how to configure container image vulnerability scanning with OpenTofu across ECR, ACR, and GCP Artifact Registry for continuous security monitoring.

Container image scanning identifies vulnerabilities in your images before deployment. Managing scanning configuration in OpenTofu ensures every registry and repository has scanning enabled with consistent alerting.

## AWS ECR Enhanced Scanning

```hcl
# Enable enhanced scanning (Inspector-based) at registry level

resource "aws_ecr_registry_scanning_configuration" "main" {
  scan_type = "ENHANCED"  # BASIC or ENHANCED (requires Inspector)

  rule {
    scan_frequency = "CONTINUOUS_SCAN"  # Scan on push and continuously

    repository_filter {
      filter      = "*"  # All repositories
      filter_type = "WILDCARD"
    }
  }
}

# Alternatively, enable scanning per repository (basic scan on push)
resource "aws_ecr_repository" "app" {
  name = "myapp/api"

  image_scanning_configuration {
    scan_on_push = true
  }
}
```

## AWS Inspector for Container Scanning

```hcl
# Enable Inspector for ECR scanning
resource "aws_inspector2_enabler" "ecr_scanning" {
  account_ids    = [data.aws_caller_identity.current.account_id]
  resource_types = ["ECR"]
}
```

## Alert on Critical Findings (ECR)

```hcl
# EventBridge rule for critical scan findings
resource "aws_cloudwatch_event_rule" "ecr_critical" {
  name        = "ecr-critical-vulnerability"
  description = "Alert on ECR critical vulnerability findings"

  event_pattern = jsonencode({
    source      = ["aws.inspector2"]
    detail-type = ["Inspector2 Finding"]
    detail = {
      severity = ["CRITICAL"]
      resources = {
        type = ["AWS_ECR_CONTAINER_IMAGE"]
      }
    }
  })
}

resource "aws_cloudwatch_event_target" "security_alert" {
  rule      = aws_cloudwatch_event_rule.ecr_critical.name
  target_id = "security-sns"
  arn       = aws_sns_topic.security_alerts.arn
}

resource "aws_sns_topic" "security_alerts" {
  name = "container-security-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.security_alerts.arn
  protocol  = "email"
  endpoint  = "security@example.com"
}
```

## Azure ACR Defender for Containers

```hcl
# Enable Microsoft Defender for Containers (scans ACR images)
resource "azurerm_security_center_subscription_pricing" "containers" {
  tier          = "Standard"
  resource_type = "Containers"
}

# Security contact for alert notifications
resource "azurerm_security_center_contact" "main" {
  name                = "default"
  email               = "security@example.com"
  phone               = "+1-555-0100"
  alert_notifications = true
  alerts_to_admins    = true
}
```

## GCP Artifact Registry Vulnerability Scanning

```hcl
# Enable Container Analysis API (provides vulnerability scanning)
resource "google_project_service" "container_analysis" {
  project = var.project_id
  service = "containeranalysis.googleapis.com"
}

resource "google_project_service" "container_scanning" {
  project = var.project_id
  service = "containerscanning.googleapis.com"
}

# Allow security team to view scan results
resource "google_project_iam_member" "security_viewer" {
  project = var.project_id
  role    = "roles/containeranalysis.occurrences.viewer"
  member  = "group:security@example.com"
}
```

## CI/CD Gate on Scan Results

```hcl
# Lambda to check scan results before deployment approval
resource "aws_lambda_function" "scan_gate" {
  function_name = "ecr-scan-gate"
  runtime       = "python3.12"
  handler       = "index.handler"
  filename      = "scan_gate.zip"
  role          = aws_iam_role.scan_gate.arn

  environment {
    variables = {
      SEVERITY_THRESHOLD   = "HIGH"    # Block on HIGH and above
      MAX_CRITICAL_COUNT   = "0"       # Block any critical vulnerabilities
    }
  }
}
```

## Conclusion

Container image scanning configured in OpenTofu ensures every image is inspected for vulnerabilities before and after deployment. Enable enhanced scanning with AWS Inspector for continuous monitoring, configure EventBridge rules to alert on critical findings, and use Defender for Containers in Azure for registry-level protection. Build scanning into your CI/CD approval gates to prevent deploying images with known critical vulnerabilities.
