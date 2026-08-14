# Control State Sharing Between terraform test Run Blocks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform Test, Terraform State, Run Blocks, State Key, Test Isolation

Description: Understand Terraform test state keys, share setup intentionally across runs, and isolate scenarios that must start from an empty state.

---

Run blocks in one Terraform test file are steps, not automatically isolated test cases. By default, runs against the main configuration share one in-memory state. Runs against the same alternate module also share a state. An earlier apply can therefore change what a later plan or apply sees.

This behavior is useful for update and setup workflows, but dangerous when a test matrix assumes every scenario starts empty. Choose state boundaries before writing assertions.

The default state-sharing behavior is part of the Terraform 1.6 test framework. The explicit `state_key` attribute used later in this article requires Terraform 1.11 or later.

## Start With Terraform's State Model

For each test file, Terraform starts with empty test state that is separate from the configuration's live state. It may maintain several internal state files while that test file executes:

- one state for the main configuration under test;
- by default, one state for each distinct alternate module loaded by a `module` block;
- additional or shared states selected with explicit `state_key` values.

This test reuses main-configuration state:

~~~hcl
run "create" {
  command = apply

  variables {
    desired_count = 1
  }
}

run "scale" {
  command = apply

  variables {
    desired_count = 3
  }

  assert {
    condition     = length(aws_instance.worker) == 3
    error_message = "The update must leave three workers in state."
  }
}
~~~

`scale` does not create an unrelated second deployment. It plans from and updates the state produced by `create`.

## Remember That Plan Does Not Advance State

A plan run reads the state associated with its key but does not apply the proposed changes:

~~~hcl
run "create" {
  command = apply

  variables {
    desired_count = 1
  }
}

run "preview_scale" {
  command = plan

  variables {
    desired_count = 3
  }
}

run "verify_original" {
  command = plan

  variables {
    desired_count = 1
  }
}
~~~

The final run still begins from the one-worker applied state. The three-worker preview did not become current state. This makes a plan useful for checking migrations or replacements without changing the fixture.

## Share Values Without Sharing State

An alternate setup module normally receives its own state. Later runs can reference its outputs without merging its resources into the main state:

~~~hcl
run "setup_network" {
  module {
    source = "./testing/network"
  }
}

run "deploy_service" {
  command = apply

  variables {
    vpc_id     = run.setup_network.vpc_id
    subnet_ids = run.setup_network.private_subnet_ids
  }
}
~~~

`run.setup_network.vpc_id` is a value dependency. The network resources remain in the setup module's internal state, while service resources remain in the main configuration state. This separation gives Terraform a clearer cleanup boundary and avoids pretending two independently owned configurations are one state.

Prefer output references when a setup fixture and module under test have separate ownership. Sharing a state is not required just to pass an ID.

## Use state_key Deliberately

The `state_key` attribute overrides Terraform's default internal key. Runs with the same key use the same state, even when they load different module sources:

~~~hcl
run "setup" {
  state_key = "migration"

  module {
    source = "./testing/version_one"
  }
}

run "upgrade" {
  state_key = "migration"

  module {
    source = "./testing/version_two"
  }
}
~~~

This is an advanced migration test. The second configuration sees resources tracked by the first state and can prove that a module upgrade moves, updates, or replaces them as intended.

Using the same key does not make two arbitrary configurations compatible. Resource addresses, provider configurations, moved blocks, and ownership must make sense as one state lineage. Otherwise the second run may plan destructive changes or leave resources whose provider configuration is no longer available.

Use a distinct key to isolate scenarios within one file:

~~~hcl
run "public_mode" {
  state_key = "public"
  command   = apply

  variables {
    private = false
  }
}

run "private_mode" {
  state_key = "private"
  command   = apply

  variables {
    private = true
  }
}
~~~

The resources are separate only if their real cloud names and backend-facing identifiers are also unique. Separate Terraform state does not prevent two configurations from requesting the same bucket, role, DNS record, or network range.

## Prefer Separate Test Files for Independent Cases

Each test file begins with its own empty in-memory state. Put independent input scenarios into separate files when that improves safety and clarity:

~~~text
tests/
  public_mode.tftest.hcl
  private_mode.tftest.hcl
  upgrade_path.tftest.hcl
~~~

This makes cleanup diagnostics and filtering easier:

~~~console
$ terraform test -filter=tests/private_mode.tftest.hcl
~~~

Use multiple state keys in one file when the scenarios share file-level providers or mocks and their relationship is still clear. Use separate files when they are conceptually independent, have different credentials, or would create confusing cleanup dependencies.

## Do Not Confuse Test State With the Configured Backend

Terraform's test command maintains its test state separately and starts empty; it does not apply to the live state for the root configuration under test. That prevents a normal `terraform test` run from modifying the production state merely because the module contains a backend block.

However, data sources and provider operations can still read or create real infrastructure. A test state boundary is not an account boundary. A test using production credentials can create production resources even though its state is separate.

Always combine state isolation with:

- a dedicated account or project;
- unique run-scoped resource names;
- ownership and expiration tags where supported;
- a cleanup identity and independent janitor;
- no production remote-state write permission.

## Design Stateful Tests as Timelines

Use shared state only when the sequence itself is the behavior under test:

~~~text
apply version A -> assert baseline -> plan version B -> apply version B -> assert result
~~~

Good shared-state cases include:

- module upgrade compatibility;
- scale up and scale down;
- toggling an optional resource;
- resource replacement behavior;
- import or moved-block migrations in a controlled fixture.

Independent policy and validation checks normally do not need state sharing. A sequence that exists only to save provisioning time can couple assertions and make failures order-dependent. If sharing an expensive fixture is necessary, document which run owns it and which later runs are allowed to mutate it.

## Parallel Execution Adds Another Constraint

Terraform 1.12 and later test files can enable parallel execution:

~~~hcl
test {
  parallel = true
}
~~~

Terraform uses references between run blocks and state relationships to determine eligible parallel work. Do not enable parallel mode and assume source order still provides setup ordering. Express value dependencies with `run.<name>.<output>` references and keep runs that mutate one state logically serialized.

Even distinct state keys can collide in the cloud. Generate unique resource names, storage paths, CIDRs where required, and quota budgets per scenario before increasing concurrency.

## Plan Cleanup With Every State Boundary

After a test file completes, Terraform attempts to destroy remaining infrastructure from its test states. Monitor the command output for resources it could not destroy. Real cleanup can fail because:

- a process or runner was killed;
- deletion protection was enabled;
- one state created a dependency that another state still references;
- provider credentials expired;
- an alternate module no longer contains the provider configuration needed for destroy;
- the cloud API is eventually consistent.

Do not use shared state as a cleanup guarantee. Tag every applied resource that supports tags, and configure a separate scheduled janitor with provider-specific discovery rules for resources that do not, so cleanup does not rely on an in-memory state that vanished with the process.

## State Boundary Checklist

Before adding a run block, answer:

1. Should it see resources applied by an earlier run?
2. Is it exercising the main configuration or an alternate module?
3. Is an output reference sufficient, or must resource ownership share one state?
4. Could a unique `state_key` still collide on a real resource name?
5. Does the sequence test an update, or merely make tests order-dependent?
6. Can Terraform destroy every state if a later assertion fails?

## Official Documentation

- [Terraform tests: module state and state_key behavior](https://developer.hashicorp.com/terraform/language/tests)
- [Terraform test command: in-memory state and cleanup](https://developer.hashicorp.com/terraform/cli/commands/test)
- [Terraform test tutorial: setup runs and output references](https://developer.hashicorp.com/terraform/tutorials/configuration-language/test)
- [Terraform state purpose and remote locking](https://developer.hashicorp.com/terraform/language/state/purpose)

## Conclusion

Run blocks share state according to an internal key, not according to human expectations about test cases. Reuse the default state for intentional update sequences, pass setup outputs across separate states, and use distinct keys or files for independent scenarios. State isolation must still be paired with unique cloud identities and reliable cleanup.
