# Test Terraform Resource Replacement Before Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Resource Replacement, Infrastructure Testing, Lifecycle, Plan JSON, Zero Downtime

Description: Rehearse a forced Terraform replacement from real prior state, inspect the full plan, and verify name, quota, availability, and cleanup behavior safely.

---

A Terraform change that forces resource replacement is not adequately tested by planning from empty state. The risk lives in the transition: Terraform must act on an existing object, dependent resources may also change, old and new objects may need to coexist, and the service may become unavailable between deletion and recreation.

Test the same transition in a dedicated environment. Apply a baseline, change one input or module version, save the new plan, inspect every create and delete action, then apply and verify behavior. Keep state, provider versions, credentials, and cleanup under explicit ownership throughout the rehearsal.

## Prove That Replacement Is Natural

Terraform represents replacement as a resource action containing both `create` and `delete`. The action order is meaningful: `["create", "delete"]` is create before destroy, while `["delete", "create"]` is destroy before create.

Terraform's JSON plan may include `action_reason` such as `replace_because_cannot_update`, but the documentation calls reason codes display hints whose possible values can change. Use the action pair as the stable replacement signal and treat a recognized reason as diagnostic context.

Do not use `terraform plan -replace=ADDRESS` to prove that a configuration change naturally requires replacement. The `-replace` option explicitly requests replacement and can be valuable for testing an operator-initiated rebuild, but its documented reason is different from a provider reporting that an argument cannot update in place.

The test should start from the old value and introduce the candidate change:

```text
baseline module and variables
  -> terraform apply
  -> verify baseline behavior
candidate module or changed variable
  -> terraform plan -out=transition.plan
  -> inspect transition.plan as JSON
  -> terraform apply transition.plan
  -> verify candidate behavior
  -> terraform destroy
```

Use the same working state for the baseline and transition. A fresh state would test creation, not replacement.

## Build a Dedicated Transition Harness

Create a root test harness that exposes the replace-triggering value without adding test-only behavior to the reusable module. For example:

```hcl
module "service" {
  source = "../../.."

  name           = "${var.name}-${var.test_run_id}"
  immutable_mode = var.immutable_mode
}
```

Run it in a dedicated cloud account or project with a unique name and remote or securely retained local state. Pin the baseline Terraform Core and provider versions. If the change is a provider upgrade, make that an explicit dimension and record both old and new lock files.

When switching a module source or version constraint, or changing provider requirements, re-run `terraform init`. Use the intended baseline or candidate provider lock file, and add `-upgrade` only when deliberately selecting newer dependency versions permitted by the configured constraints.

There are two important transition types:

- **Value transition:** the same candidate module is first applied with the old input, then planned with the new input. This isolates the lifecycle of that argument.
- **Code upgrade:** the last released module is applied, then the working directory switches to the candidate module and plans against the existing state. This finds resource-address, default, and schema changes introduced by the module release.

Test both when a release changes module code and asks consumers to change an immutable input.

## Inspect the Whole Replacement Set

After saving the candidate plan, render it with `terraform show -json` and create a narrow report:

```bash
terraform plan -input=false -out=transition.plan
terraform show -json transition.plan > transition.json

jq -r '
  .resource_changes[]
  | select(
      (.change.actions | index("create")) != null
      or (.change.actions | index("delete")) != null
    )
  | [.address, (.change.actions | join(" -> ")), (.action_reason // "")]
  | @tsv
' transition.json
```

Protect the JSON like state; `terraform show -json` can expose sensitive values in plaintext. Publish only an allowlisted action report.

Review more than the resource named in the change. Replacement can propagate through references, `replace_triggered_by`, provider behavior, or a changed `for_each` key. Check:

- every resource that creates, deletes, or replaces;
- output changes and values that remain unknown until apply;
- old and new identifiers used by dependents;
- delete-only actions with no corresponding create;
- data-source reads deferred until apply;
- drift that influenced the plan;
- replacement order for each affected object.

A resource address change may be a refactor rather than intended destruction. Add a `moved` block where appropriate and test the migration against prior state.

## Challenge Create Before Destroy

`create_before_destroy = true` requests a safer-looking order, but it is not automatically safe or possible. Terraform documents that many remote object types have unique-name constraints and that the lifecycle behavior propagates to dependencies.

Before approving `["create", "delete"]`, prove:

- old and new objects can have distinct names or identifiers;
- the account has enough quota for both and their dependencies;
- routes, DNS, target registrations, and identities can reference both during cutover;
- the old object is deleted only after traffic reaches the new object;
- rollback remains possible if the new object fails health checks;
- costs during overlap are acceptable.

If a provider requires the same unique name, create before destroy may fail at apply even though planning succeeded. A name suffix can enable coexistence, but changing naming is an API and migration decision, not a cosmetic test fix.

Destroy-before-create may be the only supported order. In that case, quantify and document the interruption, arrange a maintenance or failover strategy, and test the behavior against the service objective.

## Measure Availability From Outside Terraform

Terraform apply success does not prove continuity. Run a low-rate probe from the consumer's relevant network and identity before, during, and after the transition. Give each response a monotonic timestamp and correlate it with Terraform actions.

Measure properties such as:

- successful request ratio and longest failure interval;
- DNS answers and TTL behavior;
- certificate and endpoint identity;
- connection resets or authorization failures;
- message loss or duplicate processing for asynchronous services;
- old-object drain completion;
- time until the new object satisfies health criteria.

Keep probe traffic idempotent or use run-specific data. A replacement test should not create duplicate business side effects while measuring recovery.

If the requirement is no downtime, fail on any defined unavailable interval rather than only checking that the final endpoint works. If a brief interruption is allowed, encode the actual threshold and explain how it maps to the service objective.

## Test Failure and Rollback Paths

The optimistic path is only part of replacement risk. In a disposable environment, inject safe failures where supported:

- deny the new object's health check while leaving the old object healthy;
- exhaust a deliberately small test quota before creating the replacement;
- make a new dependent configuration invalid;
- cancel before cutover and verify recovery through the documented procedure.

Do not terminate Terraform randomly and assume that represents all real failures. Choose a lifecycle boundary, observe the resulting state, then rehearse the supported recovery: re-plan and apply, let Terraform retry destroying a deposed object, or, if manual reconciliation is required, remove all bindings for the resource address, re-import the desired object, and clean up the unwanted remote object. Restoring the old input or completing the apply may also be appropriate. Use Terraform state commands only after backing up state and understanding that changing state does not directly modify the remote object.

The rollback may itself require another replacement. Verify it rather than promising that reverting Git automatically restores the old object.

## Account for Lifecycle Guardrails

`prevent_destroy` causes Terraform to reject plans that would destroy a protected managed object while the rule remains in configuration. It is useful protection but can make an immutable change impossible until an operator makes a deliberate lifecycle decision.

`replace_triggered_by` can intentionally replace one resource when another resource or attribute changes. Test that the trigger is neither too broad nor too narrow. A reference to a resource with multiple instances causes a planned update or replacement of any instance to trigger replacement, as described in Terraform's lifecycle documentation.

Use preconditions whose conditions are known during planning, or policy checks, to provide a clear message before apply when replacement is prohibited in a normal pull request. A separate approved transition workflow can then run the rehearsal with stronger review and environment controls.

## Make Cleanup Part of the Transition Result

Register cleanup immediately after the baseline exists. If the transition leaves both current and deposed objects, a normal destroy may need extra time or dependency handling. Retain the state and the sanitized action report when cleanup fails, then block reuse of the environment.

Use ownership and expiry tags plus an independent janitor, but never delete by a short name alone. Reserve quota for teardown and verify the account returns to its known baseline. A replacement test that leaves the old object behind has discovered a real lifecycle defect even if the new endpoint works.

## Official Documentation

- [Terraform lifecycle meta-argument](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle)
- [Terraform plan options including replace](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [Terraform JSON output format and action reasons](https://developer.hashicorp.com/terraform/internals/json-format)
- [Terraform show command and sensitive JSON warning](https://developer.hashicorp.com/terraform/cli/commands/show)
- [Terraform moved block refactoring](https://developer.hashicorp.com/terraform/language/modules/develop/refactoring)
- [Terraform test language and state sharing](https://developer.hashicorp.com/terraform/language/tests)
- [Terraform state command guidance](https://developer.hashicorp.com/terraform/cli/commands/state)

## Conclusion

Test replacement as a stateful transition, not an empty-state plan. Apply the real baseline, introduce the candidate change, inspect the full action graph, and verify coexistence, quota, cutover, behavior, rollback, and cleanup. The plan tells you what Terraform intends; a controlled rehearsal tells you whether production can survive it.
