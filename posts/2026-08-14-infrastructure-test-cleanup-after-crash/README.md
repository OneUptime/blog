# Make Infrastructure Test Cleanup Survive Crashes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terratest, Terraform destroy, Test Cleanup, Orphaned Resources, CI

Description: Combine in-process destroy, durable per-run state, ownership tags, dedicated accounts, and an external janitor so crashes do not leave permanent resources.

---

No `defer`, `t.Cleanup`, or CI finally block can guarantee cleanup after `SIGKILL`, runner loss, host failure, or a control-plane outage. They run only while some process is alive and able to authenticate.

A crash-resistant design therefore has two cleanup planes:

1. synchronous teardown for normal failures;
2. independent reconciliation that discovers expired test resources without the original process.

The first keeps feedback fast. The second is what handles the failures that made the first impossible.

## Register Destroy Before Apply

The standard Terratest shape registers cleanup before provisioning:

~~~go
func TestService(t *testing.T) {
	t.Parallel()

	terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
		TerraformDir: "../examples/service",
		Vars: map[string]interface{}{
			"test_run_id": testRunID(t),
		},
	})

	defer terraform.Destroy(t, terraformOptions)

	terraform.InitAndApply(t, terraformOptions)
	// Assertions follow.
}
~~~

Registering the `defer` first handles assertion failures and many panics because Go unwinds the test function. `t.Cleanup` is another option and runs registered functions after the test and its subtests complete, in last-added, first-called order.

Neither mechanism runs after `os.Exit`, `SIGKILL`, runner termination, or machine loss. A test-wide timeout may also leave too little time for destroy. Set the CI and Go timeouts so the assertion budget expires before the cleanup budget.

## Give Every Run a Durable Identity

Generate one globally unique run ID before Terraform starts. Persist it in CI metadata and apply it to every resource name or tag the provider supports:

~~~hcl
variable "test_run_id" {
  type = string
}

locals {
  test_tags = {
    ManagedBy = "terratest"
    TestRun   = var.test_run_id
    ExpiresAt = var.expires_at
    Repository = var.repository
  }
}
~~~

Good identifiers include repository, test name, CI run ID, attempt, and a random suffix. Keep them short enough for the strictest target resource name. Do not use a timestamp alone; parallel jobs can start in the same second.

Ownership metadata must be present on dependent resources as well as the top-level object. Some cloud services do not propagate tags. Maintain a small run manifest for untaggable objects containing type, region, and ID, stored outside the ephemeral runner.

## Preserve State Without Exposing It

Terraform state is the best teardown inventory after a successful state write. If the runner's local working directory disappears, local state disappears with it.

For real-cloud suites, use one of these patterns:

- a unique, encrypted remote backend key per test run with locking;
- an encrypted short-lived CI artifact containing state and the exact Terraform configuration;
- a durable worker whose workspace survives test-process failure.

Never make concurrent tests share a state key. Backend locking prevents simultaneous writers to one state; it does not turn shared state into isolation.

State contains sensitive values. Restrict access, encrypt it, set short retention, and never print or commit it. HashiCorp recommends a remote backend or HCP Terraform for collaboration and warns against storage without secure access control and locking.

## Handle the Apply to State Gap

A provider can create a remote object and fail before Terraform records it in state. Even perfect state retention cannot find that object. This is why ownership tags and deterministic run prefixes are necessary.

After an interrupted apply:

1. freeze automatic retries that might create duplicates;
2. preserve logs, state, `.terraform.lock.hcl`, provider versions, and run ID;
3. inspect state with `terraform state list` or `terraform show`;
4. query the cloud inventory by run tags and names;
5. compare remote objects with state;
6. import or remove objects only through a reviewed recovery procedure;
7. destroy from the recovered state or use the janitor for clearly owned objects.

Do not run `terraform destroy` from an empty directory and assume it can discover resources. Terraform destroys objects tracked in its state and configuration; it is not a general cloud garbage collector.

## Add an Independent Janitor

Run cleanup from a separate scheduled job with its own bounded credentials. It should find resources whose `ManagedBy` value identifies the test system and whose expiry is older than a safety grace period.

A safe janitor follows this order:

~~~text
discover -> verify ownership -> check active-run lease -> report -> delete -> verify
~~~

Require multiple ownership signals before deletion, for example a dedicated account plus run tag plus allowed name prefix. Never scan a production account and delete solely by age. Use an allow-list of resource types and regions, and make dry-run output the default when adding a new type.

The janitor must understand dependency order. A network cannot be deleted while interfaces, gateways, load balancers, or private endpoints still reference it. Record failed deletions and retry with a bounded backoff rather than silently abandoning them.

## Use a Dedicated Test Account as a Safety Boundary

HashiCorp's `terraform test` documentation recommends dedicated testing accounts that can be routinely and safely purged. The same principle applies to Terratest.

A test account, project, or subscription should have:

- no production resources or peering that the test identity may mutate;
- quotas sized for controlled parallelism;
- organization policies matching the behaviors under test;
- cost budgets and anomaly alerts;
- a janitor role that can remove test-owned resource types;
- explicit exclusions for shared fixtures the janitor must never delete.

Least privilege applies to both creation and cleanup. The janitor may need broader delete permission than an individual test, so isolate and audit that role carefully.

## Make Resources Easy to Delete

Integration-test fixtures should avoid settings that obstruct teardown unless deletion protection itself is under test:

- deletion protection and termination prevention;
- retention policies that outlive the test;
- object-lock or immutable backup modes;
- public DNS TTLs longer than the test budget;
- cross-account dependencies the cleanup role cannot remove;
- randomly generated child resources without ownership metadata.

If a test must enable deletion protection, add an explicit teardown phase that disables it and verify this phase separately. The janitor also needs a documented recovery path.

## Separate Assertion and Cleanup Contexts

The classic `github.com/gruntwork-io/terratest/modules/terraform` package uses `Destroy` and `InitAndApply` without context parameters, so bound them with the Go test and CI timeouts. If you deliberately pin the v2 beta module at `github.com/gruntwork-io/terratest/modules/terraform/v2`, its context-capable helpers can give cleanup a separate deadline. In that case, allocate a fresh bounded cleanup context:

~~~go
defer func() {
	cleanupCtx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
	defer cancel()
	terraform.DestroyContext(t, cleanupCtx, terraformOptions)
}()
~~~

The cleanup deadline must remain below the CI job's hard timeout. Avoid an unlimited background context. If credentials expire at the end of the main job, provision a separate cleanup job or lease credentials long enough for the documented teardown window.

## Make CI Cleanup Redundant

Use all applicable layers:

- a Go `defer` or `t.Cleanup` in the test;
- an always-run CI step that attempts destroy from preserved state;
- a post-job cleanup workflow triggered from durable run metadata;
- the scheduled account janitor.

These are redundant by design. The always-run step handles a test binary exit but not runner loss. The post-job workflow handles some runner failures but can still face a cloud outage. The janitor handles resources after services recover.

Record which layer deleted each run. A growing janitor deletion count signals that ordinary teardown is unhealthy even if cost remains controlled.

## Test the Cleanup System

In a dedicated sandbox, inject failures at controlled points:

1. before apply;
2. during apply;
3. after apply before assertions;
4. during an assertion retry;
5. during destroy;
6. after state upload but before CI completion.

Verify that the run is either destroyed synchronously or discovered by the janitor after its grace period. Measure orphan age and deletion success. Do not perform kill tests in an account that contains shared or production infrastructure.

## Cleanup Evidence to Retain

For each run, store:

- run ID and expiry;
- account/project, regions, and provider versions;
- backend key or protected state artifact location;
- apply and destroy exit status;
- resources Terraform reported it could not destroy;
- janitor discoveries and actions;
- final inventory count and cost estimate.

This turns cleanup from a best-effort code path into an observable reliability system.

## Official Documentation

- [Terratest quick start: register Terraform destroy before apply](https://terratest.gruntwork.io/docs/getting-started/quick-start/)
- [Terratest classic Terraform helper API](https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform)
- [Terratest v2 beta context-capable Terraform API](https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform/v2)
- [Go testing: Cleanup execution semantics](https://pkg.go.dev/testing)
- [Terraform test command: cleanup attempts and dedicated accounts](https://developer.hashicorp.com/terraform/cli/commands/test)
- [Terraform state storage and locking](https://developer.hashicorp.com/terraform/language/state/backends)
- [Terraform state security and remote storage guidance](https://developer.hashicorp.com/terraform/language/state)
- [Terratest test stages for durable local iteration](https://terratest.gruntwork.io/docs/testing-best-practices/iterating-locally-using-test-stages/)

## Conclusion

In-process cleanup is necessary but cannot survive every crash. Register destroy before apply, preserve a unique run's state securely, and mark every resource with durable ownership and expiry. A separate janitor in a dedicated test account closes the gap left by process death and incomplete state writes.
