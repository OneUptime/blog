# How to Create Macie Classification Jobs in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Macie, Security, Data Classification, S3, Infrastructure as Code

Description: Learn how to enable Amazon Macie and create automated sensitive data discovery classification jobs for S3 buckets using Terraform.

---

Amazon Macie is a data security service that uses machine learning and pattern matching to discover and protect sensitive data stored in Amazon S3. It can find personally identifiable information (PII), financial data, credentials, and other sensitive content across your S3 buckets. Managing Macie through Terraform lets you define classification jobs, custom data identifiers, and finding rules in code so your data security posture is consistent and auditable.

This guide covers enabling Macie, creating classification jobs, defining custom data identifiers, configuring finding rules, and setting up organization-wide deployment.

## Prerequisites

- Terraform 1.0 or later
- AWS CLI configured with appropriate permissions
- S3 buckets containing data you want to classify
- AWS Organizations (for multi-account deployment)

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Enabling Macie

Macie must be enabled in each account before you can create classification jobs.

```hcl
# Enable Macie in the account
resource "aws_macie2_account" "main" {
  finding_publishing_frequency = "FIFTEEN_MINUTES"

  status = "ENABLED"
}
```

## Organization-Wide Enablement

For multi-account setups, designate an administrator account and auto-enable for members.

```hcl
# Designate a delegated Macie administrator (run in management account)
resource "aws_macie2_organization_admin_account" "security" {
  admin_account_id = var.security_account_id

  depends_on = [aws_macie2_account.main]
}

# Associate member accounts (run in delegated admin account)
resource "aws_macie2_member" "workload_accounts" {
  for_each = toset(var.member_account_ids)

  account_id                            = each.value
  email                                 = "aws-${each.value}@company.com"
  invitation_disable_email_notification = true
  invite                                = true
  status                                = "ENABLED"

  depends_on = [aws_macie2_account.main]
}

variable "security_account_id" {
  type = string
}

variable "member_account_ids" {
  type    = list(string)
  default = []
}
```

## Creating a Basic Classification Job

Classification jobs scan S3 buckets for sensitive data. You can run them once or on a schedule.

```hcl
# One-time classification job for specific buckets
resource "aws_macie2_classification_job" "initial_scan" {
  name     = "initial-data-discovery"
  job_type = "ONE_TIME"

  s3_job_definition {
    bucket_definitions {
      account_id = data.aws_caller_identity.current.account_id
      buckets    = [
        aws_s3_bucket.customer_data.id,
        aws_s3_bucket.analytics.id,
        aws_s3_bucket.logs.id,
      ]
    }
  }

  tags = {
    Purpose = "initial-data-classification"
  }

  depends_on = [aws_macie2_account.main]
}

data "aws_caller_identity" "current" {}
```

## Scheduled Classification Job

For ongoing monitoring, create a scheduled job that runs periodically.

```hcl
# Scheduled weekly classification job
resource "aws_macie2_classification_job" "weekly_scan" {
  name     = "weekly-sensitive-data-scan"
  job_type = "SCHEDULED"

  s3_job_definition {
    bucket_definitions {
      account_id = data.aws_caller_identity.current.account_id
      buckets    = [
        aws_s3_bucket.customer_data.id,
        aws_s3_bucket.uploads.id,
      ]
    }

    # Only scan objects uploaded since the last scan
    scoping {
      includes {
        and {
          simple_scope_term {
            comparator = "STARTS_WITH"
            key        = "OBJECT_KEY"
            values     = ["uploads/", "data/", "exports/"]
          }
        }
      }

      # Exclude known non-sensitive prefixes
      excludes {
        and {
          simple_scope_term {
            comparator = "STARTS_WITH"
            key        = "OBJECT_KEY"
            values     = ["public/", "static/", "thumbnails/"]
          }
        }
      }
    }
  }

  # Run every Monday at 2 AM UTC
  schedule_frequency_details {
    weekly_schedule = "MONDAY"
  }

  # Sampling percentage - scan a portion to reduce costs
  sampling_percentage = 100

  tags = {
    Purpose = "weekly-classification"
  }

  depends_on = [aws_macie2_account.main]
}
```

## Classification Job with Tag-Based Scoping

You can target buckets by their tags rather than naming them explicitly.

```hcl
# Classification job targeting buckets by tag
resource "aws_macie2_classification_job" "tagged_buckets" {
  name     = "scan-classified-buckets"
  job_type = "SCHEDULED"

  s3_job_definition {
    bucket_criteria {
      includes {
        and {
          tag_criterion {
            comparator = "EQ"
            tag_values {
              key   = "DataClassification"
              value = "confidential"
            }
          }
        }
      }

      excludes {
        and {
          tag_criterion {
            comparator = "EQ"
            tag_values {
              key   = "MacieScan"
              value = "excluded"
            }
          }
        }
      }
    }

    scoping {
      includes {
        and {
          simple_scope_term {
            comparator = "GT"
            key        = "OBJECT_SIZE"
            values     = ["0"]
          }
        }
      }

      excludes {
        and {
          simple_scope_term {
            comparator = "GT"
            key        = "OBJECT_SIZE"
            values     = ["52428800"] # Skip files larger than 50MB
          }
        }
      }
    }
  }

  schedule_frequency_details {
    weekly_schedule = "SUNDAY"
  }

  sampling_percentage = 50

  depends_on = [aws_macie2_account.main]
}
```

## Custom Data Identifiers

While Macie has built-in detectors for common sensitive data types (SSN, credit cards, etc.), you can create custom identifiers for data specific to your organization.

```hcl
# Custom identifier for internal employee IDs
resource "aws_macie2_custom_data_identifier" "employee_id" {
  name        = "internal-employee-id"
  description = "Matches internal employee ID format EMP-XXXXXXXX"
  regex       = "EMP-[A-Z0-9]{8}"

  # Keywords that must appear near the match for higher confidence
  keywords = ["employee", "emp_id", "employee_id", "staff"]

  # Maximum distance between keyword and match
  maximum_match_distance = 50

  tags = {
    Type = "employee-data"
  }

  depends_on = [aws_macie2_account.main]
}

# Custom identifier for internal project codes
resource "aws_macie2_custom_data_identifier" "project_code" {
  name        = "internal-project-code"
  description = "Matches internal project codes in format PROJ-XXXX-XXXX"
  regex       = "PROJ-[A-Z]{4}-[0-9]{4}"

  keywords = ["project", "project_code", "initiative"]
  maximum_match_distance = 30

  tags = {
    Type = "project-data"
  }

  depends_on = [aws_macie2_account.main]
}

# Custom identifier for API keys
resource "aws_macie2_custom_data_identifier" "api_key" {
  name        = "internal-api-key"
  description = "Matches internal API key format"
  regex       = "myorg_api_[a-zA-Z0-9]{32}"

  keywords = ["api_key", "apikey", "api-key", "authorization"]
  maximum_match_distance = 20

  tags = {
    Type = "credentials"
  }

  depends_on = [aws_macie2_account.main]
}

# Custom identifier for medical record numbers
resource "aws_macie2_custom_data_identifier" "mrn" {
  name        = "medical-record-number"
  description = "Matches medical record number format MRN-XXXXXXXXXX"
  regex       = "MRN-[0-9]{10}"

  keywords = ["medical", "patient", "record", "mrn", "health"]
  maximum_match_distance = 50

  tags = {
    Type = "healthcare-data"
  }

  depends_on = [aws_macie2_account.main]
}
```

## Classification Job with Custom Identifiers

Use your custom identifiers in a classification job.

```hcl
# Job that uses custom data identifiers
resource "aws_macie2_classification_job" "custom_scan" {
  name     = "custom-identifier-scan"
  job_type = "ONE_TIME"

  s3_job_definition {
    bucket_definitions {
      account_id = data.aws_caller_identity.current.account_id
      buckets    = [aws_s3_bucket.internal_docs.id]
    }
  }

  custom_data_identifier_ids = [
    aws_macie2_custom_data_identifier.employee_id.id,
    aws_macie2_custom_data_identifier.project_code.id,
    aws_macie2_custom_data_identifier.api_key.id,
  ]

  tags = {
    Purpose = "custom-data-scan"
  }

  depends_on = [aws_macie2_account.main]
}
```

## Findings Filter

Findings filters let you suppress or auto-archive findings that match specific criteria.

```hcl
# Filter to auto-archive findings for public static assets
resource "aws_macie2_findings_filter" "public_assets" {
  name        = "suppress-public-asset-findings"
  description = "Auto-archive findings for intentionally public static assets"
  action      = "ARCHIVE"
  position    = 1

  finding_criteria {
    criterion {
      field  = "resourcesAffected.s3Bucket.name"
      eq     = [aws_s3_bucket.public_assets.id]
    }

    criterion {
      field  = "severity.description"
      eq     = ["Low"]
    }
  }

  depends_on = [aws_macie2_account.main]
}

# Filter to suppress findings for test data buckets
resource "aws_macie2_findings_filter" "test_data" {
  name        = "suppress-test-data"
  description = "Auto-archive findings in test data buckets with synthetic data"
  action      = "ARCHIVE"
  position    = 2

  finding_criteria {
    criterion {
      field  = "resourcesAffected.s3Bucket.tags.Environment"
      eq     = ["test"]
    }
  }

  depends_on = [aws_macie2_account.main]
}
```

## EventBridge Integration

Route Macie findings to your security workflows.

```hcl
# EventBridge rule for high-severity Macie findings
resource "aws_cloudwatch_event_rule" "macie_high" {
  name        = "macie-high-severity-findings"
  description = "Capture high and critical Macie findings"

  event_pattern = jsonencode({
    source      = ["aws.macie"]
    detail-type = ["Macie Finding"]
    detail = {
      severity = {
        description = ["High", "Critical"]
      }
    }
  })
}

# Send findings to SNS for alerting
resource "aws_sns_topic" "macie_alerts" {
  name = "macie-sensitive-data-alerts"
}

resource "aws_cloudwatch_event_target" "macie_to_sns" {
  rule      = aws_cloudwatch_event_rule.macie_high.name
  target_id = "send-to-sns"
  arn       = aws_sns_topic.macie_alerts.arn
}

resource "aws_sns_topic_policy" "macie_eventbridge" {
  arn = aws_sns_topic.macie_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEventBridge"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.macie_alerts.arn
      }
    ]
  })
}
```

## Findings Export to S3

Configure Macie to export its findings to S3 for long-term analysis.

```hcl
# S3 bucket for Macie findings export
resource "aws_s3_bucket" "macie_export" {
  bucket = "my-org-macie-findings-export"
}

# KMS key for encrypting exported findings
resource "aws_kms_key" "macie_export" {
  description             = "KMS key for Macie findings export"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowMacieAccess"
        Effect = "Allow"
        Principal = {
          Service = "macie.amazonaws.com"
        }
        Action = [
          "kms:GenerateDataKey",
          "kms:Encrypt",
        ]
        Resource = "*"
      }
    ]
  })
}

# Configure the export destination
resource "aws_macie2_classification_export_configuration" "main" {
  s3_destination {
    bucket_name = aws_s3_bucket.macie_export.id
    key_prefix  = "macie-findings/"
    kms_key_arn = aws_kms_key.macie_export.arn
  }

  depends_on = [aws_macie2_account.main]
}
```

## Best Practices

1. **Start with a one-time scan.** Run a one-time classification job first to understand your data landscape before setting up scheduled jobs.

2. **Use sampling for large buckets.** If your buckets contain millions of objects, use `sampling_percentage` to control costs while still getting a representative view.

3. **Create custom identifiers for your data.** Every organization has unique data formats. Custom identifiers catch sensitive data that built-in detectors would miss.

4. **Scope your jobs carefully.** Use includes and excludes to focus scans on relevant prefixes and file types. Scanning thumbnails and static assets wastes money.

5. **Route critical findings to alerts.** PII and credential discoveries should trigger immediate notifications through EventBridge and SNS.

6. **Export findings for compliance.** Long-term storage of Macie findings helps you demonstrate data protection practices during audits.

## Conclusion

Amazon Macie with Terraform automates sensitive data discovery across your S3 storage. With classification jobs running on a schedule, custom identifiers catching organization-specific data patterns, and findings routed to your security team through EventBridge, you have a comprehensive data protection workflow. Terraform keeps everything version-controlled and reproducible, so your data security posture is as well-managed as the rest of your infrastructure.
