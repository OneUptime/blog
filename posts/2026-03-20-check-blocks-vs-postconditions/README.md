# How to Use Check Blocks vs Postconditions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Testing

Description: Understand the differences between check blocks and postconditions in OpenTofu and know when to use each for infrastructure validation.

## Introduction

OpenTofu provides two validation mechanisms that are often used after infrastructure has been evaluated: check blocks and postconditions. While they may seem similar, they behave differently and serve distinct purposes. Choosing between them depends on whether you want warnings or blocking errors, and whether you need access to the associated object's `self` object.

## Key Differences

| Feature | `check` block | `postcondition` |
|---------|--------------|-----------------|
| Lives in | Top-level configuration | Resource or data source `lifecycle` block |
| Runs | Every plan and apply | After the associated resource or data source is evaluated |
| On failure | Warning (non-blocking) | Error (blocks the operation) |
| `self` access | No | Yes |
| Scoped data source | Yes (one per check) | No |
| Timing | Last step of the plan or apply | During plan or apply, depending on when values become known |

## Postcondition Example

Postconditions are defined inside a resource or data source and can reference `self`:

```hcl
data "http" "website" {
  url = "https://www.opentofu.org"

  lifecycle {
    postcondition {
      # self references the object after OpenTofu evaluates it
      condition     = self.status_code == 200
      error_message = "${self.url} returned an unhealthy status code"
    }
  }
}
```

## Check Block Example

Check blocks are top-level and can use scoped data sources for live queries:

```hcl
check "website_up" {
  data "http" "health" {
    url = "https://www.opentofu.org"
  }

  assert {
    # Check blocks do NOT have self - use data source or direct resource reference
    condition     = data.http.health.status_code == 200
    error_message = "${data.http.health.url} returned an unhealthy status code"
  }
}
```

## When to Use Postconditions

Use postconditions when:

1. You want to block the plan or apply if a guarantee is not met
2. You need to validate the actual resource or data source attributes via `self`
3. You want to catch cases where the provider or remote system does not produce the expected result

```hcl
resource "aws_s3_bucket" "state" {
  bucket = "my-state-bucket"

  lifecycle {
    postcondition {
      # Verify the bucket was created with the exact name we requested
      condition     = self.bucket == "my-state-bucket"
      error_message = "Bucket created with unexpected name: ${self.bucket}"
    }
  }
}
```

## When to Use Check Blocks

Use check blocks when:

1. You want non-blocking warnings (gradual adoption of rules)
2. You need to query external state via a scoped data source
3. You want recurring validation on every plan and apply, not just when a resource changes
4. You're doing health checks or compliance validation

```hcl
check "website_up" {
  data "http" "health" {
    url = "https://${aws_lb.main.dns_name}/health"
  }

  assert {
    condition     = data.http.health.status_code == 200
    error_message = "Health check failed: ${data.http.health.status_code}"
  }
}
```

## Using Both Together

In practice, use postconditions for correctness guarantees and check blocks for recurring compliance checks during plan and apply:

```hcl
# Postcondition: Block if encryption isn't actually enabled

resource "aws_ebs_volume" "data" {
  availability_zone = "us-east-1a"
  size      = 100
  encrypted = true

  lifecycle {
    postcondition {
      condition     = self.encrypted == true
      error_message = "Volume was created without encryption"
    }
  }
}

# Check block: Non-blocking rule evaluated on every plan/apply
check "volume_encryption_compliance" {
  assert {
    condition     = aws_ebs_volume.data.encrypted == true
    error_message = "EBS volume encryption compliance check failed"
  }
}
```

## Failure Output Comparison

Postcondition failure (blocks the operation):
```text
Error: Resource postcondition failed
  on main.tf line 12, in resource "aws_ebs_volume" "data":
Volume was created without encryption
```

Check block failure (warning only, apply succeeds):
```text
Warning: Check block assertion failed
  on main.tf line 22, in check "volume_encryption_compliance":
EBS volume encryption compliance check failed
Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
```

## Conclusion

Use postconditions when you need hard guarantees about a specific resource or data source and want to block incorrect plans or applies. Use check blocks for recurring compliance checks, health checks, and non-blocking validation that won't halt your pipeline. The two mechanisms complement each other: postconditions enforce guarantees on specific objects, while check blocks provide broader visibility at the end of plan and apply runs.
