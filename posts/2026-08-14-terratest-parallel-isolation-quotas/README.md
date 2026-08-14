# Run Terratest in Parallel Without Cloud Collisions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terratest, Parallel Tests, Terraform State, Cloud Quotas, Go Testing

Description: Isolate Terraform working directories, state keys, names, networks, and environment while bounding aggregate cloud API and quota pressure.

---

Calling `t.Parallel()` makes test scheduling concurrent. It does not isolate Terraform state, `.terraform` directories, remote backend keys, global cloud names, CIDRs, environment variables, or account quotas.

A parallel Terratest suite needs a unique execution capsule for each case:

~~~text
working directory + state identity + resource identity + network identity + cleanup
~~~

After those are isolated, set an explicit concurrency budget based on the cloud account's slowest quota and API, not the runner's CPU count.

## Copy Terraform Into a Per-Test Directory

Two Terraform processes must not initialize and write state in the same source directory. Terratest's `files.CopyTerraformFolderToTemp` exists for this case:

~~~go
package test

import (
	"fmt"
	"testing"

	"github.com/gruntwork-io/terratest/modules/files"
	"github.com/gruntwork-io/terratest/modules/terraform"
	"github.com/stretchr/testify/require"
)

func TestServiceRegions(t *testing.T) {
	testCases := []struct {
		name   string
		region string
	}{
		{name: "london", region: "eu-west-2"},
		{name: "ohio", region: "us-east-2"},
	}

	for _, testCase := range testCases {
		testCase := testCase

		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()

			testDir, err := files.CopyTerraformFolderToTemp(
				"../examples/service",
				"service-"+testCase.name,
			)
			require.NoError(t, err)

			runID := newRunID(t.Name())
			options := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
				TerraformDir: testDir,
				Vars: map[string]interface{}{
					"region":      testCase.region,
					"test_run_id": runID,
				},
				BackendConfig: map[string]interface{}{
					"key": fmt.Sprintf("tests/%s/terraform.tfstate", runID),
				},
			})

			defer terraform.Destroy(t, options)
			terraform.InitAndApply(t, options)
		})
	}
}
~~~

The classic Terratest files helper returns `(string, error)` and filters out state and ordinary `terraform.tfvars` when making a Terraform copy. Module versions differ, so pin Terratest and use the matching API. Pass all test variables explicitly rather than relying on a tfvars file that the helper intentionally excludes.

The Terraform calls above match the classic `github.com/gruntwork-io/terratest/modules/terraform` API. Context-suffixed helpers require the separate `modules/terraform/v2` package, which is still a v2 beta as of this writing.

The `testCase := testCase` capture remains useful for suites supporting Go versions with older range-variable semantics. It also makes the closure's intent clear.

## Give Every Test a Unique State Identity

Local directory separation isolates local state. A configured remote backend also needs a unique key or workspace for each run:

~~~text
tests/<repository>/<ci-run>/<test-name>/<attempt>/terraform.tfstate
~~~

Include a collision-resistant suffix if CI identifiers are not globally unique. Backend locking protects one key from concurrent writers; it does not isolate two tests that mistakenly share that key. A lock conflict is a valuable failure signal, not a reason to set `-lock=false`.

Terraform CLI workspaces store separate state instances, but HashiCorp notes that workspaces are not appropriate for deployments needing separate credentials or access controls. A unique backend key is often easier to audit and expire for integration tests.

Do not delete a remote state key until destroy has succeeded and the cloud inventory is empty. An orphaned state is evidence needed for recovery.

## Make Remote Resource Names Unique

Separate state can still request the same remote object. Account-global and globally unique services are common collision points:

- object storage buckets;
- IAM roles and policies;
- DNS records and zones;
- Kubernetes namespaces and cluster-scoped objects;
- secret names and parameter paths;
- container registries;
- load balancer and log group names.

Generate one run ID and derive every name from it. Combine durable CI identity with random bytes, then hash or truncate for provider length and character rules. Terratest's random package includes `UniqueId` in older releases and `UniqueID` in newer v1 packages; either is described as unique-ish, so combine it with CI metadata when collisions are costly.

Tag every resource with the full untruncated run ID. Names may be shortened, but cleanup and incident response need an exact ownership key.

## Isolate Network Allocations

Parallel tests that create VPCs, virtual networks, subnets, VPNs, or Kubernetes service ranges can collide even when names differ. Allocate CIDRs from a test-only pool using a concurrency-safe lease service or a deterministic, collision-checked mapping from run ID.

Do not choose a random RFC 1918 block without checking:

- peered test networks;
- shared transit routing;
- runner and service control-plane networks;
- Kubernetes pod and service ranges;
- provider-reserved ranges.

Release a lease only after the network is deleted. A crashed test must leave the lease visible until the janitor reconciles it.

For fixed ports, DNS names, and external test endpoints, apply the same lease principle. State isolation does not reserve shared infrastructure.

## Avoid Process-Global Mutations

Parallel Go tests share one process. The Go testing package prohibits `t.Setenv` and `t.Chdir` in tests with parallel ancestors because they affect the whole process. Direct `os.Setenv` and `os.Chdir` are equally unsafe even if the test framework cannot detect them.

Pass environment and paths through per-test options:

~~~go
options := &terraform.Options{
	TerraformDir: testDir,
	EnvVars: map[string]string{
		"AWS_REGION":           testCase.region,
		"AWS_DEFAULT_REGION":   testCase.region,
		"TF_IN_AUTOMATION":     "1",
	},
}
~~~

Avoid modifying shared credential files, kubeconfig current context, CLI profiles, or global SDK defaults. Give each test its own file and point the subprocess to it through an environment variable.

## Bound Go and Terraform Concurrency Together

There are several independent concurrency controls:

- `t.Parallel()` marks a Go test eligible for parallel execution;
- `go test -parallel=N` limits parallel tests within one test binary;
- `go test -p=N` limits concurrently built or tested packages;
- Terraform's `-parallelism` controls concurrent resource graph operations inside each Terraform process;
- CI can launch several jobs against the same account.

The cloud sees their product, not each limit in isolation. Four Go tests each running Terraform parallelism 10 can create roughly forty concurrent provider operations before SDK retries and other CI jobs are counted.

Start with a conservative command:

~~~console
$ go test -count=1 -timeout=45m -parallel=3 -p=1 ./...
~~~

Terratest recommends `-count=1` because Go test caching can otherwise reuse a result when only Terraform files changed. `-p=1` serializes package test binaries, while `-parallel=3` still permits up to three `t.Parallel` tests in one binary.

Set `terraform.Options.Parallelism` lower for quota-sensitive modules. Then observe throttling, create latency, cleanup latency, and peak resource count before increasing either layer.

## Add a Cloud-Specific Semaphore

A process-local semaphore can protect a scarce API or resource class:

~~~go
var integrationSlots = make(chan struct{}, 3)

func acquireIntegrationSlot(t *testing.T) func() {
	t.Helper()
	integrationSlots <- struct{}{}
	return func() { <-integrationSlots }
}
~~~

Use it around provisioning:

~~~go
release := acquireIntegrationSlot(t)
defer release()

terraform.InitAndApply(t, options)
~~~

This limits only one Go test process. Multiple CI jobs need an external concurrency group, lease table, queue, or account partition. Do not hold a scarce slot during long local-only assertions if another test could safely provision.

Consider separate budgets for expensive resources such as public IPs, large clusters, NAT gateways, or organization-level IAM changes. One global limit can underutilize safe APIs while still exhausting a narrow quota.

## Keep Cleanup Isolated and Observable

Each test must destroy only its own state and names. Register destroy before apply and retain the unique backend key until cleanup succeeds.

Parallel cleanup can itself hit throttling. If many tests finish together, use provider retry guidance and a bounded cleanup queue. Never solve destroy lock conflicts by force-unlocking another test's state. HashiCorp warns that force unlock should be used only for your own lock when automatic unlocking failed.

An external janitor should discover expired resources by run tag and dedicated account, not by guessing names. Track cleanup outcomes per run so one test cannot report success after deleting another test's fixture.

## Plan Quotas Before Enabling Parallelism

For each test, estimate peak and steady-state consumption:

~~~text
tests x resources per test x overlap during cleanup
~~~

Include quotas for addresses, gateways, vCPUs, load balancers, IAM object counts, API requests, DNS changes, and concurrent operations. Some quotas are regional, some account-wide, and some take minutes to return after deletion.

Fail fast when capacity is unavailable instead of queuing inside a provider until the CI timeout. A preflight lease or scheduler provides clearer feedback than random `LimitExceeded` errors.

## Parallel Readiness Checklist

Before adding `t.Parallel()` confirm:

1. Terraform runs in a unique working directory.
2. Remote state has a unique key and locking remains enabled.
3. All cloud names and tags include a run identity.
4. CIDRs, DNS names, ports, and Kubernetes scopes are leased or unique.
5. No test changes process-global environment or working directory.
6. Apply and destroy fit within the Go test and CI deadlines, or use bounded contexts with a pinned Terratest v2 beta.
7. Aggregate Go, Terraform, and CI concurrency fits quotas.
8. A janitor can identify leftovers without the original state.

## Official Documentation

- [Terratest files helper: per-test Terraform directory copies](https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/files)
- [Terratest classic Terraform helper API](https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform)
- [Terratest random identifiers](https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/random)
- [Terratest guidance: disable Go test caching](https://terratest.gruntwork.io/docs/testing-best-practices/avoid-test-caching/)
- [Go test flags: parallel tests and package concurrency](https://pkg.go.dev/cmd/go)
- [Go testing: t.Parallel, Setenv, and Chdir constraints](https://pkg.go.dev/testing)
- [Terraform state locking and force-unlock safety](https://developer.hashicorp.com/terraform/language/state/locking)
- [Terraform workspaces and isolation limits](https://developer.hashicorp.com/terraform/language/state/workspaces)

## Conclusion

Parallel Terratest is safe only when each run has its own working directory, state key, resource identity, and shared-resource leases. Pass environment through subprocess options, keep locking enabled, and cap the combined Go, Terraform, and CI concurrency against real quotas. Speed comes after isolation; otherwise parallelism only makes collisions arrive sooner.
