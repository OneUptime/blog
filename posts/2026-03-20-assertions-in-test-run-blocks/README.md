# How to Use Assertions in OpenTofu Test Run Blocks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, HCL, Assertions, Infrastructure as Code, Quality Assurance

Description: Learn how to write assertions inside OpenTofu test run blocks to validate infrastructure behavior and catch configuration regressions.

---

OpenTofu's native testing framework (`tofu test`) allows you to write test files that provision real or mock infrastructure and then assert expected conditions. Assertions in `run` blocks verify expected conditions after a `plan` or `apply` operation.

---

## Test File Structure

Test files use the `.tftest.hcl` extension and can live in the current directory or in a `tests` directory.

```hcl
# tests/networking.tftest.hcl

# Define variables for the test

variables {
  vpc_cidr = "10.0.0.0/16"
  region   = "us-east-1"
}

# Run block: apply and assert
run "creates_vpc_with_correct_cidr" {
  command = apply

  assert {
    condition     = aws_vpc.main.cidr_block == var.vpc_cidr
    error_message = "VPC CIDR block does not match the expected value."
  }

  assert {
    condition     = aws_vpc.main.enable_dns_hostnames == true
    error_message = "VPC should have DNS hostnames enabled."
  }
}
```

---

## Multiple Assertions Per Run Block

```hcl
run "ec2_instance_configuration" {
  command = apply

  assert {
    condition     = aws_instance.web.instance_type == "t3.micro"
    error_message = "Instance type should be t3.micro."
  }

  assert {
    condition     = aws_instance.web.associate_public_ip_address == false
    error_message = "Instance should not have a public IP in production."
  }

  assert {
    condition     = length(aws_instance.web.tags) > 0
    error_message = "Instance must have tags defined."
  }
}
```

---

## Using Plan Command for Faster Assertions

```hcl
run "validate_plan_without_applying" {
  command = plan  # Does not create resources

  assert {
    condition     = aws_s3_bucket.data.bucket_prefix == null
    error_message = "Bucket should use an explicit name, not a prefix."
  }
}
```

---

## Chaining Run Blocks

```hcl
run "deploy_database" {
  command = apply
}

run "verify_database_endpoint" {
  command = apply

  assert {
    condition     = length(aws_db_instance.main.endpoint) > 0
    error_message = "Database endpoint should not be empty after deployment."
  }
}
```

---

## Running Tests

```bash
# Run all tests in the current module
tofu test

# Run tests in a specific file
tofu test -filter=tests/networking.tftest.hcl

# Run with verbose output
tofu test -verbose
```

---

## Summary

OpenTofu test `run` blocks support multiple `assert` statements that evaluate HCL expressions after a `plan` or `apply` operation. Use `command = plan` for lightweight validation without provisioning, and `command = apply` when you need real resource attributes. Use multiple `run` blocks to structure related test cases. Run with `tofu test` in CI to catch configuration regressions early.
