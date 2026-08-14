# Test Terraform Modules That Depend on Shared Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform Test, Terraform Modules, Shared VPC, IAM, Remote State, Mock Providers

Description: Test modules that consume shared networks, IAM, and remote outputs with clear unit, contract, and dedicated-cloud integration boundaries.

---

A module that consumes a shared VPC, organization IAM, or outputs from another Terraform state has two responsibilities: transform dependency inputs correctly and integrate with the real dependency contract. One test should not try to prove both at once.

Use three layers:

1. fast tests with dependency values supplied or overridden;
2. contract tests for the published shape of shared outputs;
3. real-cloud integration tests in a dedicated test account or project.

This structure keeps ordinary pull requests independent of production state while still detecting provider permissions, routing, and policy behavior that mocks cannot reproduce.

## Prefer Explicit Dependency Inputs

A reusable child module is easiest to test when it accepts stable values such as VPC ID, subnet IDs, and role ARN:

~~~hcl
variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "execution_role_arn" {
  type = string
}
~~~

Keep backend access and organization-specific discovery in a thin root module when possible. The child module can then be tested with deterministic values without credentials or remote state:

~~~hcl
# tests/inputs.tftest.hcl
mock_provider "aws" {}

run "uses_shared_network_inputs" {
  command = plan

  variables {
    vpc_id              = "vpc-test0001"
    private_subnet_ids  = ["subnet-test0001", "subnet-test0002"]
    execution_role_arn  = "arn:aws:iam::111122223333:role/test-execution"
  }

  assert {
    condition = aws_security_group.workload.vpc_id == var.vpc_id
    error_message = "The workload security group must use the supplied VPC."
  }
}
~~~

Mock-provider generated strings do not know AWS ARN or ID syntax. Supply meaningful dependency inputs and override any computed value whose format the module parses.

## Override Discovery at the Narrowest Boundary

Terraform 1.7 and later can mock providers and override resources, data sources, and module outputs. If the module intentionally discovers a shared VPC through a data source, override that data source:

~~~hcl
mock_provider "aws" {}

override_data {
  target = data.aws_vpc.shared
  values = {
    id         = "vpc-test0001"
    cidr_block = "10.40.0.0/16"
  }
}

run "builds_rules_for_shared_cidr" {
  command = plan

  assert {
    condition = aws_security_group_rule.internal.cidr_blocks == ["10.40.0.0/16"]
    error_message = "The internal rule must use the discovered VPC CIDR."
  }
}
~~~

If a wrapper module consumes a separate module that reads remote state, an `override_module` can provide the published outputs without executing that module:

~~~hcl
mock_provider "aws" {}

override_module {
  target = module.network_contract
  outputs = {
    vpc_id             = "vpc-test0001"
    private_subnet_ids = ["subnet-test0001", "subnet-test0002"]
  }
}
~~~

Override the boundary the consumer owns. Reproducing an entire provider response makes the test brittle and can accidentally test the mock fixture rather than module logic.

## Treat Remote State as a Security Boundary

The built-in `terraform_remote_state` data source exposes root outputs, but HashiCorp warns that a caller needs access to the full state snapshot to read them. State can contain sensitive values even when those values are not exposed as outputs.

For integration tests:

- use a dedicated upstream test state, never production state;
- grant read access only to the test identity that needs it;
- publish a small, versioned output contract;
- avoid asserting raw backend details or state serialization;
- rotate and purge test state according to the same security policy as other state.

HashiCorp also suggests publishing shared values to a configuration store, DNS, object, or provider-specific resource when consumers should not receive state access. That pattern can make the dependency independently permissioned and testable.

## Test the Contract Separately

A contract test checks assumptions such as nonempty subnets, address-family support, region, and account ownership. It should fail with a clear message before a downstream apply starts.

For a consumer that receives inputs, encode invariants as variable validation or preconditions:

~~~hcl
variable "private_subnet_ids" {
  type = list(string)

  validation {
    condition     = length(var.private_subnet_ids) >= 2
    error_message = "At least two private subnets are required."
  }
}
~~~

Then test invalid and valid contracts with `command = plan`. Provider-independent validation belongs close to the module interface and does not need a real VPC.

For a remote-state wrapper, test a dedicated fixture that publishes the same output schema. Do not rely only on static output names: verify semantic constraints such as region, partition, number of availability zones, and whether the supplied role may be assumed by the test identity.

## Use a Setup Module for Owned Fixtures

Terraform tests can run an alternate setup module and reference its outputs from later run blocks:

~~~hcl
run "setup" {
  module {
    source = "./testing/setup"
  }
}

run "deploy_consumer" {
  command = apply

  variables {
    vpc_id             = run.setup.vpc_id
    private_subnet_ids = run.setup.private_subnet_ids
  }

  assert {
    condition     = output.vpc_id == run.setup.vpc_id
    error_message = "The module used a different VPC from the fixture."
  }
}
~~~

Terraform executes run blocks sequentially unless parallel execution is enabled and references impose dependencies. Test-file parallel execution requires Terraform 1.12 or later. Terraform keeps test state in memory and attempts to destroy remaining resources after a test file completes.

Create only fixtures the test account owns. Shared organization routing, central identity, and production network resources should be treated as external contracts, not resources a test may create or destroy.

## Configure Real Providers Deliberately

For an integration test, give the test file an explicit provider configuration and test credentials scoped to a dedicated account:

~~~hcl
provider "aws" {
  alias  = "integration"
  region = "eu-west-2"

  default_tags {
    tags = {
      ManagedBy = "terraform-test"
      TestRun   = var.test_run_id
    }
  }
}

run "integration" {
  command = apply

  providers = {
    aws = aws.integration
  }
}
~~~

Do not place static credentials in the test file. Use the provider's supported workload-identity or short-lived credential mechanism. Ensure the identity can create and destroy only test resources and cannot mutate the shared VPC or organization IAM it consumes.

## Decide What Each Layer Can Prove

| Layer | Good assertions | Cannot prove |
| --- | --- | --- |
| mocked plan | dependency wiring, names, policies, validations | provider API behavior or permissions |
| contract fixture | output schema and semantic invariants | real shared environment availability |
| dedicated-cloud apply | credentials, provider behavior, attachment and service behavior | production-specific policy unless deliberately mirrored |

Keep a small real-cloud suite for facts mocks cannot model: cross-account role assumption, route propagation, service-linked roles, policy enforcement, and eventual consistency. Run it with explicit timeouts, cleanup monitoring, and ownership tags.

## Avoid Common Traps

- Terraform test state begins empty and is separate from live state; it does not automatically import existing shared resources.
- A mocked provider validates Terraform evaluation, not cloud authorization.
- A data source query against a real account can still expose or depend on production details.
- A setup module and the module under test can share outputs without sharing the same state; references to `run.setup.*` pass values.
- Never give a cleanup identity permission to destroy organization-owned shared infrastructure.

## Official Documentation

- [Terraform tests language and alternate setup modules](https://developer.hashicorp.com/terraform/language/tests)
- [Terraform test provider mocking and overrides](https://developer.hashicorp.com/terraform/language/tests/mocking)
- [Terraform test command state and cleanup behavior](https://developer.hashicorp.com/terraform/cli/commands/test)
- [Terraform remote state data and access considerations](https://developer.hashicorp.com/terraform/language/state/remote-state-data)
- [Terraform provider configurations within modules](https://developer.hashicorp.com/terraform/language/modules/develop/providers)

## Conclusion

Make shared infrastructure an explicit, versioned dependency. Test transformation logic with supplied values or narrow overrides, test the dependency contract with a controlled fixture, and reserve real-cloud applies for behavior that requires provider APIs and permissions. Dedicated test state and least-privilege identities keep those tests useful without coupling pull requests to production.
