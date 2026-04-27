# How to Use Scoped Data Sources in Check Blocks in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Validation

Description: Learn how to use scoped data sources inside check blocks in OpenTofu to query external systems for validation without affecting the main configuration.

## Introduction

Check blocks support scoped data sources - `data` blocks declared inside a `check` block rather than at the top level. Scoped data sources are evaluated only for the purpose of the check block's assertions and do not affect the main configuration or other resources. This allows you to query HTTP endpoints, DNS records, or cloud APIs during validation without creating dependencies in your resource graph.

## Scoped Data Source Syntax

```hcl
check "api_health" {
  # This data source is scoped to this check block only
  data "http" "health_check" {
    url = "https://api.acme-corp.com/health"
  }

  assert {
    condition     = data.http.health_check.status_code == 200
    error_message = "API returned ${data.http.health_check.status_code}, expected 200."
  }
}
```

The `data "http" "health_check"` is only available inside this `check` block - it cannot be referenced elsewhere in the configuration.

## HTTP Endpoint Validation

```hcl
check "app_endpoint_accessible" {
  data "http" "app" {
    url                = "https://app.acme-corp.com"
    request_timeout_ms = 10000  # 10 seconds
  }

  assert {
    condition     = data.http.app.status_code == 200
    error_message = "App endpoint returned ${data.http.app.status_code}. Expected 200."
  }
}
```

## DNS Validation with Scoped Data Source

```hcl
check "dns_configured" {
  data "dns_a_record_set" "app" {
    host = aws_route53_record.app.name
  }

  assert {
    condition     = length(data.dns_a_record_set.app.addrs) > 0
    error_message = "DNS record ${aws_route53_record.app.name} did not resolve to any IP addresses."
  }

  assert {
    condition     = contains(data.dns_a_record_set.app.addrs, aws_eip.app.public_ip)
    error_message = "DNS record does not point to the expected IP ${aws_eip.app.public_ip}."
  }
}
```

## Multiple Scoped Data Sources in One Check

```hcl
check "deployment_verification" {
  # Check primary API
  data "http" "api_primary" {
    url = "https://api.acme-corp.com/health"
  }

  # Check secondary API
  data "http" "api_secondary" {
    url = "https://api-eu.acme-corp.com/health"
  }

  assert {
    condition     = data.http.api_primary.status_code == 200
    error_message = "Primary API is down."
  }

  assert {
    condition     = data.http.api_secondary.status_code == 200
    error_message = "Secondary API is down."
  }
}
```

## Querying Cloud Resources for Validation

```hcl
check "ec2_instance_running" {
  data "aws_instance" "main" {
    instance_id = aws_instance.main.id
  }

  assert {
    condition     = data.aws_instance.main.instance_state == "running"
    error_message = "EC2 instance is in state '${data.aws_instance.main.instance_state}', expected 'running'."
  }
}
```

## Difference Between Scoped and Root Data Sources

```hcl
# Root-level data source - affects the resource graph, evaluated during plan

data "aws_ami" "ubuntu" {
  most_recent = true
  # ...
}

# Scoped data source - only evaluated for this check, no graph effects
check "ami_is_recent" {
  data "aws_ami" "current" {
    most_recent = true
    # same filter...
  }

  assert {
    condition     = timecmp(data.aws_ami.current.creation_date, timeadd(timestamp(), "-2160h")) > 0
    error_message = "The AMI in use is more than 90 days old."
  }
}
```

## Handling Data Source Failures in Checks

If a scoped data source fails (e.g., DNS doesn't resolve, HTTP times out), the check block itself fails with a warning - it does not block the apply:

```bash
tofu apply

# Warning: Error in check block
# check.app_endpoint_accessible: data.http.app: no response from endpoint
# This is reported as a warning and will not prevent OpenTofu from continuing.
```

## Conclusion

Scoped data sources inside check blocks let you validate infrastructure state against external systems without creating dependencies in the resource graph. Use them to verify API health, DNS resolution, database availability, and other observable post-deployment conditions. Because check blocks warn rather than block, these validations provide operational visibility without risking deployment failures due to transient external issues.
