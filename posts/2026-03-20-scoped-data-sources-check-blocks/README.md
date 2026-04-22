# How to Use Scoped Data Sources in Check Blocks in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Testing

Description: Learn how to use scoped data sources within OpenTofu check blocks to query live infrastructure state for continuous validation assertions.

## Introduction

Check blocks can contain zero or one `data` block whose scope is limited to that check block. This scoped data source is re-evaluated on every plan and apply, allowing you to query live infrastructure state and validate it against expected conditions.

## Scoped Data Source Syntax

```hcl
check "block_name" {
  # Scoped data source - evaluated only within this check
  data "resource_type" "local_name" {
    # data source configuration
  }

  assert {
    condition     = data.resource_type.local_name.attribute == expected_value
    error_message = "Helpful error message"
  }
}
```

## Example 1: HTTP Endpoint Check

```hcl
check "website_health" {
  data "http" "homepage" {
    url = "https://${aws_lb.main.dns_name}/health"

    request_headers = {
      Accept = "application/json"
    }
  }

  assert {
    condition     = data.http.homepage.status_code == 200
    error_message = "Health check endpoint returned ${data.http.homepage.status_code}, expected 200"
  }

  assert {
    condition     = can(jsondecode(data.http.homepage.response_body))
    error_message = "Health check response is not valid JSON"
  }
}
```

## Example 2: Checking S3 Bucket Properties

```hcl
check "state_bucket_exists" {
  data "aws_s3_bucket" "state" {
    bucket = var.state_bucket_name
  }

  assert {
    condition     = data.aws_s3_bucket.state.bucket_domain_name != null
    error_message = "State bucket '${var.state_bucket_name}' does not exist"
  }
}

check "state_bucket_region" {
  data "aws_s3_bucket" "state_region" {
    bucket = var.state_bucket_name
  }

  assert {
    condition     = data.aws_s3_bucket.state_region.bucket_region == var.expected_bucket_region
    error_message = "State bucket must be in ${var.expected_bucket_region}"
  }
}
```

## Example 3: DNS Resolution Check

```hcl
check "dns_resolves" {
  data "dns_a_record_set" "api" {
    host = "api.example.com"
  }

  assert {
    condition     = length(data.dns_a_record_set.api.addrs) > 0
    error_message = "DNS record api.example.com does not resolve to any IP addresses"
  }
}
```

## Example 4: Certificate Expiration Check

```hcl
check "cert_not_expired" {
  data "aws_acm_certificate" "api" {
    domain   = "api.example.com"
    statuses = ["ISSUED"]
  }

  assert {
    condition     = data.aws_acm_certificate.api.status == "ISSUED"
    error_message = "ACM certificate for api.example.com is not in ISSUED status"
  }
}
```

## Example 5: RDS Configuration Validation

```hcl
check "database_is_multi_az" {
  data "aws_db_instance" "primary" {
    db_instance_identifier = aws_db_instance.main.identifier
  }

  assert {
    condition     = data.aws_db_instance.primary.multi_az == true
    error_message = "RDS instance ${aws_db_instance.main.identifier} does not have Multi-AZ enabled"
  }

  assert {
    condition     = data.aws_db_instance.primary.storage_encrypted == true
    error_message = "RDS instance storage is not encrypted"
  }
}
```

## Scoped vs Global Data Sources

```hcl
# Global data source - accessible throughout the config

data "aws_vpc" "main" {
  id = var.vpc_id
}

# Scoped data source - only accessible within this check block
check "vpc_dns_enabled" {
  data "aws_vpc" "check_vpc" {
    id = var.vpc_id
  }

  assert {
    condition     = data.aws_vpc.check_vpc.enable_dns_hostnames == true
    error_message = "VPC must have DNS hostnames enabled"
  }
}
```

Scoped data sources don't pollute the global namespace and are re-read on every evaluation.

## Conclusion

Scoped data sources in check blocks enable real-time infrastructure validation by querying live resources during every plan and apply. Use them for health checks, compliance validation, and detecting configuration drift. The scoped nature means they don't affect the main configuration data flow and are evaluated independently as part of the check step.
