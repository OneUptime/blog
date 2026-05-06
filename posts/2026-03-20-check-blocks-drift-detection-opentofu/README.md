# How to Use Check Blocks for Drift Detection in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Check Blocks, Drift Detection, Validation, Infrastructure as Code, Testing

Description: Learn how to use OpenTofu's check blocks to define post-deployment assertions that detect configuration drift and verify infrastructure health during every plan and apply.

## Introduction

OpenTofu's `check` block lets you define custom assertions about your infrastructure that are evaluated during every plan and apply. Unlike `validation` blocks (which check input variables), `check` blocks verify the actual state of deployed resources - making them a powerful drift detection tool.

## Basic Check Block Syntax

```hcl
# A check block defines an assertion about deployed infrastructure

check "web_instance_running" {
  # Optional: scope the check to specific data
  data "aws_instance" "web_check" {
    instance_id = aws_instance.web.id
  }

  # The assertion to verify
  assert {
    condition     = data.aws_instance.web_check.instance_state == "running"
    error_message = "Web instance ${aws_instance.web.id} is not in running state."
  }
}
```

## Checking Security Group Rules

```hcl
# Detect if someone removed or changed a managed HTTPS ingress rule
check "https_ingress_present" {
  data "aws_vpc_security_group_rule" "https_check" {
    security_group_rule_id = aws_vpc_security_group_ingress_rule.https.security_group_rule_id
  }

  assert {
    condition = (
      data.aws_vpc_security_group_rule.https_check.security_group_id == aws_security_group.web.id &&
      data.aws_vpc_security_group_rule.https_check.from_port == 443 &&
      data.aws_vpc_security_group_rule.https_check.to_port == 443 &&
      data.aws_vpc_security_group_rule.https_check.ip_protocol == "tcp" &&
      !data.aws_vpc_security_group_rule.https_check.is_egress
    )
    error_message = "DRIFT DETECTED: Managed HTTPS ingress rule missing or changed on the web security group."
  }
}
```

## Checking S3 Bucket Availability

```hcl
check "s3_bucket_present" {
  data "aws_s3_bucket" "app_check" {
    bucket = aws_s3_bucket.app.id
  }

  assert {
    condition     = data.aws_s3_bucket.app_check.bucket != ""
    error_message = "S3 bucket check failed - bucket may have been deleted externally."
  }
}
```

## Checking RDS Instance Status

```hcl
check "rds_instance_available" {
  assert {
    condition     = aws_db_instance.main.status == "available"
    error_message = "RDS instance ${aws_db_instance.main.identifier} is not in available state - current: ${aws_db_instance.main.status}"
  }
}
```

## Checking DNS Resolution

```hcl
# Verify a DNS record resolves correctly after changes
check "api_dns_resolves" {
  data "dns_a_record_set" "api_check" {
    host = "api.example.com"
  }

  assert {
    condition     = length(data.dns_a_record_set.api_check.addrs) > 0
    error_message = "DRIFT: api.example.com DNS record is not resolving. Check Route53 configuration."
  }
}
```

## Check Block Behavior

- **Warnings only**: Failed assertions produce warnings, not errors. Apply still succeeds.
- **Plan time**: Checks run during `tofu plan` and `tofu apply`
- **Scope**: Each check block can include one `data` source and multiple `assert` blocks

## Failing CI on Check Warnings

```bash
# Check warnings are visible but not blocking by default
tofu plan 2>&1 | grep -A 3 "Warning:"

# To fail CI when a check reports fail or error:
tofu plan -out=plan.tfplan >/dev/null
if tofu show -json plan.tfplan | jq -e '
  [.checks[]? | select(.status == "fail" or .status == "error")] | length > 0
' >/dev/null; then
  echo "ERROR: Check assertions failed - drift detected!"
  exit 1
fi
```

## Conclusion

Check blocks provide a declarative, co-located way to verify the health and configuration of deployed resources on every plan. They bridge the gap between apply-time validation and continuous monitoring, catching drift in the same run that checks for configuration changes. Use them to assert critical security controls (encryption enabled, ports not open) and operational requirements (instances running, DNS resolving) that could be changed out-of-band.
