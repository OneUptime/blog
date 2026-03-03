# How to Fix Terraform Check Block Failures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Infrastructure as Code, Validation

Description: Diagnose and fix Terraform check block failures including assertion errors, data source issues, and strategies for writing effective infrastructure checks.

---

Terraform 1.5 introduced `check` blocks as a way to verify infrastructure health after apply without blocking resource creation. Unlike preconditions and postconditions which halt execution on failure, check blocks produce warnings. This makes them ideal for validating that your infrastructure is behaving as expected without preventing deployment. But when check blocks themselves error out (as opposed to just failing their assertion), you need to troubleshoot them.

## How Check Blocks Work

A check block contains one or more `assert` statements and optionally a scoped `data` source:

```hcl
check "website_health" {
  data "http" "web_check" {
    url = "https://${aws_lb.main.dns_name}/health"
  }

  assert {
    condition     = data.http.web_check.status_code == 200
    error_message = "Website health check returned ${data.http.web_check.status_code}"
  }
}
```

When the assertion fails, Terraform shows a warning but continues. When the check block itself has an error (like a data source failure), that is a different problem.

## Error 1: Data Source Failure in Check Block

The data source inside a check block can fail for various reasons:

```text
Warning: Check block assertion failed

  on checks.tf line 8, in check "website_health":
   8:     condition     = data.http.web_check.status_code == 200

Could not read from data source: connection refused
```

Or worse:

```text
Error: Error in check block

  on checks.tf line 2, in check "website_health":
   2:   data "http" "web_check" {

Error making request: dial tcp: lookup
my-lb-123456.us-east-1.elb.amazonaws.com: no such host
```

The data source inside a check block runs after the apply. If the resource it depends on has not fully propagated (like DNS for a new load balancer), the check fails.

**Fix:** Add retry logic or accept that the first apply might show a warning:

```hcl
check "website_health" {
  data "http" "web_check" {
    url = "https://${aws_lb.main.dns_name}/health"

    # Add a retry configuration if the provider supports it
    retry {
      attempts     = 3
      min_delay_ms = 5000
    }
  }

  assert {
    condition     = data.http.web_check.status_code == 200
    error_message = "Website health check returned status ${data.http.web_check.status_code}"
  }
}
```

Note: Not all data source providers support retry. For the HTTP data source, you might need to accept the initial failure and re-run plan later.

## Error 2: Referencing Resources Not Yet Created

Check blocks run after all resources are applied, but if a resource fails to create, the check's data source might reference a non-existent resource:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

check "instance_running" {
  data "aws_instance" "web_check" {
    instance_id = aws_instance.web.id
  }

  assert {
    condition     = data.aws_instance.web_check.instance_state == "running"
    error_message = "Instance is not in running state"
  }
}
```

If the instance creation fails, the check block also errors because the instance ID does not exist.

**Fix:** Use `try()` in the condition to handle potential errors:

```hcl
check "instance_running" {
  data "aws_instance" "web_check" {
    instance_id = aws_instance.web.id
  }

  assert {
    condition     = try(data.aws_instance.web_check.instance_state == "running", false)
    error_message = "Instance is not in running state or could not be checked"
  }
}
```

## Error 3: Incorrect Condition Syntax

Check block conditions must be boolean expressions. Non-boolean values cause errors:

```hcl
# Wrong - string comparison produces unexpected results
check "valid_config" {
  assert {
    condition     = var.environment
    error_message = "Environment must be set"
  }
}
```

If `var.environment` is a string, this works because non-empty strings are truthy in Terraform. But it is better to be explicit:

```hcl
check "valid_config" {
  assert {
    condition     = var.environment != ""
    error_message = "Environment must be set"
  }
}
```

For complex conditions:

```hcl
check "valid_config" {
  assert {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod. Got: ${var.environment}"
  }
}
```

## Error 4: Scoped Data Source Name Conflicts

The data source inside a check block is scoped to that check. But it can conflict with data sources outside the check:

```hcl
# This data source is in the main configuration
data "http" "web_check" {
  url = "https://example.com/health"
}

# This data source has the same type and name but is scoped to the check
check "website_health" {
  data "http" "web_check" {
    url = "https://other.example.com/health"
  }

  assert {
    # Which web_check is this referencing?
    condition     = data.http.web_check.status_code == 200
    error_message = "Health check failed"
  }
}
```

Inside the check block, the scoped data source takes precedence. Outside, the global one applies. To avoid confusion, use distinct names:

```hcl
data "http" "main_health" {
  url = "https://example.com/health"
}

check "website_health" {
  data "http" "check_health" {
    url = "https://other.example.com/health"
  }

  assert {
    condition     = data.http.check_health.status_code == 200
    error_message = "Health check failed"
  }
}
```

## Error 5: Check Block During Destroy

Check blocks can fail during `terraform destroy` because the resources they check are being deleted:

```text
Warning: Check block assertion failed

  on checks.tf line 8, in check "website_health":
   8:     condition     = data.http.web_check.status_code == 200

Website health check returned 503
```

This is expected during destroy. The infrastructure is being torn down, so health checks naturally fail. These warnings can be safely ignored during destroy operations.

If the warnings are noisy, you can remove check blocks before destroying, or accept them as informational.

## Error 6: Multiple Assert Blocks

Check blocks can contain multiple assertions. If one fails, the others are still evaluated:

```hcl
check "website_health" {
  data "http" "web_check" {
    url = "https://${aws_lb.main.dns_name}/health"
  }

  assert {
    condition     = data.http.web_check.status_code == 200
    error_message = "Health check returned ${data.http.web_check.status_code}"
  }

  assert {
    condition     = can(jsondecode(data.http.web_check.response_body))
    error_message = "Health check did not return valid JSON"
  }

  assert {
    condition     = try(jsondecode(data.http.web_check.response_body).status, "") == "healthy"
    error_message = "Application reported unhealthy status"
  }
}
```

If the first assertion fails (wrong status code), the other assertions still run. Make sure later assertions can handle the case where the data is not what earlier assertions expected.

## Check Blocks vs Preconditions vs Postconditions

Understanding when to use each:

| Feature | Behavior on Failure | When Evaluated | Scope |
|---------|-------------------|----------------|-------|
| `check` block | Warning (non-blocking) | After apply | Global |
| `precondition` | Error (blocks apply) | Before resource action | Per resource |
| `postcondition` | Error (blocks apply) | After resource action | Per resource |

Use `check` blocks for health checks and external validations that should not block deployment. Use preconditions for input validation that must pass before a resource is created. Use postconditions for verifying that a resource was created correctly.

## Writing Effective Check Blocks

Here are patterns that work well:

```hcl
# Check that a website is responding
check "website_responding" {
  data "http" "check" {
    url = "https://www.example.com"
  }

  assert {
    condition     = data.http.check.status_code == 200
    error_message = "Website is not responding (status: ${data.http.check.status_code})"
  }
}

# Check that DNS is resolving correctly
check "dns_resolution" {
  data "dns_a_record_set" "check" {
    host = "www.example.com"
  }

  assert {
    condition     = length(data.dns_a_record_set.check.addrs) > 0
    error_message = "DNS is not resolving for www.example.com"
  }
}

# Check that a certificate is valid
check "certificate_valid" {
  assert {
    condition     = aws_acm_certificate.main.status == "ISSUED"
    error_message = "Certificate is not yet issued (status: ${aws_acm_certificate.main.status})"
  }
}
```

## Conclusion

Check block failures are usually either data source errors (the check cannot reach the target) or assertion failures (the infrastructure is not in the expected state). Since check blocks produce warnings rather than errors, they do not block your workflow. The key is to write robust conditions using `try()` and `can()`, accept that some checks will fail during initial creation or destruction, and use check blocks for the right purpose: ongoing health validation rather than input validation.
