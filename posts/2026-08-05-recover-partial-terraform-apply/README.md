# Recover After a Partial Terraform Apply

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, State Management, Incident Response, Infrastructure as Code, Recovery, CI/CD

Description: Reconcile Terraform configuration, state, and live resources after a partial apply, then roll forward from a fresh reviewed plan without duplicating infrastructure.

---

A failed Terraform apply is not a transaction rollback. Some resources may have been created, updated, or destroyed before another operation failed. HashiCorp documents that Terraform records changes made so far in state, unlocks the state, and exits. It does not automatically reverse the completed actions.

The safest default is to stop, discover the actual result, and roll forward from a fresh plan. Replaying the old saved plan or manually editing state before inspection can turn a recoverable partial apply into duplicated or orphaned infrastructure.

## First, Contain the Failure

Before troubleshooting:

1. Stop automatic retries and newer applies to the same state.
2. Keep the failure logs, run ID, plan artifact, configuration commit, and provider request IDs.
3. Confirm whether the runner process really ended.
4. Preserve state-backend versions and audit logs.
5. Assign one recovery coordinator.
6. Notify service and data owners if any completed action may affect production.

Do not force-unlock merely because the pipeline UI says failed. Terraform warns that `force-unlock` should be used only for your own lock after automatic unlocking failed. Prove no process still holds or can write through the lock, then use the exact lock ID if recovery is necessary.

An apply timeout is ambiguous. The runner may have stopped waiting while a provider-side operation continues. Check the cloud operation, not only the CI job status.

## Understand What Terraform Did on Error

During apply, Terraform executes independent graph nodes in parallel and dependent nodes in order. When a step errors, completed work is not automatically undone. Terraform:

1. reports the error;
2. updates state with changes it knows were made;
3. unlocks state;
4. exits.

Provider behavior matters. A provider operation may use several API calls. The Terraform Plugin Framework permits a provider to return state together with an error so that values changed by earlier calls can still be persisted. A well-behaved provider therefore gives a later plan useful recovery information, but an ambiguous network failure can still leave an object whose identity was never recorded.

Treat three representations separately:

```text
configuration: what should exist
Terraform state: Terraform's last persisted mapping and attributes
live infrastructure: what provider APIs report now
```

Recovery is the process of making those three representations agree intentionally.

## Preserve a Recovery Snapshot

Run read-only inventory commands from the exact configuration revision and pinned toolchain used by the failed run where possible:

```bash
terraform version
terraform providers
terraform state list > recovery-state-addresses.txt
terraform state pull > recovery-state-before.tfstate
terraform show -json > recovery-state-view.json
```

State and JSON output can contain sensitive values in plain text. Store these files in a restricted incident location, do not commit them, and delete or archive them according to the state-handling policy after recovery.

`terraform show` without a plan file displays Terraform's current state view. It does not refresh live resources. Compare important objects through official cloud or service read APIs and retain immutable IDs, regions, accounts, versions, and statuses.

For a large state, start with addresses mentioned in the apply log, their dependencies, and every destructive action in the original plan. Then verify the full plan before resuming normal changes.

## Classify the Failure Before Acting

Common categories require different responses.

### Deterministic Configuration or Authorization Error

Examples include an invalid argument, missing permission, quota limit, or policy denial. Completed resources are usually still useful. Correct the configuration, identity, quota, or policy issue, generate a fresh plan, and roll forward.

### Transient API or Network Error

The operation may be safe to retry only after determining whether the original call completed. Use provider request IDs, operation status APIs, and documented idempotency tokens. Do not assume timeout means no side effect.

### External Change During Apply

Another actor may have deleted or modified a dependency. Freeze that writer, decide which desired state wins, and generate a fresh plan that reads current infrastructure.

### Provider Defect or Incomplete State

The remote object may exist without a state binding, have partially updated fields, or be marked for replacement. Capture evidence and consult the provider's official resource documentation and issue guidance before changing state.

### State Upload or Backend Failure

The runner may have accurate local state that did not reach the backend. Do not begin a new apply until the backend state is recovered. HCP Terraform exposes an authorized errored-state recovery endpoint for rare failed state uploads, and recent agents include a fallback upload mechanism. Follow the backend's supported recovery procedure rather than pushing a guessed snapshot.

## Use Refresh-Only as a Diagnostic Plan

Terraform's refresh-only mode proposes updates to state and outputs based on remote reads without proposing changes to remote objects:

```bash
terraform plan -refresh-only -out=recovery-refresh.tfplan
terraform show -no-color recovery-refresh.tfplan
```

This can reveal that a tracked object disappeared or changed during the failed apply. It is not automatically safe to apply. Wrong credentials, account, region, subscription, or provider aliases can make valid resources appear absent. HashiCorp specifically recommends reviewing refresh-only changes before committing them.

Use refresh-only apply only when accepting the observed live attributes into Terraform state is itself the intended recovery action:

```bash
terraform apply recovery-refresh.tfplan
```

Often you do not need a separate refresh-only apply. A normal fresh plan performs an in-memory refresh and can propose how to move live infrastructure toward configuration. Use the diagnostic view to reason, not as a ritual.

## Generate a Fresh Normal Plan

Do not reuse the saved plan that partially executed. Its assumptions and prior state no longer describe the environment.

After correcting the immediate cause, run:

```bash
terraform plan -input=false -out=recovery.tfplan
terraform show -no-color recovery.tfplan
terraform show -json recovery.tfplan > recovery-plan.json
```

Review the full plan and compare it with:

- actions completed in the failed run;
- actions that never started;
- live resources found outside state;
- drift introduced by other actors;
- new replacement or deletion actions;
- unknown values that Terraform can decide only during apply.

A fresh plan is not permission to proceed. Re-run policies, obtain approval based on the new plan, and protect the artifact as sensitive.

## Resolve Each State-to-Live Discrepancy

### The Object Exists and State Tracks It

This is the normal partial-success case. Verify its important live attributes, fix the failed dependency or configuration, and let the fresh plan converge remaining work.

Avoid touching state merely because the previous run ended in error. State may already contain exactly the recovery information Terraform needs.

### The Object Exists but State Does Not Track It

This can happen when create succeeded but its response or state write failed. Prove identity first:

- match the original API request or client token;
- verify account, region, immutable ID, name, tags, creation time, and configuration;
- search all other Terraform states to ensure the object is not already managed;
- check for duplicates created by previous retries.

Then use a reviewable import block with the existing resource configuration:

```hcl
import {
  to = aws_instance.app
  id = "i-0123456789abcdef0"
}
```

The provider's resource documentation defines the correct import identifier and supported behavior. Run a plan and adjust configuration until import does not imply an unintended update or replacement. Terraform expects one remote object to be bound to only one resource address.

If identity cannot be proved, quarantine the object and escalate. Importing the wrong resource is worse than leaving a visible orphan temporarily.

### State Tracks an Object That No Longer Exists

A normal plan usually proposes recreation when configuration still requires the object. Decide whether recreation is safe, particularly for data stores, identities, IP addresses, and resources with externally referenced IDs.

If the object should remain absent, update configuration through review. Do not use `terraform state rm` merely to hide the discrepancy. Removing a binding while configuration remains causes Terraform to plan a new object and can create a duplicate if the original was only temporarily unreadable.

### The Object Is Partially Updated

Read live attributes and provider status. A normal plan may propose completing the update or restoring the configured values. If the provider cannot read or correct the invalid intermediate state, follow its documented recovery procedure.

Do not manually overwrite live fields to resemble old state without considering dependent resources and provider normalization. The next refresh may simply rediscover the difference.

### Terraform Plans Replacement

Terraform may mark a resource for replacement after a failed create, or the fresh read may reveal a condition that requires replacement. Review the plan's create-before-destroy or destroy-before-create order, data implications, stable identifiers, and dependent downtime.

If an unhealthy object needs explicit replacement even though configuration is unchanged, use the supported `-replace` planning option:

```bash
terraform plan -replace='aws_instance.app' -out=replace.tfplan
terraform show replace.tfplan
```

Apply only the reviewed saved plan. Do not use the deprecated `terraform taint` workflow as the default when `-replace` can make intent visible in the plan.

### The Object Has the Wrong Terraform Address

Use declarative `moved` blocks for configuration refactors when possible, or the supported `terraform state mv` command for an exceptional state move. Do not remove and re-import casually. State-modifying commands create backup files, and those backups are sensitive.

Verify destination address, provider alias, instance key, and one-to-one ownership before moving.

## Decide Between Roll Forward and Recovery Action

Terraform recommends resolving the error and applying configuration again. That roll-forward path is usually safest because it uses the declarative desired state.

Rollback is not a universal inverse:

- a newly created database may already contain writes;
- a DNS change may have sent clients to the new endpoint;
- restoring an old IAM policy may remove incident access;
- deleting a replacement resource may not restore the destroyed original;
- a snapshot restore creates a new recovery timeline, not the old object in place.

Choose per resource:

- roll forward to configuration;
- restore data from a tested backup;
- import a completed remote object;
- replace a broken object;
- adopt an intentional external change in configuration;
- compensate through a separately reviewed procedure;
- stop for a domain-owner decision.

Record the decision and rollback boundary. Once consumers use a new resource, deletion may no longer be a safe compensation.

## Use Targeting Only for Exceptional Recovery

HashiCorp documents `-target` as an option for exceptional cases where an invalid state prevents applying the whole configuration. It is not a routine deployment strategy.

Before targeting:

1. generate and retain an untargeted plan;
2. explain why the full graph cannot converge;
3. identify dependencies Terraform will include;
4. review every targeted action;
5. plan to run a full untargeted plan immediately afterward.

For example:

```bash
terraform plan -target='module.network' -out=targeted-recovery.tfplan
terraform show targeted-recovery.tfplan
terraform apply targeted-recovery.tfplan
terraform plan
```

Never combine targeting with `-refresh=false` during recovery unless you have a precise, documented reason. Disabling refresh hides exactly the external changes you need to understand.

## Apply with Observation and Stop Conditions

Before the recovery apply:

- confirm the original cause is fixed;
- ensure no competing writer is active;
- verify backups and restore access for data at risk;
- define metrics and logs to watch;
- assign abort and escalation authority;
- keep the state backend healthy and versioned;
- use the exact reviewed recovery plan.

Run:

```bash
terraform apply -input=false recovery.tfplan
```

Do not cancel because one resource is slow without checking provider operation status. If recovery fails again, repeat containment and reconciliation from the new actual state. Do not stack speculative fixes on an unknown intermediate condition.

## Prove Convergence

After apply, create a new full plan:

```bash
set +e
terraform plan -input=false -detailed-exitcode -out=convergence.tfplan
status=$?
set -e

case "$status" in
  0) echo "Converged: no changes" ;;
  1) echo "Plan failed" >&2; exit 1 ;;
  2) echo "Not converged: review convergence.tfplan" >&2; exit 2 ;;
esac
```

With `-detailed-exitcode`, Terraform returns `0` for an empty plan, `1` for an error, and `2` for a non-empty plan. Do not collapse exit code `2` into generic success in CI.

Also verify outside Terraform:

- application health and user journeys;
- data integrity and replication;
- routes, DNS, identity, and policy behavior;
- absence or ownership of orphan resources;
- provider-side operations reached terminal states;
- queues and scheduled automation resumed safely;
- cost and quota impact of any duplicate or retained resource.

Only then unfreeze normal applies and close the recovery record.

## Recovery Anti-Patterns

Avoid:

- rerunning the old saved plan after partial execution;
- assuming Terraform rolled back completed actions;
- force-unlocking while a process may still write;
- running `terraform refresh`, which automatically commits state changes, instead of reviewing refresh-only mode;
- deleting state bindings to make the plan quiet;
- importing based only on a similar display name;
- automatically deleting possible duplicate resources;
- routinely using `-target` or `-refresh=false`;
- editing raw state JSON;
- applying a regenerated plan without renewed review.

## Official Documentation

- [Terraform apply workflow and errors during apply](https://developer.hashicorp.com/terraform/tutorials/cli/apply#errors-during-apply)
- [Terraform plan command, refresh-only, replace, and targeting](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [Terraform refresh-only workflow](https://developer.hashicorp.com/terraform/tutorials/state/refresh)
- [Terraform import workflow](https://developer.hashicorp.com/terraform/language/import)
- [Terraform state commands and forced backups](https://developer.hashicorp.com/terraform/cli/commands/state)
- [Terraform state locking and force-unlock warning](https://developer.hashicorp.com/terraform/language/state/locking)
- [Terraform Plugin Framework error state behavior](https://developer.hashicorp.com/terraform/plugin/framework/diagnostics#how-errors-affect-state)
- [HCP Terraform failed state upload recovery](https://developer.hashicorp.com/terraform/cloud-docs/api-docs/applies#recover-a-failed-state-upload-after-applying)

## Conclusion

Recovery starts by accepting that a failed Terraform apply may have changed real infrastructure. Freeze writers, preserve evidence, compare configuration, state, and live APIs, and resolve each discrepancy intentionally. Import proven objects, replace only when justified, and apply a fresh reviewed plan. A final empty plan plus live service checks proves convergence far more reliably than a green retry button.
