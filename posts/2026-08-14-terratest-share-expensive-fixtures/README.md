# Share Expensive Terratest Fixtures Without Coupling Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terratest, Go, Infrastructure Testing, Test Fixture, Terraform, CI/CD

Description: Share slow infrastructure setup through an immutable parent-owned fixture while preserving independent assertions, failure diagnosis, and teardown.

---

An expensive Terratest fixture can save substantial time when several assertions need the same VPC, cluster, image, or service endpoint. It can also turn independent tests into an order-dependent suite where one mutation breaks everything and no test knows who should destroy the resources.

The safe pattern is ownership plus isolation: one parent creates and destroys the fixture, child tests consume a versioned read-only contract, and every mutation happens in a child-specific namespace. If tests cannot obey that contract, they should not share the fixture.

## Decide Whether the Fixture Is Actually Shareable

A good shared fixture is expensive to create and stable while tests run. Examples include:

- a VPC whose subnets can host isolated child resources;
- a Kubernetes cluster where each test receives a unique namespace and quota;
- an immutable machine image;
- a delegated test DNS zone where each test owns a unique record prefix;
- a read-only service endpoint populated from a versioned dataset.

Poor shared fixtures include the object being updated, replaced, failed over, or deleted by the test. Two tests that both change a route table, rotate the same key, resize one database, or overwrite one queue policy do not have independent evidence. A mutex can serialize the mutations, but it does not remove hidden state or make failures easy to reproduce.

Before sharing, write the fixture contract:

```text
Fixture version: vpc-fixture/7
Read-only outputs: vpc_id, private_subnet_ids, resolver_address
Per-test allocation: one CIDR and name prefix derived from run ID
Forbidden operations: modify routes, delete subnets, change resolver rules
Owner: parent test
Expiry: 2026-08-14T18:00:00Z
```

If this contract cannot be enforced through permissions, module interfaces, or review, use separate fixtures.

## Let a Parent Test Own the Lifecycle

Go subtests provide a natural scope. A parent test does the expensive setup, registers cleanup, and passes fixture outputs to children. Go does not complete the parent until its subtests finish, and `T.Cleanup` runs after the test and all of its subtests complete.

```go
type networkFixture struct {
	VPCID      string
	SubnetIDs  []string
	FixtureTag string
}

func TestNetworkModule(t *testing.T) {
	fixture := createNetworkFixture(t)
	t.Cleanup(func() {
		destroyNetworkFixture(t, fixture)
	})

	cases := []struct {
		name string
		run  func(*testing.T, networkFixture)
	}{
		{name: "private-dns", run: testPrivateDNS},
		{name: "service-endpoint", run: testServiceEndpoint},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			tc.run(t, fixture)
		})
	}
}
```

The explicit `tc := tc` keeps the loop value local on Go versions before the loop-variable semantics introduced in Go 1.22. The child functions receive values they need rather than reading package globals.

Register cleanup immediately after successful creation, before any assertion can fail. Terratest's cleanup guidance makes the same recommendation for `terraform.Destroy`. Prefer one cleanup owner. A child can clean up its own overlay resources, but it must never destroy the parent fixture.

## Isolate Every Mutable Child Resource

Parallel subtests are safe only when their writes cannot collide. Derive allocations from the complete test identity rather than a short random suffix alone:

```go
func childPrefix(runID, testName string) string {
	sum := sha256.Sum256([]byte(runID + ":" + testName))
	return fmt.Sprintf("it-%x", sum[:6])
}
```

Use that identity consistently for Terraform state, names, tags, namespaces, DNS labels, temporary directories, and log correlation. Hashing makes a compact name; the full repository, CI run URL, test name, and expiry should remain in tags or an ownership record.

Do not allocate overlapping CIDRs or ports by taking a random number independently in each child. Have the parent allocate a deterministic, non-overlapping slice and pass it to the child. Check cloud quotas before starting children and cap test parallelism below the fixture's safe capacity.

For a shared Kubernetes cluster, for example, each child could receive a namespace, ResourceQuota, NetworkPolicy, and service-account identity. Namespace isolation alone is not proof of network or cluster-scoped permission isolation; configure and test the required controls.

## Keep Assertions Independent

Each subtest should be runnable and understandable on its own given a fixture reference. It should not rely on another subtest to create a record or warm a service. If setup is genuinely common, the parent owns it; if setup exists only for one assertion, that child owns it.

Avoid these coupling signals:

- names such as `Test02AfterTest01`;
- package-level mutable variables;
- assertions that accept either pre- or post-mutation state;
- tests that pass only under `go test`'s default ordering;
- a cleanup step that assumes every previous child succeeded;
- children that share one `terraform.Options` while changing its fields.

Give each child its own Terraform working copy and state even if both reference the same read-only fixture outputs. Terraform state is an ownership record, not a cache. Sharing it lets one child plan against or destroy another child's resources.

## Share Within the Smallest Scope

Use the narrowest fixture lifetime that saves meaningful work:

1. **Subtest group:** best default. One Go process and one parent own setup and cleanup.
2. **Test package:** `TestMain` can wrap every test in a package, but it creates global coupling and is a low-level primitive in Go's documentation. Use it only when all tests genuinely need one fixture and cleanup is explicit.
3. **CI job:** a setup step writes a signed or access-controlled fixture descriptor, and test processes lease isolated children.
4. **Cross-job pool:** an external fixture service owns leases, health, versions, quotas, and expiry. No individual test pretends it created the fixture.

The broader the scope, the more infrastructure you need around the fixture. A package global is not a cross-process lock. Two CI jobs can still race. Cross-job sharing needs atomic lease acquisition and an authoritative owner outside either runner.

## Version and Health-Check the Fixture

Record a fixture version that changes when its contract or implementation changes. Include provider versions, module commit, region, important feature flags, and immutable artifact identifiers. Before using an existing fixture, perform a cheap health check that distinguishes fixture failure from module failure.

Do not quietly repair a fixture halfway through a test. Mark the fixture unhealthy, stop granting new leases, and rebuild it through its owner. Otherwise later children see a different environment from earlier children under the same result.

Failure output should identify:

- fixture ID and version;
- lease and child allocation;
- setup, health, assertion, and teardown stages;
- cloud region and selected provider versions;
- remaining resource identifiers safe to expose.

This lets CI classify a shared-fixture outage separately from a product regression while still failing the required check.

## Use Terratest Stages for Iteration, Not Hidden CI State

Terratest's `test-structure` package can split a test into named stages and save values so a developer can skip slow stages while iterating locally. Its official guidance describes environment variables such as `SKIP_<stage>` and saved outputs loaded by later stages.

That is useful for an explicit local workflow. It is not a license for a normal CI run to reuse an unknown working directory. CI should execute the complete required lifecycle or obtain a fixture through a versioned lease. If a stage is skipped, the result must state which existing artifact was used and who owns its cleanup.

Never let skip flags reach a destroy stage accidentally. Keep local stage files outside version control, avoid secrets in saved values, and include enough metadata to reject stale data from another account, region, or module revision.

## Make Cleanup Survive Test Failure

The parent cleanup should attempt every owned deletion even if one operation fails, then report all remaining resources. A helper that calls `t.Fatal` on the first destroy error can prevent later cleanup steps. Separate best-effort cleanup collection from the final test failure.

In addition to in-process cleanup:

- tag the fixture and child resources with owner, run ID, and expiry;
- preserve state in access-controlled storage long enough for recovery;
- run an independent janitor in report mode and then delete only unambiguous expired resources;
- reserve quota and permissions needed for destroy;
- make rebuilding the fixture from code routine.

A hard runner termination can bypass Go defers and test cleanup. Sharing makes that risk larger because more assertions depend on the same resources, so external expiry is mandatory rather than optional.

## Know When to Stop Sharing

Split the fixture when:

- a child must mutate a shared component;
- failures routinely contaminate later children;
- the fixture requires a broad identity that children inherit;
- tests need incompatible provider or platform versions;
- quota contention erases the speed benefit;
- a single fixture outage blocks unrelated module suites;
- cleanup ownership cannot be stated in one sentence.

Sometimes a prebuilt immutable artifact is the right shared layer while the deployed environment remains per test. Sharing an image build can save ten minutes without making databases, identities, or routes common state.

## Official Documentation

- [Go testing package and subtest lifecycle](https://pkg.go.dev/testing)
- [Terratest cleanup guidance](https://terratest.gruntwork.io/docs/testing-best-practices/cleanup/)
- [Terratest local iteration with test stages](https://terratest.gruntwork.io/docs/testing-best-practices/iterating-locally-using-test-stages/)
- [Terratest documentation](https://terratest.gruntwork.io/docs/)
- [Terraform state purpose](https://developer.hashicorp.com/terraform/language/state/purpose)
- [Terraform test command and cleanup](https://developer.hashicorp.com/terraform/cli/commands/test)

## Conclusion

Share a Terratest fixture only when children can treat it as an immutable, versioned service. Put creation and destruction in one parent, give every child isolated state and resources, and keep assertions independent. For broader sharing, replace package globals with leases, health checks, expiry, and an external owner. The fixture should reduce setup time without becoming hidden test state.
