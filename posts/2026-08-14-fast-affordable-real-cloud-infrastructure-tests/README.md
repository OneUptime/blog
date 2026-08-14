# How to Keep Real-Cloud Infrastructure Tests Fast and Affordable

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Infrastructure Testing, Terraform, Terratest, Cloud Cost, CI/CD, Test Strategy

Description: Reduce real-cloud test time and spend by moving cheap checks earlier, reusing only stable fixtures, controlling concurrency, and measuring cleanup.

---

Real-cloud infrastructure tests are slow and expensive when every assertion begins by creating a full production-shaped environment. The answer is not to remove the live tests that reveal IAM, networking, provider, and service behavior. It is to make each live test pay for a specific uncertainty that cheaper tests cannot answer.

Terraform supports plan-only tests and provider mocks as well as apply-based tests that create real infrastructure. Use those layers deliberately. A fast suite proves expression logic and plan invariants without a cloud API; a small live suite proves the contracts that only the cloud can settle.

## Start With a Costed Test Inventory

For every scenario, record four numbers from CI rather than relying on intuition:

- queue and runner startup time;
- resource create time;
- assertion time;
- destroy time and any orphaned cost.

Also record API throttles, retry count, resource-hours, and whether the scenario found a defect in the last few months. A test that runs for 25 minutes to assert a tag literal belongs in a cheaper layer. A two-minute test that catches a missing route visible only after apply is earning its place.

Classify each assertion by the earliest layer that can answer it:

| Question | Cheapest credible layer |
| --- | --- |
| Does variable validation reject bad input? | `terraform test` with `command = plan` |
| Does conditional HCL create the expected resource? | Plan assertion or plan JSON policy |
| Does a computed provider value drive the right output? | Mock provider with explicit override data |
| Can the provider create and update the resource? | Small real-cloud apply test |
| Can a client actually connect through DNS, routing, TLS, and IAM? | Real behavioral test |

Mocks reproduce a provider schema and generated computed values, not the remote service. They cannot prove that a permission exists, an API accepts a combination of fields, or packets flow.

## Make the Live Topology Smaller Than Production

Preserve the property under test, not production capacity. A database connectivity test may need the same engine family, encryption path, subnet model, and authentication method, but it rarely needs production storage or replicas. A load-balancer test may need two endpoints to exercise health checks, not the production autoscaling maximum.

Create module inputs specifically for tests only when they preserve the contract:

```hcl
module "service" {
  source = "../.."

  environment         = "integration-test"
  instance_count      = 1
  enable_cross_region = false
  deletion_protection = false
  test_run_id         = var.test_run_id
}
```

Do not add a `skip_security = true` switch to make a security test cheaper. Keep production defaults in the reusable module and put test sizing in the root test harness. Review every divergence so the suite does not test a topology that cannot exist in production.

## Split Stable Fixtures From Per-Test Payloads

Some prerequisites are expensive yet change rarely: a test account baseline, a private provider mirror, a delegated DNS subdomain, or a base VPC. Provision them with a separate, platform-owned lifecycle. Tests consume documented outputs and create their mutable payload within that boundary.

A shared fixture is safe only when:

- tests treat it as read-only or allocate isolated children;
- it has no test-order-dependent state;
- its version is recorded with the result;
- a fixture outage fails clearly rather than appearing as a module regression;
- there is a rebuild and compatibility process.

Do not share the database, bucket, queue, or name whose mutation is the point of the test. Sharing mutable fixtures makes tests cheaper by transferring the cost into flakes and debugging.

With Go and Terratest, group tests that legitimately share one fixture under a parent test. Go waits for all subtests before the parent completes, so the parent can own teardown. `T.Cleanup` callbacks run after a test and all its subtests and are called in last-added, first-called order.

```go
func TestNetworkFixture(t *testing.T) {
	fixture := createNetworkFixture(t)
	t.Cleanup(func() {
		destroyNetworkFixture(t, fixture)
	})

	t.Run("private-endpoint", func(t *testing.T) {
		t.Parallel()
		assertPrivateEndpoint(t, fixture)
	})

	t.Run("dns-resolution", func(t *testing.T) {
		t.Parallel()
		assertDNSResolution(t, fixture)
	})
}
```

This is appropriate only if both assertions can run concurrently without modifying the same resource. Do not call `t.Parallel()` first and then try to create a supposedly single fixture from each subtest.

## Control Parallelism With Quotas, Not CPU Count

Parallel tests reduce wall-clock time until they hit an account quota, API rate, address space, or runner connection limit. Beyond that point, retries make the suite slower and more expensive.

Choose concurrency from the tightest external resource. If a scenario needs three public IP addresses and the account has twelve safely available after reserving capacity for cleanup, four concurrent scenarios is the absolute ceiling, not the starting target. Apply lower per-service gates when tests use different resource mixes.

Give every concurrent run unique state, names, CIDRs, DNS labels, and temporary directories. Terraform's `-parallelism` setting limits concurrent graph operations within one plan or apply; it is not a global limit across CI jobs. Coordinate CI concurrency separately.

Measure throttling after changing concurrency. Exponential retries can hide quota pressure while adding minutes and API work. A stable suite has predictable create and destroy percentiles, not merely a green result.

## Avoid Accidental Go Test Caching

The Go tool can cache successful package test results. Terratest's official guidance notes that an infrastructure test should normally execute against the current world rather than reuse a previous successful result. Use a documented non-cacheable flag or `-count=1` for the live suite:

```bash
go test -count=1 -timeout=45m ./test/integration/...
```

Do not disable caching for cheap deterministic unit tests without a reason. Separate packages or CI commands let unit tests keep normal Go performance while live tests opt out.

Set an overall test timeout longer than the expected create, assertion, and cleanup path, but do not rely on that timeout as cleanup. A hard process termination can prevent deferred functions from running. An external janitor must still remove expired resources.

## Use Filters and Change Impact Carefully

On a pull request, run the live scenarios whose module, provider constraints, fixture contract, or shared test helpers changed. A simple path filter is a useful first gate, but Terraform modules can have transitive dependencies. Maintain an explicit dependency map or conservatively run consumers when a shared module changes.

Run broader combinations on a schedule:

- all supported regions or zones;
- provider and Terraform upgrade lanes;
- slow managed services;
- failure and replacement scenarios;
- drift and cleanup audits.

Do not make the nightly suite the first place that a common happy path runs. Keep one representative live smoke test on relevant pull requests, then use scheduled runs for breadth.

## Cache Downloads, Not Test Results or State

Provider downloads and Go modules are good cache candidates when integrity is verified. Terraform's dependency lock file records selected provider versions and checksums; commit it for root test harnesses. Use a plugin cache or trusted mirror according to Terraform CLI configuration rather than copying an arbitrary `.terraform` directory between unrelated jobs.

Never cache mutable Terraform state as a performance optimization. State is the ownership record for a particular deployment. Reusing it across concurrent or unrelated runs creates collisions and can cause one test to update or destroy another test's resources.

Likewise, do not reuse a saved plan after configuration, variables, state, provider, or credentials have changed. A saved plan is an execution artifact for one evaluated context, not a generic compilation cache.

## Make Cost and Cleanup Part of the Result

Attach repository, suite, run ID, owner, and expiry tags to every supported resource. Activate cost-allocation tags before expecting them in billing reports. Then publish a per-suite dashboard with:

- p50 and p95 total duration;
- create and destroy duration;
- retry and throttle counts;
- peak concurrency;
- resource cost by run or suite;
- resources found after expiry;
- failures caused by fixtures versus the module under test.

Terraform tries to clean up resources created by `terraform test`, and Terratest recommends placing `terraform.Destroy` in a Go `defer` immediately after options are created. Neither mechanism survives every runner failure. Run a scheduled, independently credentialed janitor that first reports expired resources and deletes only when ownership is unambiguous.

Optimize from these numbers. Deleting a low-value scenario, moving an assertion to plan time, reducing a resource shape, or consolidating immutable setup can each help. Increasing parallelism helps only when external quotas and cleanup capacity support it.

## Official Documentation

- [Terraform test language](https://developer.hashicorp.com/terraform/language/tests)
- [Terraform provider mocking](https://developer.hashicorp.com/terraform/language/tests/mocking)
- [Terraform test command and cleanup](https://developer.hashicorp.com/terraform/cli/commands/test)
- [Terraform dependency lock file](https://developer.hashicorp.com/terraform/language/files/dependency-lock)
- [Terratest cleanup guidance](https://terratest.gruntwork.io/docs/testing-best-practices/cleanup/)
- [Terratest guidance on Go test caching](https://terratest.gruntwork.io/docs/testing-best-practices/avoid-test-caching/)
- [Go testing package](https://pkg.go.dev/testing)
- [AWS guidance for tagging and cost tracking](https://docs.aws.amazon.com/solutions/tagging-on-aws/)

## Conclusion

Keep live infrastructure tests for facts that only a real control plane or data path can establish. Move syntax, expression, and plan checks into cheaper layers; shrink live topologies; share only stable fixtures; and set concurrency from cloud quotas. When duration, cost, retries, and cleanup are visible per scenario, the suite can become faster without becoming less trustworthy.
