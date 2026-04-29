# How to Implement ISO 27001 Controls with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, ISO 27001, Compliance, Security, Infrastructure as Code

Description: Learn how to implement ISO 27001 Annex A technical controls with OpenTofu for cloud infrastructure that supports information security certification.

ISO 27001 Annex A defines 93 controls across 4 themes. Several Annex A organizational and technological controls have direct mappings to cloud infrastructure configurations that OpenTofu can codify.

## A.5 Organizational Controls

```hcl
# A.5.14 - Information transfer: support secure transfer with HTTPS

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
```

## A.8 Technological Controls

```hcl
# A.8.5 - Secure authentication: MFA enforcement via Cognito
resource "aws_cognito_user_pool" "main" {
  name = "app-users"

  mfa_configuration = "ON"  # Force MFA for all users

  software_token_mfa_configuration {
    enabled = true
  }

  password_policy {
    minimum_length                   = 12
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }
}

# A.8.7 - Protection against malware: GuardDuty malware protection
resource "aws_guardduty_detector" "iso27001" {
  enable = true
}

resource "aws_guardduty_detector_feature" "ebs_malware_protection" {
  detector_id = aws_guardduty_detector.iso27001.id
  name        = "EBS_MALWARE_PROTECTION"
  status      = "ENABLED"
}

# A.8.8 - Management of technical vulnerabilities: Inspector
resource "aws_inspector2_enabler" "main" {
  account_ids    = [data.aws_caller_identity.current.account_id]
  resource_types = ["EC2", "ECR", "LAMBDA"]
}

# A.8.12 - Data leakage prevention: Macie
resource "aws_macie2_account" "main" {
  status = "ENABLED"
}

# A.8.24 - Use of cryptography: S3 encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "iso27001" {
  bucket = aws_s3_bucket.data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.data.arn
    }
    bucket_key_enabled = true
  }
}

# A.8.25 - Secure development lifecycle: CI/CD-integrated security scanning
# (Implemented through CI/CD tooling rather than a direct OpenTofu resource)
```

## A.8.15 - Logging

```hcl
# Comprehensive logging for all critical services
resource "aws_cloudwatch_log_group" "application" {
  name              = "/app/production"
  retention_in_days = 365  # Example retention period; align with policy requirements
  kms_key_id        = aws_kms_key.logs.arn
}

# A.8.16 - Monitoring: CloudWatch alarms for key security events
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
}
```

## A.8.20 - Networks Security

```hcl
# Segment networks by sensitivity level
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "private_data" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.10.0/24"
  # No route to internet gateway - data tier isolated
}

resource "aws_network_acl" "data_tier" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = [aws_subnet.private_data.id]

  # Only allow traffic from the application tier
  ingress {
    rule_no    = 100
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "10.0.1.0/24"
    from_port  = 5432
    to_port    = 5432
  }

  ingress {
    rule_no    = 32766
    protocol   = "-1"
    action     = "deny"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  # Network ACLs are stateless, so allow return traffic to ephemeral ports
  egress {
    rule_no    = 100
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "10.0.1.0/24"
    from_port  = 1024
    to_port    = 65535
  }

  egress {
    rule_no    = 32766
    protocol   = "-1"
    action     = "deny"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }
}
```

## Conclusion

ISO 27001 Annex A controls translate directly to cloud service configurations. Support secure transfer (A.5.14) with HTTPS redirects, enforce encryption (A.8.24) through KMS and S3 SSE, implement malware protection (A.8.7) with GuardDuty features, enforce MFA (A.8.5) via identity services, and maintain comprehensive logging (A.8.15) with retention periods defined by policy. Use OpenTofu to make these controls auditable and drift-detectable.
