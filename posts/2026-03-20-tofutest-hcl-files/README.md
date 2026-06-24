# How to Write tofutest HCL Test Files in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, Tofutest, HCL, Infrastructure as Code, Tofu test

Description: Learn how to use OpenTofu's native tofutest framework with HCL test files, including advanced features like setup runs, module overrides, and state-based assertions.

## Introduction

OpenTofu's testing framework (sometimes called tofutest) uses `.tftest.hcl` or `.tofutest.hcl` files and provides features beyond basic plan assertions - including applying infrastructure, running setup modules, automatically cleaning up test resources, and validating real resource attributes from state.

## Multi-Run Test Sequences

Runs within a file execute in order. Later runs can use the state from previous apply runs, but each run still needs the variables required by the module. Put shared inputs in a file-level `variables` block:

```hcl
# tests/full_lifecycle.tftest.hcl

variables {
  name       = "lifecycle-test-vpc"
  cidr_block = "10.99.0.0/16"
}

run "create_vpc" {
  command = apply

  assert {
    condition     = aws_vpc.main.id != ""
    error_message = "VPC was not created"
  }
}

run "verify_subnets_reference_vpc" {
  command = plan

  assert {
    condition     = aws_subnet.public[0].vpc_id == aws_vpc.main.id
    error_message = "Subnet should reference the created VPC"
  }
}
```

## Using Setup Modules

A setup `run` block can load a helper module to prepare prerequisites before the main test run:

```hcl
run "setup_prerequisites" {
  module {
    source = "./tests/setup"
  }
}

run "test_main_module" {
  variables {
    vpc_id = run.setup_prerequisites.vpc_id
  }

  command = apply
}
```

## Overriding Specific Modules

Replace a dependency with a simplified stub:

```hcl
override_module {
  target = module.expensive_dependency
  outputs = {
    endpoint = "mock-endpoint.example.com"
    port     = 5432
  }
}

run "test_without_real_database" {
  command = plan

  assert {
    condition     = aws_instance.app.user_data != null
    error_message = "User data should be set"
  }
}
```

## Accessing Run Outputs

Reference outputs from a previous run:

```hcl
run "apply_infrastructure" {
  command = apply
}

run "validate_infrastructure" {
  command = plan

  variables {
    # Use output from previous apply run
    existing_vpc_id = run.apply_infrastructure.vpc_id
  }
}
```

## Automatic Cleanup After Tests

```hcl
run "create_resources" {
  command = apply
}

run "verify_resources_exist" {
  command = plan
  assert {
    condition     = aws_instance.app.id != ""
    error_message = "Instance should exist"
  }
}

# OpenTofu automatically destroys resources created during the test run after all runs complete
```

## Running with Verbose Output

```bash
# Print the plan or state for each run block
tofu test -verbose

# Capture verbose output
tofu test -verbose 2>&1 | tee test-output.log
```

## Conclusion

OpenTofu's `.tftest.hcl` and `.tofutest.hcl` files support sophisticated multi-step test scenarios with ordered run execution, setup modules, and module overrides. This lets you write comprehensive end-to-end tests that validate real infrastructure behavior while keeping tests readable and maintainable in HCL.
