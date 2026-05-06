# How to Implement CIS Benchmark Controls with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, CIS Benchmark, AWS Security, Compliance, Infrastructure as Code

Description: Learn how to implement CIS AWS Foundations Benchmark controls with OpenTofu to establish a security baseline for your AWS accounts.

The CIS AWS Foundations Benchmark provides prescriptive guidance for securing AWS accounts. OpenTofu lets you codify these controls as resources, making compliance verifiable and reproducible. Control IDs vary across benchmark versions, so the examples below focus on the implementation patterns behind the controls.

## Control Areas Covered

| Area | Controls |
|---|---|
| IAM | Password policy, MFA, access key rotation |
| S3 and Storage | S3 public access block, CloudTrail log bucket hardening |
| Logging | CloudTrail, VPC Flow Logs, Config |
| Monitoring | CloudWatch alarms for unauthorized activity |
| Networking | VPC defaults, security group restrictions |

## Section 1: IAM Controls

```hcl
# CIS password policy control - require minimum 14-character passwords

resource "aws_iam_account_password_policy" "cis" {
  minimum_password_length        = 14
  require_lowercase_characters   = true
  require_numbers                = true
  require_uppercase_characters   = true
  require_symbols                = true
  allow_users_to_change_password = true
  max_password_age               = 90
  password_reuse_prevention      = 24
  hard_expiry                    = false
}
```

## Section 2: Storage Controls

```hcl
# CIS S3 control - enable Block Public Access at the account level
resource "aws_s3_account_public_access_block" "cis" {
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

## Section 3: Logging Controls

```hcl
# CIS CloudTrail control - use a multi-Region trail with log file validation
resource "aws_cloudtrail" "cis" {
  name                          = "cis-cloudtrail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  cloud_watch_logs_group_arn    = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn     = aws_iam_role.cloudtrail_to_cloudwatch.arn
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  kms_key_id                    = aws_kms_key.cloudtrail.arn

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

## Section 4: Monitoring Controls

```hcl
# CIS monitoring control - unauthorized API calls
resource "aws_cloudwatch_log_metric_filter" "unauthorized_api" {
  name           = "cis-unauthorized-api-calls"
  log_group_name = aws_cloudwatch_log_group.cloudtrail.name
  pattern        = "{($.errorCode=\"*UnauthorizedOperation\") || ($.errorCode=\"AccessDenied*\")}"

  metric_transformation {
    name          = "UnauthorizedAPICallsEventCount"
    namespace     = "LogMetrics"
    value         = "1"
    default_value = 0
  }
}

resource "aws_cloudwatch_metric_alarm" "unauthorized_api" {
  alarm_name          = "cis-unauthorized-api-calls"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "UnauthorizedAPICallsEventCount"
  namespace           = "LogMetrics"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  alarm_actions       = [aws_sns_topic.security_alerts.arn]
}

# CIS monitoring control - root user activity
resource "aws_cloudwatch_log_metric_filter" "root_usage" {
  name           = "cis-root-account-usage"
  log_group_name = aws_cloudwatch_log_group.cloudtrail.name
  pattern        = "{$.userIdentity.type=\"Root\" && $.userIdentity.invokedBy NOT EXISTS && $.eventType !=\"AwsServiceEvent\"}"

  metric_transformation {
    name          = "RootAccountUsageEventCount"
    namespace     = "LogMetrics"
    value         = "1"
    default_value = 0
  }
}

resource "aws_cloudwatch_metric_alarm" "root_usage" {
  alarm_name          = "cis-root-account-usage"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "RootAccountUsageEventCount"
  namespace           = "LogMetrics"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  alarm_actions       = [aws_sns_topic.security_alerts.arn]
}
```

## Section 5: Networking Controls

```hcl
# CIS networking control - restrict the default security group
resource "aws_default_security_group" "cis" {
  vpc_id = aws_vpc.main.id
  # No ingress or egress rules = deny all
}

# CIS networking control - do not allow unrestricted SSH access
# (Validated via AWS Config rule or custom policy check)
```

## Using a CIS Benchmark Module

```hcl
module "cis_baseline" {
  source = "./modules/cis-baseline"
  # define CIS-aligned controls inside the module
}
```

## Conclusion

Implementing CIS Benchmark controls with OpenTofu makes compliance declarative and auditable. Codify IAM password policies, S3 public access blocks, CloudTrail configuration, CloudWatch alarms, and VPC security group defaults as Terraform resources. Run `tofu plan` in CI to detect drift from the security baseline before it reaches production.
