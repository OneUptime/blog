# Choose plan or apply in terraform test

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform Test, Terraform plan, Terraform apply, HCL Tests, Infrastructure Testing

Description: Choose plan for configuration logic and failure checks, or apply for stateful provider results, while controlling real infrastructure and cleanup risk.

---

Every `run` block in a Terraform test executes either a plan or an apply. The default is `command = apply`, so omitting `command` can create infrastructure. Choosing deliberately is both a test-design decision and a safety control.

Use `plan` when the assertion is answerable from configuration and planned values. Use `apply` when the assertion genuinely depends on provider-returned state or on a resource created by an earlier step. A mocked apply can still be a fast unit-like test; a real apply is an integration test with cost and cleanup obligations.

## What command = plan Does

A plan run evaluates configuration, variables, validation, dependencies, provider schemas, and planned changes without applying those changes:

~~~hcl
mock_provider "aws" {}

run "plans_encryption" {
  command = plan

  variables {
    bucket_name = "example-test-bucket"
  }

  assert {
    condition     = aws_s3_bucket_server_side_encryption_configuration.this.rule[0].apply_server_side_encryption_by_default[0].sse_algorithm == "aws:kms"
    error_message = "The plan must configure KMS encryption."
  }
}
~~~

A plan run avoids applying the proposed changes, but a real provider can still refresh existing objects and read data sources during planning. It may therefore need credentials and network access. Use a mock provider or targeted overrides when the test must be API-free.

Plan is a good fit for:

- variable validation and preconditions;
- conditional resource presence and `for_each` keys;
- names, tags, policy documents, and dependency wiring;
- checks, preconditions, and postconditions whose inputs are known during planning;
- expected validation failures;
- a broad input matrix where real resources would be slow or costly.

Plan does not make provider-computed apply-time values known. With a real provider, IDs, generated names, timestamps, endpoints, and other computed attributes may remain unknown. Do not weaken assertions just to compare an unknown value.

## What command = apply Adds

An apply run updates its test state and makes apply-time values available:

~~~hcl
run "creates_bucket" {
  command = apply

  assert {
    condition     = output.bucket_arn != null
    error_message = "The applied module must return a bucket ARN."
  }
}
~~~

With a real provider, this can create billable infrastructure. With a mock provider, Terraform follows apply semantics but returns mocked/generated computed values without calling the cloud API.

Apply is justified when testing:

- provider-populated attributes required by later run blocks;
- postconditions that depend on provider-populated apply-time values;
- state transitions across a sequence of runs;
- create/update/idempotency behavior in a dedicated environment;
- an external behavior check that needs a real service endpoint.

An apply assertion against Terraform state is still not automatically a service behavior test. An endpoint in state can exist before the service is healthy. Use a bounded external probe when user-visible behavior is the requirement.

## Apply Is the Default

This test creates or simulates creation because `command` is omitted:

~~~hcl
run "default_behavior" {
  assert {
    condition     = output.name != null
    error_message = "A name must be returned."
  }
}
~~~

Make the command explicit in every run block. Reviewers can then identify real-cloud risk without remembering the default:

~~~hcl
run "configuration_only" {
  command = plan
}

run "real_integration" {
  command = apply
}
~~~

Terraform test files are executable infrastructure programs. Treat an unlabelled default apply as a review defect, even when the current provider is mocked; a future edit could swap in a real provider.

## Handle Computed Values in Plan Tests

Terraform 1.7 and later mock providers generate computed values during apply by default. During plan, those values normally remain unknown. If a plan assertion needs a stable computed fixture, use an explicit override and choose plan-time generation deliberately:

~~~hcl
mock_provider "aws" {
  override_during = plan
}

override_resource {
  target = aws_kms_key.this
  values = {
    arn = "arn:aws:kms:eu-west-2:111122223333:key/test-key"
  }
}

run "plans_policy_with_key_arn" {
  command = plan

  assert {
    condition     = strcontains(aws_iam_policy.this.policy, "test-key")
    error_message = "The planned policy must reference the KMS key."
  }
}
~~~

The `override_during` setting changes when mock values become available. Record it because it affects plan behavior, not merely test output.

Prefer overriding only values needed by the assertion. Terraform's generated mock strings do not know provider-specific formats, so code that parses an ARN or URL needs a realistic explicit fixture.

## Use expect_failures With the Right Command

Terraform tests can expect specific validation objects to fail:

~~~hcl
run "rejects_public_access" {
  command = plan

  variables {
    allow_public_access = true
    environment         = "production"
  }

  expect_failures = [
    var.allow_public_access,
  ]
}
~~~

The address in `expect_failures` must point to a checkable object supported by the Terraform test language, such as an input variable validation, output precondition, resource pre/postcondition, or check. Use the earliest command that can evaluate it. A variable validation should not require an apply.

Do not use `expect_failures` as a wildcard for provider or syntax errors. Unexpected diagnostics should still fail the test.

## Understand State Across Run Blocks

Within a test file, run blocks that use the same state key operate on the same in-memory state. An apply changes that state; a plan does not apply its proposed changes.

This supports stateful sequences:

~~~hcl
run "create" {
  command = apply

  variables {
    object_count = 1
  }
}

run "preview_scale_out" {
  command = plan

  variables {
    object_count = 3
  }

  assert {
    condition     = length(aws_s3_object.this) == 3
    error_message = "The scale-out plan must contain three objects."
  }
}
~~~

The second run plans from the state created by the first. If isolation is required, use a separate test file. Terraform 1.11 and later also support an intentional `state_key`; do not assume every run starts empty.

## Match the Command to the Assertion

| Assertion | Preferred command | Reason |
| --- | --- | --- |
| input is rejected | plan | validation is available before creation |
| resource count or configured tag | plan | planned configuration is sufficient |
| provider-generated ID has expected relationship | apply or explicit mock override | value is normally unknown during plan |
| update preserves an existing object | apply sequence | requires prior state and provider behavior |
| endpoint serves a response | apply plus external probe | requires a real service |
| module composes policy text | plan with mock | no real API is needed |

If an assertion can pass with a plan, an apply adds time, cost, quota usage, eventual consistency, and cleanup risk without adding evidence.

## Protect Real Apply Tests

For every real apply run:

- use a dedicated test account, subscription, or project;
- use short-lived, least-privilege credentials;
- add run ownership and expiry tags;
- set a CI timeout that leaves time for cleanup;
- monitor Terraform's cleanup diagnostics;
- run a periodic janitor that discovers tagged leftovers independently of local state.

Terraform attempts to destroy resources remaining after each test file, but the command documentation tells operators to monitor cleanup and manually remove anything Terraform could not destroy. A killed process cannot be trusted to run in-process cleanup.

## Inspect the Right Artifact

`terraform test -verbose` prints a plan for a plan run and state for an apply run. This is useful when an assertion fails:

~~~console
$ terraform test -filter=tests/encryption.tftest.hcl -verbose
~~~

Be careful with CI logs. Plans and state can include sensitive values. Restrict artifact access and avoid enabling verbose output by default on untrusted pull requests.

## Official Documentation

- [Terraform tests: plan and apply run semantics](https://developer.hashicorp.com/terraform/language/tests)
- [Terraform test command and cleanup behavior](https://developer.hashicorp.com/terraform/cli/commands/test)
- [Terraform test mocking and override timing](https://developer.hashicorp.com/terraform/language/tests/mocking)
- [Terraform testing features and validation boundaries](https://developer.hashicorp.com/terraform/cli/test)

## Conclusion

Choose the least powerful command that can prove the assertion. Plan is the default design choice for configuration, validation, and input matrices; apply is for stateful provider results and real behavior. Since Terraform itself defaults each run to apply, write the command explicitly and give every real apply a dedicated environment and cleanup strategy.
