# Test Terraform Data Sources With Mocks and Overrides

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform Test, Mock Providers, Data Source Override, Data Source, Computed Attributes

Description: Use Terraform provider schemas with deterministic data source and resource overrides, including plan-time computed values and nested module targets.

---

Terraform 1.7 and later can replace provider operations with schema-aware mocks. This is useful for testing how a module transforms data source results and provider-computed attributes without credentials or cloud resources.

The schema awareness has a boundary: Terraform knows types and whether attributes are required, optional, or computed. It does not know that a generated string should look like an ARN, IP address, region, or URL. Any assertion that depends on format needs an explicit fixture.

## Know What mock_provider Provides

A mock provider uses the real provider schema but does not call the provider's remote APIs for mocked objects:

~~~hcl
mock_provider "aws" {}

run "basic_plan" {
  command = plan
}
~~~

Configuration values remain the values supplied by the module. Provider-computed attributes on newly created managed resources receive generated values during apply by default. Mocked data sources are normally read during planning when their arguments and dependencies are known. HashiCorp documents these generated defaults:

- numbers become `0`;
- booleans become `false`;
- strings become random eight-character alphanumeric values;
- collections become empty collections;
- objects recursively generate required sub-attributes.

Generated values are suitable when the test only needs a value to be present and correctly typed. They are unsuitable when module logic parses a string or requires a nonempty collection.

## Override a Data Source With Realistic Values

Suppose a module discovers a VPC and uses its ID:

~~~hcl
data "aws_vpc" "shared" {
  tags = {
    Environment = var.environment
  }
}

resource "aws_security_group" "service" {
  vpc_id = data.aws_vpc.shared.id
}
~~~

Give the data source a deterministic response:

~~~hcl
# tests/network.tftest.hcl
mock_provider "aws" {}

override_data {
  target = data.aws_vpc.shared
  values = {
    id         = "vpc-0123456789abcdef0"
    cidr_block = "10.50.0.0/16"
    tags = {
      Environment = "test"
    }
  }
}

run "uses_discovered_vpc" {
  command = apply

  variables {
    environment = "test"
  }

  assert {
    condition     = aws_security_group.service.vpc_id == "vpc-0123456789abcdef0"
    error_message = "The security group must use the discovered VPC."
  }
}
~~~

The override supplies computed result values. Arguments that the provider schema marks as required for resources and data sources still need valid configuration.

## Target Objects Inside Modules Precisely

Overrides use Terraform addresses. A data source inside a child module includes its full module path:

~~~hcl
override_data {
  target = module.service.data.aws_subnets.private
  values = {
    ids = ["subnet-0123456789abcdef0", "subnet-0fedcba9876543210"]
  }
}
~~~

For indexed module or resource instances, use the same address syntax Terraform uses elsewhere. If a target is created with `for_each`, make the key explicit when the override applies to one instance.

Avoid overriding an implementation detail several modules deep when the consumer only owns the parent module contract. In that case, replace the module output:

~~~hcl
override_module {
  target = module.network_lookup
  outputs = {
    vpc_id             = "vpc-0123456789abcdef0"
    private_subnet_ids = ["subnet-0123456789abcdef0", "subnet-0fedcba9876543210"]
  }
}
~~~

`override_module` skips resource creation in the target module and supplies outputs. It tests the caller's behavior against that contract, not the target module's internals.

## Override Provider-Computed Resource Attributes

The same mechanism handles a resource attribute used by another resource:

~~~hcl
override_resource {
  target = aws_kms_key.logs
  values = {
    arn    = "arn:aws:kms:eu-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab"
    key_id = "1234abcd-12ab-34cd-56ef-1234567890ab"
  }
}

run "writes_key_arn_into_policy" {
  command = apply

  assert {
    condition     = strcontains(aws_iam_policy.logs.policy, "1234abcd-12ab-34cd-56ef-1234567890ab")
    error_message = "The policy must reference the log KMS key."
  }
}
~~~

This avoids asserting against a random generated string. Include only values the module consumes or asserts; a giant imitation of a provider response becomes hard to maintain when the provider schema changes.

## Make Values Known During a Plan

Provider-computed attributes on mocked managed resources are normally generated during apply, so they remain unknown in a plan. Starting in Terraform 1.11, HashiCorp provides `override_during` for tests that need plan-time resource values. Data sources with known arguments and dependencies are already read during planning; Terraform defers their reads when those inputs are unknown.

~~~hcl
mock_provider "aws" {
  override_during = plan
}

override_resource {
  target          = aws_kms_key.logs
  override_during = plan

  values = {
    arn    = "arn:aws:kms:eu-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab"
    key_id = "1234abcd-12ab-34cd-56ef-1234567890ab"
  }
}

run "plans_key_arn_in_policy" {
  command = plan

  assert {
    condition     = strcontains(aws_iam_policy.logs.policy, "1234abcd-12ab-34cd-56ef-1234567890ab")
    error_message = "The planned policy must reference the log KMS key."
  }
}
~~~

An override's own `override_during` setting takes precedence over the mock provider setting. Use plan-time generation only when the production value would be known during planning or when the test deliberately supplies a fixture. Otherwise the mock can make an impossible production plan appear valid.

## Understand Override Scope and Precedence

Override blocks can appear at test-file scope or inside a run block. When both scopes override the same target address, a run-level override wins for that run:

~~~hcl
mock_provider "aws" {}

override_data {
  target = data.aws_region.current
  values = { region = "eu-west-2" }
}

run "alternate_region" {
  override_data {
    target = data.aws_region.current
    values = { region = "us-east-2" }
  }

  assert {
    condition     = local.partitioned_name == "service-us-east-2"
    error_message = "The run-level region fixture must take precedence."
  }
}
~~~

`override_resource` and `override_data` can also be nested in a `mock_provider` or a mock data file. A provider-nested override applies when that mock provider creates the target. File-level and run-level overrides are independent of whether the target otherwise uses a real or mocked provider; Terraform skips the underlying operation for the overridden target.

Keep fixtures close to their scope:

- file scope for the shared default contract;
- run scope for one scenario variation;
- mock data files for reusable provider fixtures maintained as a unit.

## Mix Real and Mocked Provider Configurations Safely

A test file can define provider aliases and map a run to a particular configuration. This supports a mocked unit suite and a smaller real integration suite, but make the distinction obvious:

~~~hcl
mock_provider "aws" {
  alias = "fake"
}

provider "aws" {
  alias  = "integration"
  region = "eu-west-2"
}

run "unit" {
  command = plan
  providers = { aws = aws.fake }
}

run "integration" {
  command = apply
  providers = { aws = aws.integration }
}
~~~

Do not rely on default provider resolution in a file that mixes real and fake configurations. An accidental real apply can create infrastructure.

## Assert Module Logic, Not Provider Implementation

Good mock assertions ask whether the module:

- passes a discovered VPC ID to the right resource;
- transforms a returned CIDR into the intended rules;
- rejects an empty subnet contract;
- places a computed ARN into a policy;
- chooses a branch based on a supplied provider attribute.

Mock tests cannot prove:

- the provider really returns the fixture shape for that API call;
- credentials have permission;
- the cloud accepts the configured combination;
- the service becomes healthy;
- deletion behaves correctly.

Keep at least one version-pinned real-provider integration test for critical API contracts. The mock suite provides coverage and speed, while the integration suite detects drift between assumptions and provider/cloud behavior.

## Debugging Checklist

If a mock test fails unexpectedly:

1. Check the Terraform version; mocking requires Terraform 1.7 or later, while `override_during` requires Terraform 1.11 or later.
2. Confirm the target address with `terraform test -verbose` output.
3. Identify whether the needed attribute is computed, optional, or required in the provider schema.
4. Check whether a plan sees the value as unknown.
5. Look for a run-level override that supersedes the file-level fixture.
6. Confirm the run maps to the intended provider alias.
7. Replace format-dependent generated values with explicit fixtures.

Verbose output can contain sensitive configuration and state. Restrict CI artifacts when using it.

## Official Documentation

- [Terraform test mocking and generated-value behavior](https://developer.hashicorp.com/terraform/language/tests/mocking)
- [Terraform tests language and provider mapping](https://developer.hashicorp.com/terraform/language/tests)
- [Terraform provider schema concepts](https://developer.hashicorp.com/terraform/plugin/framework/handling-data/schemas)
- [Terraform test command and verbose output](https://developer.hashicorp.com/terraform/cli/commands/test)

## Conclusion

Use `mock_provider` for schema-correct, API-free execution and explicit overrides for values whose format or contents matter. Target data sources and resources at the narrowest owned boundary, control whether mocked resource values appear during plan or apply, and keep a small real-provider suite for behavior no fixture can prove.
