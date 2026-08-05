# Safe Dry Runs for Destructive Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Infrastructure Automation, Dry Run, Terraform, Kubernetes, Safety, Reliability

Description: Design dry-run output that exposes destructive impact, exercises real validation, and can never be mistaken for authorization to execute stale or incomplete work.

---

A `--dry-run` flag is easy to add and easy to overpromise. Printing "would delete 12 resources" is not a safety mechanism if the preview skipped admission policy, read a stale inventory, ignored dependent resources, or called a helper that still sent a real delete request.

A trustworthy dry run has a narrow contract:

- it performs no durable mutation in the managed system;
- it uses the same inputs, authorization checks, selectors, policy, dependency logic, and validation as execution where the target platform supports that;
- it explains what was not simulated;
- it binds output to a specific observed state and expires when that state can no longer be trusted.

Dry run is evidence for a later decision. It is not approval, a rollback guarantee, or proof that execution will succeed.

## Define Three Preview Levels

Use explicit names instead of one ambiguous Boolean.

### Static Plan

A static plan evaluates local configuration and a supplied snapshot. It must not contact the target. It is fast and useful for pull requests, but cannot prove current permissions, admission behavior, live dependencies, quotas, or drift.

### Server-Validated Dry Run

The client sends the intended request to an API's documented dry-run facility. The server can authenticate, authorize, default, validate, and run compatible admission logic without persisting the object.

Kubernetes `dryRun=All` is a strong example. Kubernetes documents that modifying requests in dry-run mode pass through normal request stages up to persistence, and guarantees they are not stored or allowed to have other side effects. Authorization is identical to the non-dry-run request. Admission webhooks must declare and honor compatible side-effect behavior.

### Isolated Simulation

Automation executes against a disposable account, project, namespace, emulator, or sandbox. This can reveal asynchronous behavior that request-level dry run cannot, but results are only representative if policy, versions, quotas, and dependencies match production closely enough.

Label output with the level used. Never present a static plan as server validation.

## Build One Intent, Two Interpreters

Parsing flags separately in preview and execute paths causes drift between them. Build an immutable intent first:

```json
{
  "operation": "decommission",
  "target": "service/payments-preview-184",
  "environment": "development",
  "requested_by": "cleanup-controller",
  "reason": "preview environment expired",
  "observed_revision": "inventory:77291",
  "requested_at": "2026-08-05T10:00:00Z"
}
```

Resolve selectors, dependencies, policy, and action ordering into a plan object. A preview renderer explains that object. The executor accepts only that object after revalidation.

Conceptually:

```go
type PlannedAction struct {
    ResourceID   string
    Action       string
    Preconditions map[string]string
    Reversible   bool
    Reason       string
}

type Plan struct {
    IntentHash       string
    ObservedRevision string
    ExpiresAt        time.Time
    Actions          []PlannedAction
    Limitations      []string
}
```

This is illustrative application code, not a Terraform or Kubernetes API. The important property is that both modes consume the same resolved actions.

Do not scatter checks like `if !dryRun { delete() }` through business logic. Put all side effects behind narrow adapters and make preview mode incapable of constructing a mutating adapter. This reduces the chance that a new helper, notification, cleanup hook, or callback mutates state accidentally.

## Classify Every Side Effect

Infrastructure automation has more side effects than the primary API call:

- cloud creates, updates, and deletes;
- state, lock, checkpoint, and inventory writes;
- DNS and service discovery changes;
- queue messages and workflow dispatches;
- notifications that trigger human or automated responses;
- tickets, approvals, and audit records;
- backup creation and retention changes;
- finalizers and cleanup callbacks;
- credential issuance and secret rotation;
- usage counters or billing commitments.

For each integration, define preview behavior:

| Effect | Preview behavior |
|---|---|
| Inventory read | perform and record revision |
| Authorization check | perform against real target when safe |
| Cloud mutation | use documented provider dry run or suppress |
| Audit event | write a clearly typed preview event |
| Notification | send only to a preview channel or render locally |
| Child workflow | plan the child intent, do not dispatch execution |
| Backup | verify existing evidence, do not claim a new backup exists |
| Lock | optionally take a short read/planning lock, never hold an apply lock indefinitely |

A preview audit record is an intentional mutation in the automation control plane. State that exception in the contract and keep it distinguishable from execution.

## Preserve Snapshot and Preconditions

The most dangerous dry-run bug is time-of-check to time-of-use drift. A deletion target may gain a new dependent object after preview, or a label selector may match a different set.

Record stable identities and preconditions, not only names:

```yaml
resource_id: arn:example:database:prod:orders
observed_version: "1842"
expected_owner: team-orders
expected_lifecycle: retiring
dependents: []
plan_expires_at: 2026-08-05T10:15:00Z
```

At execute time, compare the current revision, owner, lifecycle marker, dependency set, policy version, and action digest. If any protected precondition changed, stop and generate a new preview. Do not offer a `--force` flag that silently discards every mismatch.

For systems without a revision or conditional-write API, shorten plan lifetime, serialize changes through a lock, and re-read immediately before each destructive call. Be explicit that this narrows rather than eliminates the race.

## Make Destructive Impact First-Class

Do not bury deletes in raw logs. Summarize:

- direct deletes;
- replacements that contain delete and create actions;
- cascaded or garbage-collected dependents;
- data-bearing resources;
- final snapshots and retention settings;
- public endpoints, routes, and identities removed;
- irreversible actions;
- resources skipped because they could not be read;
- unknown values whose effect can be decided only during execution.

With Terraform, save a plan and inspect its documented JSON representation:

```bash
terraform plan -out=tfplan
terraform show -json tfplan > tfplan.json

jq -r '
  .resource_changes[]
  | select(.change.actions | index("delete"))
  | [.address, (.change.actions | join(" -> ")), (.action_reason // "")]
  | @tsv
' tfplan.json
```

An action list of `delete,create` or `create,delete` represents replacement, not a harmless update. Consume the JSON format defensively and reject unsupported major format versions. `terraform show -json` exposes sensitive values in plain text, so restrict and expire the output.

Terraform plan proposes changes but does not carry them out. It still reads live APIs by default, and the accuracy of the plan depends on provider behavior, credentials, inputs, and refresh. It cannot prove that asynchronous execution will complete or that an external system will remain unchanged.

## Use Native Server Dry Run Correctly

For Kubernetes, a server-side dry run can exercise defaulting, schema validation, admission, and merge-conflict handling:

```bash
kubectl apply --server-side --dry-run=server -f deployment.yaml -o yaml
```

Important limits from the Kubernetes API documentation include:

- generated values such as names, timestamps, UIDs, resource versions, service IPs, or admission-generated fields may differ during real execution;
- dry-run and real requests require the same authorization;
- requests fail rather than risk side effects when an admission webhook is not declared dry-run safe;
- external behavior after persistence, such as another controller reconciling the object, is not executed by the dry-run request.

Compare the returned, defaulted object rather than only the submitted manifest. Test all custom admission webhooks to ensure their declared `sideEffects` behavior is accurate.

Do not assume a cloud CLI's `--dry-run` flag is universal. Support is operation-specific. If the official API reference does not define dry-run behavior for the exact operation, suppress the call and report that server validation was unavailable.

## Bind Preview to Execution Without Making It a Capability Leak

Generate a plan identifier from:

```text
intent hash
resolved action digest
observed revision
policy version
planner version
expiry
```

The execute request references that identifier, but the identifier alone should not authorize execution. Recheck caller identity, environment permission, approvals, and all preconditions. Keep the plan artifact confidential if it contains resource topology or secrets.

Require a fresh preview after:

- expiry;
- configuration or variable changes;
- inventory revision changes;
- a policy bundle update;
- approval rule changes;
- a dependency appearing or disappearing;
- another operation touching the same boundary;
- loss of evidence for a backup or recovery prerequisite.

## Fail Closed on Partial Knowledge

A dry run that cannot read a resource must not report it as safe to delete. Use explicit states:

```text
PLANNED
BLOCKED_BY_POLICY
UNKNOWN_PERMISSION
UNKNOWN_DEPENDENCY
UNSUPPORTED_DRY_RUN
STALE
```

Allow low-risk read-only checks to continue so the report is useful, but make the overall result non-executable while required knowledge is missing.

Similarly, a timeout from a server dry-run request is ambiguous validation, not success. Retry only documented transient failures with bounded backoff and preserve the original intent identity.

## Test That Dry Run Has No Side Effects

Unit tests should fail if preview code obtains a mutating client. Integration tests should snapshot all observable systems before and after preview:

- target resource versions and counts;
- audit logs and API calls;
- queues and child workflows;
- DNS records;
- credentials and secrets;
- backup inventory;
- controller state and finalizers.

Run a destructive test corpus that includes wildcard selectors, empty selectors, stale revisions, unknown dependencies, replacement actions, finalizers, admission mutations, API timeouts, and permission denial.

In a disposable environment, compare preview actions with real execution and explain every difference. This differential test is more valuable than asserting that a command printed the word "dry-run".

Monitor production preview quality:

- preview-to-execution action differences;
- plans rejected as stale;
- unsupported native dry runs;
- unknown dependencies;
- preview code paths that attempted a mutation;
- incidents where preview omitted material impact.

## Official Documentation

- [Terraform plan command](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [Terraform show command and sensitive JSON output](https://developer.hashicorp.com/terraform/cli/commands/show)
- [Terraform JSON output format](https://developer.hashicorp.com/terraform/internals/json-format)
- [Kubernetes API dry-run semantics](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run)
- [kubectl apply reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/)

## Conclusion

A safe dry run is a reproducible, bounded simulation of one immutable intent. Reuse the execution planner, isolate every side effect, preserve revisions and preconditions, expose destructive and unknown impact, and revalidate before execution. When native server dry run is unavailable, say so plainly. Honest limitations are safer than a green preview that never exercised the system's real controls.
