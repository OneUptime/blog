# How to Use .tofutest.hcl Files in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, Tofutest.hcl, Infrastructure as Code, Test Files

Description: Understand the `.tofutest.hcl` file extension introduced in OpenTofu as an alternative to `.tftest.hcl` and when to use each format.

## Introduction

OpenTofu supports two HCL test file extensions: `.tftest.hcl` and `.tofutest.hcl`. The `.tofutest.hcl` extension was introduced as an OpenTofu-specific alternative, useful when you want to clearly distinguish OpenTofu test files from Terraform test files in a shared or migrating codebase.

Both HCL extensions use the same test syntax: every feature available in `.tftest.hcl` works the same way in `.tofutest.hcl`. The main difference is file precedence: if `main.tftest.hcl` and `main.tofutest.hcl` both exist in the same directory, OpenTofu loads `main.tofutest.hcl` and ignores `main.tftest.hcl`.

## When to Use `.tofutest.hcl`

Choose `.tofutest.hcl` when:

- Your repository is in the process of migrating from Terraform to OpenTofu and you want to keep the test suites separate during transition.
- You maintain OpenTofu-only tests that `terraform test` should ignore.
- Your organisation's style guide mandates OpenTofu-specific naming to signal toolchain alignment.

Choose `.tftest.hcl` when:

- You want maximum compatibility and plan to support both tools.
- You are starting fresh with OpenTofu and want familiar naming.

## Example `.tofutest.hcl` File

The syntax is identical to `.tftest.hcl`. Here is a complete example testing a networking module:

```hcl
# tests/vpc.tofutest.hcl

variables {
  vpc_cidr      = "10.0.0.0/16"
  subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
  environment   = "test"
}

run "vpc_created_with_correct_cidr" {
  command = apply

  assert {
    condition     = aws_vpc.main.cidr_block == "10.0.0.0/16"
    error_message = "VPC CIDR block does not match the input variable"
  }

  assert {
    condition     = aws_vpc.main.enable_dns_hostnames == true
    error_message = "DNS hostnames should be enabled on the VPC"
  }
}

run "correct_number_of_subnets_created" {
  variables {
    subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  }

  assert {
    condition     = length(aws_subnet.public) == 3
    error_message = "Expected 3 subnets, got ${length(aws_subnet.public)}"
  }
}
```

## Running `.tofutest.hcl` Files

`tofu test` automatically discovers both `.tftest.hcl` and `.tofutest.hcl` files:

```bash
# Discovers and runs both .tftest.hcl and .tofutest.hcl files

tofu test

# Use a specific test directory; files in the current directory are still loaded
tofu test -test-directory=tests/
```

If you need to run a specific `.tofutest.hcl` file, use the `-filter` flag. Repeat the flag for more than one file:

```bash
# Run only the vpc test file
tofu test -filter=tests/vpc.tofutest.hcl
```

## Mixing Both Extensions

You can safely mix both extensions in the same project. OpenTofu uses the same test syntax for both, with one important precedence rule: when a `.tofutest.hcl` file has the same base name as a `.tftest.hcl` file in the same directory, OpenTofu runs the `.tofutest.hcl` file and ignores the `.tftest.hcl` file.

```text
modules/
  networking/
    main.tf
    variables.tf
    outputs.tf
    networking.tftest.hcl       ← Terraform-compatible tests
    networking.tofutest.hcl     ← OpenTofu replacement tests with the same base name
```

This pattern is useful during gradual migration: keep the Terraform-compatible tests in `.tftest.hcl` and move OpenTofu-specific replacement tests into `.tofutest.hcl`. If you want OpenTofu to run both files, give them different base names or use `-filter` to select the exact files to run.

## Conclusion

The `.tofutest.hcl` extension offers a clear signal of OpenTofu alignment without sacrificing any functionality. Whether you choose `.tftest.hcl` or `.tofutest.hcl` is mostly a team convention decision-pick one and apply it consistently across your codebase.
