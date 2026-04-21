# How to Structure Test Directories for OpenTofu Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Testing, Project Structure, Infrastructure as Code, Best Practice

Description: Learn how to organize and structure test directories for OpenTofu modules, including separating unit tests, integration tests, and end-to-end tests for maintainability.

## Introduction

A well-organized test directory structure makes it easier to find, run, and maintain tests for OpenTofu modules. This guide covers recommended patterns for structuring tests from simple modules to complex multi-module projects.

## Simple Module Structure

For a single module, co-locate tests in a `tests/` subdirectory:

```text
networking-module/
├── main.tf
├── variables.tf
├── outputs.tf
├── versions.tf
└── tests/
    ├── basic.tftest.hcl
    ├── advanced.tftest.hcl
    └── fixtures/
        ├── minimal/
        │   └── main.tf
        └── complete/
            └── main.tf
```

## Multi-Module Repository Structure

For a repository with many modules:

```text
infra/
├── modules/
│   ├── networking/
│   │   ├── main.tf
│   │   └── tests/
│   ├── compute/
│   │   ├── main.tf
│   │   └── tests/
│   └── database/
│       ├── main.tf
│       └── tests/
├── environments/
│   ├── dev/
│   ├── staging/
│   └── prod/
└── tests/
    └── e2e/
        ├── full_stack.tftest.hcl
        └── networking_compute.tftest.hcl
```

## Separating Test Types

Organize by test speed and scope:

```text
module/
└── tests/
    ├── unit/           # Fast, no real infra (plan-only)
    │   ├── variables.tftest.hcl
    │   └── outputs.tftest.hcl
    ├── integration/    # Creates real resources
    │   ├── basic.tftest.hcl
    │   └── advanced.tftest.hcl
    └── fixtures/       # Shared test configurations
        ├── variables.tf
        └── outputs.tf
```

## Using Fixtures

Test fixtures provide reusable configurations for tests:

```hcl
# tests/fixtures/minimal/main.tf

module "under_test" {
  source = "../../../"

  name        = "test-${random_id.suffix.hex}"
  environment = "dev"
  region      = "us-east-1"
}
```

Reference in test file:

```hcl
# tests/integration/basic.tftest.hcl
run "basic_deployment" {
  module {
    source = "./tests/fixtures/minimal"
  }

  assert {
    condition     = module.under_test.vpc_id != ""
    error_message = "VPC ID should not be empty"
  }
}
```

## File Naming Conventions

| File Pattern | Purpose |
|-------------|---------|
| `*.tftest.hcl`, `*.tofutest.hcl` | OpenTofu native test files |
| `*_test.go` | Terratest Go test files |
| `fixtures/` | Reusable test configurations |
| `mocks/` | Mock provider data |

## Running Tests by Type

```bash
# Unit tests only
tofu test -test-directory=tests/unit

# Integration tests
tofu test -test-directory=tests/integration

# All tests
tofu test
```

## Conclusion

A structured test directory approach makes OpenTofu module testing scalable and maintainable. Separating unit tests (plan-only, fast) from integration tests (real resources, slower) lets you run quick validation frequently while reserving expensive tests for CI/CD pipelines.
