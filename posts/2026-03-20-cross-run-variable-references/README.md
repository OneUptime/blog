# How to Use Cross-Run Variable References in OpenTofu Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, Variable, HCL, Test Run Blocks, Infrastructure as Code

Description: Learn how to pass values between run blocks in OpenTofu test files using output references for stateful test scenarios.

---

In OpenTofu test files, multiple `run` blocks execute in sequence. Values from earlier runs can be referenced in later runs via output references, enabling stateful test workflows where each step builds on the previous.

---

## Basic Output Reference Between Runs

```hcl
# tests/workflow.tftest.hcl

run "create_vpc" {
  command = apply

  variables {
    vpc_cidr = "10.0.0.0/16"
  }

  assert {
    condition     = aws_vpc.main.id != ""
    error_message = "VPC ID should not be empty."
  }
}

run "create_subnets" {
  command = apply

  # Reference the VPC created in the previous run via its output
  variables {
    vpc_id   = run.create_vpc.vpc_id
    vpc_cidr = "10.0.0.0/16"
  }

  assert {
    condition     = length(aws_subnet.public) == 2
    error_message = "Should create 2 public subnets."
  }
}
```

---

## Reference Module Outputs Between Runs

```hcl
run "deploy_networking" {
  module {
    source = "./modules/networking"
  }

  assert {
    condition     = output.vpc_id != ""
    error_message = "Networking module must output a VPC ID."
  }
}

run "deploy_compute" {
  module {
    source = "./modules/compute"
  }

  variables {
    vpc_id             = run.deploy_networking.vpc_id
    private_subnet_ids = run.deploy_networking.private_subnet_ids
  }
}
```

---

## Override Variables for Testing

```hcl
variables {
  environment = "test"
  region      = "us-east-1"
}

run "validate_tagging" {
  command = plan

  assert {
    condition     = aws_instance.web.tags["Environment"] == var.environment
    error_message = "Instance must be tagged with the test environment."
  }
}
```

---

## Testing Destroy Behavior

```hcl
run "create_resources" {
  command = apply
}

run "verify_before_destroy" {
  command = plan

  assert {
    condition     = aws_db_instance.main.deletion_protection == true
    error_message = "Database must have deletion protection enabled."
  }
}
```

---

## Summary

Reference values from a previous `run` block using `run.<block_label>.<output_name>`. Cross-run references can only access outputs exposed by the configuration, so any value you need in a later run must be declared as an output. This enables multi-step test workflows where later runs validate behavior that depends on resources from earlier runs. Use `variables {}` blocks at the test file or run block level to inject test-specific values.
