# Prevent Orphaned Infrastructure From Poisoning Later Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Infrastructure Testing, Terraform State, Resource Cleanup, Terratest, CI/CD, Cloud Governance

Description: Isolate state and names per run, make teardown independently recoverable, and reconcile expired resources before leftovers consume quotas or corrupt later tests.

---

An infrastructure test can fail twice. The assertion fails first, then cleanup loses the state, permission, time, or dependency order needed to remove what the test created. The next run sees occupied names, stale DNS, exhausted quotas, remote state locks, or resources that look like valid fixtures and produces a misleading failure.

Prevent this by making every run independently identifiable and recoverable. State, resource names, ownership tags, leases, and cleanup records must all point to the same run. Normal teardown handles the happy path; a separate reconciler handles cancellation and runner loss.

## Recognize the Ways One Run Poisons Another

Leftovers cause more than cost:

- a globally unique bucket or DNS name makes the next create fail;
- a stale remote state key lets a new run update or destroy old resources;
- a locked state blocks all later plans;
- a subnet, public IP, network interface, or cluster consumes quota;
- an asynchronous deletion leaves the name unavailable after destroy returns;
- a stale endpoint answers a behavior probe intended for the new deployment;
- a shared queue or database contains previous test data;
- an orphaned policy grants access that makes a negative security test pass incorrectly.

Do not respond by making every test accept existing resources. That erases ownership and can turn a test into an updater for unknown infrastructure.

## Give Every Run a Complete Identity

Use a stable tuple such as repository, suite, CI run ID, attempt, and test name. Derive short cloud-compatible names from a hash, but preserve the full identity in tags and a lease record:

```hcl
locals {
  ownership_tags = {
    managed-by = "infrastructure-test"
    repository = var.repository
    suite      = var.suite
    run-id     = var.run_id
    expires-at = var.expires_at
  }
}
```

Use a UTC expiry with a documented format. Apply the identity to every resource that supports tags, including resources created by setup helpers outside Terraform. For untaggable children, retain their identifiers in state or an external manifest.

Names alone are not deletion authorization. They can be truncated, reused, or collide. A janitor should require the expected test account plus all ownership fields and a valid expiry before considering a resource eligible.

## Isolate State Before Isolating Resources

Each concurrent run needs its own Terraform working directory and backend key or workspace designed for test isolation. Do not point a new run at an old state merely because both deploy the same module.

A backend key can include the run identity:

```text
infrastructure-tests/<repository>/<suite>/<run-id>/terraform.tfstate
```

Sanitize every component and never allow user input to escape the intended prefix. Configure the backend through trusted automation, not unreviewed pull-request code.

When the selected backend supports it, Terraform state locking prevents concurrent writers to the same state; it does not make sharing state between unrelated runs correct. If a runner dies while holding a lock, investigate the backend and active process before force-unlocking. Terraform's `force-unlock` command requires the unique lock ID and warns that unlocking another active process can create multiple writers.

Terraform native tests maintain test state separately in memory and attempt cleanup after each test file. That protects live state but does not eliminate real cloud resources when the process is lost. Monitor the command's list of resources it could not destroy.

## Register Teardown Immediately

In Go and Terratest, establish cleanup directly after creating the options and before apply or assertions can terminate the test:

```go
func TestService(t *testing.T) {
	opts := newTerraformOptions(t)
	t.Cleanup(func() {
		destroyAndReport(t, opts)
	})

	terraform.InitAndApply(t, opts)
	assertServiceBehavior(t, opts)
}
```

Terratest's official guidance commonly shows `defer terraform.Destroy(t, terraformOptions)` immediately after options are created. `T.Cleanup` gives cleanup an explicit test lifecycle and also applies after subtests. Whichever mechanism you use, only one owner should destroy a given state.

Cleanup must attempt all independent operations and report all failures. A helper that stops at the first failed deletion can strand later dependencies. Preserve enough state and identifiers in access-controlled storage for a recovery job, but never publish state as a general CI artifact because it can contain sensitive values.

## Keep Assertion and Cleanup Results Separate

A test can have four outcomes:

| Assertion | Cleanup | Result |
| --- | --- | --- |
| Pass | Pass | Clean success |
| Fail | Pass | Product or test failure, environment recovered |
| Pass | Fail | Cleanup failure, suite must still fail |
| Fail | Fail | Preserve both causes and quarantine the environment |

Do not let a cleanup error overwrite the original assertion, and do not report green when destroy failed. Emit a concise cleanup record with state location, owned resource addresses, expiry, last error class, and recovery command owner.

When cleanup is incomplete, mark the lease quarantined so no later run can allocate that state or namespace. Retrying the test in the same poisoned environment can hide the original problem.

## Run an Independent Reconciler

In-process teardown cannot survive a canceled job, lost VM, process kill, or CI outage. Run a separately credentialed scheduled reconciler from trusted code.

Use a two-phase design:

1. **Inventory:** find resources and state records with test ownership, group them by run, and classify active, expired, ambiguous, or protected.
2. **Reconcile:** retry state-aware destroy for expired leases, then use service-specific cleanup only for resources whose ownership is proven.

Start in report-only mode. Maintain an explicit protected baseline and test the selector against it. Require a grace period after expiry to cover clock skew and long-running approved tests. Keep an audit record of every deletion target and outcome.

The reconciler should prefer the original Terraform state and provider version. Dependency-aware destroy is safer than deleting resources in an arbitrary cloud inventory order. Service-specific cleanup is the recovery path when state is missing or corrupt, not the default.

## Do Not Confuse State Removal With Resource Deletion

`terraform state rm` stops Terraform from managing an object; it does not destroy the remote object. Using it to make a destroy pass creates the exact orphan the suite needs to prevent. Conversely, manually deleting a resource does not automatically remove its state entry until refresh or reconciliation.

Use state commands only with a backup and a documented recovery objective:

- `state list` and `state show` help identify tracked objects but can expose sensitive attributes;
- `state pull` contains the full state and must be protected;
- `import` can restore ownership of an existing object before normal destroy;
- `force-unlock` addresses a verified stale lock, not an unknown apply.

If ownership cannot be proved, quarantine and escalate rather than deleting by guess.

## Preflight Without Destroying Unknown Infrastructure

Before creating resources, a run should verify:

- its state key or lease is new and exclusively held;
- derived names are not already owned by another active run;
- required quotas have cleanup headroom;
- the dedicated test account baseline is healthy;
- no prior attempt with the same run identity is still active;
- the reconciler is current enough to detect expired resources.

If a name exists, query its ownership metadata. Delete only when the recovery policy proves it belongs to this run or an expired lease. Otherwise choose a new name or fail with a collision report. Automatically taking over an untagged resource is unsafe.

For retrying one CI run, decide whether the attempt should resume the same state or allocate a fresh identity. Resume only through an explicit recovery path with exclusive ownership. A fresh attempt must not silently share the previous attempt's state.

## Handle Asynchronous Deletion

Some managed services return from a delete request before every child, address, or name is reusable. Cleanup should poll the documented terminal condition with an overall deadline and record lingering dependencies.

Do not immediately start a new test on a just-deleted global name. Prefer run-unique names that never need immediate reuse. For finite resources such as CIDRs or fixture leases, keep the allocation unavailable until deletion is confirmed.

Reserve time for teardown in the CI job deadline. If setup and assertion consume the full job timeout, cleanup never gets a chance. Use separate per-stage deadlines and keep the external reconciler as the final backstop.

## Measure Cleanup Reliability

Track cleanup as an engineering signal:

- resources created and destroyed per run;
- destroy duration percentiles;
- leases expired and quarantined;
- state-aware versus service-specific recovery count;
- quota consumed by expired resources;
- orphan age and estimated cost;
- cleanup failures by resource type and provider version.

Alert when the oldest orphan or quarantined account exceeds its objective. A low assertion flake rate can hide a worsening cleanup system until quotas are exhausted.

## Official Documentation

- [Terraform test command and cleanup](https://developer.hashicorp.com/terraform/cli/commands/test)
- [Terraform test state and module cleanup](https://developer.hashicorp.com/terraform/language/tests)
- [Terraform state purpose](https://developer.hashicorp.com/terraform/language/state/purpose)
- [Terraform state command](https://developer.hashicorp.com/terraform/cli/commands/state)
- [Terraform force-unlock command](https://developer.hashicorp.com/terraform/cli/commands/force-unlock)
- [Terraform import language](https://developer.hashicorp.com/terraform/language/import)
- [Terratest cleanup guidance](https://terratest.gruntwork.io/docs/testing-best-practices/cleanup/)
- [Go testing cleanup lifecycle](https://pkg.go.dev/testing)

## Conclusion

Stop leftovers from becoming shared hidden state. Give each run unique state, names, ownership, and expiry; register teardown before assertions; quarantine incomplete environments; and reconcile them from a separate trusted process. Recovery should use the original state whenever possible and delete by proven ownership, never by a convenient prefix alone.
