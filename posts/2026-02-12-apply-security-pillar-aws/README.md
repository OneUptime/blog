# How to Apply the Security Pillar on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Well-Architected, Security, IAM, Compliance

Description: Practical implementation guide for the Security pillar of the AWS Well-Architected Framework, covering identity management, detection, infrastructure protection, and data security.

---

The Security pillar of the Well-Architected Framework covers how to protect your information, systems, and assets while delivering business value. On AWS, security is a shared responsibility - AWS secures the infrastructure, and you secure what you put on it. Getting this right means implementing controls across identity, detection, infrastructure protection, data protection, and incident response.

Let's go through each area with real AWS configurations and practical advice.

## Design Principles

The Security pillar has seven design principles:

1. Implement a strong identity foundation
2. Enable traceability
3. Apply security at all layers
4. Automate security best practices
5. Protect data in transit and at rest
6. Keep people away from data
7. Prepare for security events

## Identity and Access Management

Identity is the foundation of security on AWS. Get this wrong and nothing else matters.

**Use IAM Identity Center (SSO) instead of IAM users.** IAM users with long-lived credentials are a liability. SSO with federated identity and temporary credentials is the way:

```hcl
# Enable IAM Identity Center
resource "aws_ssoadmin_managed_policy_attachment" "admin" {
  instance_arn       = aws_ssoadmin_instance.main.arn
  managed_policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
  permission_set_arn = aws_ssoadmin_permission_set.admin.arn
}

resource "aws_ssoadmin_permission_set" "admin" {
  name             = "AdministratorAccess"
  instance_arn     = aws_ssoadmin_instance.main.arn
  session_duration = "PT4H"  # 4 hour sessions
}

resource "aws_ssoadmin_permission_set" "developer" {
  name             = "DeveloperAccess"
  instance_arn     = aws_ssoadmin_instance.main.arn
  session_duration = "PT8H"

  # Inline policy with limited permissions
  inline_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:Describe*",
          "ecs:Describe*",
          "ecs:List*",
          "logs:*",
          "cloudwatch:Get*",
          "cloudwatch:List*",
        ]
        Resource = "*"
      }
    ]
  })
}
```

**Apply least privilege everywhere.** For a deep dive on this topic, see our post on [implementing the principle of least privilege on AWS](https://oneuptime.com/blog/post/implement-principle-least-privilege-aws/view). The short version: start with no permissions and add only what's needed. Use IAM Access Analyzer to identify unused permissions.

**Enforce MFA.** Require MFA for all human access, especially console access and sensitive API calls:

```hcl
# SCP that denies actions without MFA
resource "aws_organizations_policy" "require_mfa" {
  name = "RequireMFA"
  type = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyWithoutMFA"
        Effect = "Deny"
        Action = ["*"]
        Resource = ["*"]
        Condition = {
          BoolIfExists = {
            "aws:MultiFactorAuthPresent" = "false"
          }
          StringNotLike = {
            "aws:PrincipalARN" = [
              "arn:aws:iam::*:role/service-role/*"
            ]
          }
        }
      }
    ]
  })
}
```

## Detection and Monitoring

You can't protect against what you can't see. Layer multiple detection services:

**AWS CloudTrail** - Log every API call across all accounts:

```hcl
resource "aws_cloudtrail" "organization" {
  name                          = "org-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  is_organization_trail         = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  include_global_service_events = true

  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail.arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3"]
    }
  }
}
```

**Amazon GuardDuty** - Intelligent threat detection:

```hcl
resource "aws_guardduty_detector" "main" {
  enable = true

  finding_publishing_frequency = "FIFTEEN_MINUTES"

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = true
        }
      }
    }
  }
}
```

**AWS Security Hub** - Aggregates findings from GuardDuty, Inspector, Macie, and Config:

```hcl
resource "aws_securityhub_account" "main" {}

resource "aws_securityhub_standards_subscription" "cis" {
  standards_arn = "arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.4.0"
  depends_on    = [aws_securityhub_account.main]
}

resource "aws_securityhub_standards_subscription" "aws_best_practices" {
  standards_arn = "arn:aws:securityhub:us-east-1::standards/aws-foundational-security-best-practices/v/1.0.0"
  depends_on    = [aws_securityhub_account.main]
}
```

## Infrastructure Protection

Protect your infrastructure at every layer:

**Network Segmentation** - Use VPCs, subnets, security groups, and NACLs:

```hcl
# Public subnet - only load balancers
# Private subnet - application tier
# Isolated subnet - databases (no internet access)

resource "aws_security_group" "app" {
  name_prefix = "app-"
  vpc_id      = aws_vpc.main.id

  # Only accept traffic from the load balancer
  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Only allow outbound to the database
  egress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.db.id]
  }

  # Allow outbound HTTPS for API calls
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

**VPC Endpoints** - Keep AWS service traffic off the public internet:

```hcl
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids = [aws_route_table.private.id]
}

resource "aws_vpc_endpoint" "secrets_manager" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
}
```

**AWS WAF** - Protect web applications from common attacks:

```hcl
resource "aws_wafv2_web_acl" "main" {
  name  = "app-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "aws-managed-rules"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRules"
    }
  }

  visibility_config {
    sampled_requests_enabled   = true
    cloudwatch_metrics_enabled = true
    metric_name                = "AppWAF"
  }
}
```

## Data Protection

**Encrypt everything at rest:**

```hcl
# Default EBS encryption
resource "aws_ebs_default_kms_key" "main" {
  key_arn = aws_kms_key.ebs.arn
}

resource "aws_ebs_encryption_by_default" "main" {
  enabled = true
}
```

**Encrypt everything in transit** - enforce HTTPS:

```hcl
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# Redirect HTTP to HTTPS
resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
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

**Use Secrets Manager for sensitive data:**

```hcl
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "production/database/password"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_rotation" "db_password" {
  secret_id           = aws_secretsmanager_secret.db_password.id
  rotation_lambda_arn = aws_lambda_function.rotate_secret.arn

  rotation_rules {
    automatically_after_days = 30
  }
}
```

## Incident Response

**Prepare before you need to respond.** Have runbooks, communication channels, and access patterns ready:

- Use AWS Systems Manager Incident Manager for structured incident response
- Pre-create IAM roles for incident responders with broad read access
- Set up automated evidence collection (snapshot affected resources, capture logs)
- Practice incident response with game days

## Summary

The Security pillar is about defense in depth - identity, detection, infrastructure, data, and incident response all working together. No single control is sufficient. Start with the basics (IAM, encryption, CloudTrail), then layer on detection (GuardDuty, Security Hub), and build toward automated remediation. Security isn't a destination; it's an ongoing process of reducing risk.

For monitoring your security posture in real-time, check out our guide on [AWS infrastructure monitoring](https://oneuptime.com/blog/post/monitor-aws-infrastructure/view).
