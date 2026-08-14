# Validation Summary: Share Expensive Terratest Fixtures Without Coupling Tests

## Status
validated

## Post Type
Technical guide / infrastructure testing best-practices article

## Technologies Covered
- Terratest fixture lifecycle and cleanup
- Go tests, subtests, parallel execution, cleanup callbacks, and contexts
- Terraform working directories, state, and test cleanup
- Kubernetes namespaces, resource quotas, network policies, and service accounts
- CI/CD fixture leases, ownership metadata, health checks, and expiry

## Sources Consulted
- Go standard library: `testing` package, including subtests, `T.Parallel`, `T.Cleanup`, `T.Context`, and `TestMain` — https://pkg.go.dev/testing
- Go language specification: representation and assignment of slice values — https://go.dev/ref/spec#Representation_of_values
- Go `testing` implementation: execution of remaining cleanup callbacks after `FailNow` — https://go.dev/src/testing/testing.go
- Go 1.22 release notes: per-iteration loop variables — https://go.dev/doc/go1.22
- Go blog: loop-variable semantics and language-version rollout — https://go.dev/blog/loopvar-preview
- Go standard library: SHA-256 and formatting APIs used by `childPrefix` — https://pkg.go.dev/crypto/sha256 and https://pkg.go.dev/fmt
- Gruntwork: Terratest cleanup best practices — https://terratest.gruntwork.io/docs/testing-best-practices/cleanup/
- Gruntwork: Terratest v1 context-API migration guidance — https://terratest.gruntwork.io/docs/migrating-to-v1/overview/
- Gruntwork: Terratest v1.0.1 `terraform.Destroy` and `terraform.DestroyContext` source — https://github.com/gruntwork-io/terratest/blob/v1.0.1/modules/terraform/destroy.go
- Gruntwork: Terratest local iteration with test stages — https://terratest.gruntwork.io/docs/testing-best-practices/iterating-locally-using-test-stages/
- Gruntwork: Terratest `test_structure` package API — https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/test-structure
- Gruntwork: Terratest namespacing guidance — https://terratest.gruntwork.io/docs/testing-best-practices/namespacing/
- HashiCorp: purpose of Terraform state — https://developer.hashicorp.com/terraform/language/state/purpose
- HashiCorp: `terraform test` state management and cleanup — https://developer.hashicorp.com/terraform/cli/commands/test
- Kubernetes documentation: namespaces, resource quotas, and network policies — https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/, https://kubernetes.io/docs/concepts/policy/resource-quotas/, and https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
1. **Cleanup was registered too late to cover partial fixture creation.** The example called `createNetworkFixture` before registering `T.Cleanup`, so a provisioning failure after creating some resources could terminate the setup before cleanup was registered. Changed the example to prepare the teardown plan, register cleanup, and only then create the fixture.
2. **The Terratest cleanup API and context lifetime needed updating.** The post referred to `terraform.Destroy`, which Terratest v1 deprecates in favor of `terraform.DestroyContext`. Updated the API name and clarified that a `T.Cleanup` callback must use a context that remains live during cleanup, such as a separately bounded context created inside the callback, because Go cancels `t.Context()` before cleanup callbacks run. Also clarified why a parent `defer` would run too early for these parallel subtests.
3. **Terraform state was incorrectly described as not being a cache.** HashiCorp documents that state stores configuration-to-object bindings and metadata, but also caches resource attributes for performance. Reworded the claim to say that state is not merely a cache while preserving the warning against sharing child state.
4. **The Go 1.22 loop-variable note was underspecified.** The new semantics are selected by the package's effective Go language version, normally its `go.mod` directive, rather than solely by the installed toolchain. Updated the wording accordingly.
5. **The cleanup-failure wording overstated the effect of `t.Fatal`.** `t.Fatal` stops the rest of the current helper, but Go still invokes other separately registered cleanup callbacks. Narrowed the warning to later deletion attempts in the same helper and stated the callback behavior explicitly.
6. **The fixture contract's allocation identity was incomplete.** It said a per-test prefix was derived only from the run ID, which would not distinguish children in the same run. Updated the contract to include the full test name, matching the later `runID + testName` example.

## Review Notes
- Passing `networkFixture` by value does not deep-copy `SubnetIDs`; the slice's backing array remains shared. The post correctly treats read-only access as a contract, so children must not mutate the slice, or production helpers should return defensive copies.
- The 12-hex-character prefix contains 48 bits of the SHA-256 digest, so a collision remains possible. The post correctly requires authoritative parent allocation rather than relying on hashes for collision-free CIDR or port assignment.
- Current Terratest v1 requires Go 1.26 or newer, making the loop-variable shadow redundant for current v1 users; it remains valid and harmless for older pinned Terratest and Go language versions.
- All seven external links in the post resolved to their intended pages. The author URL redirects to GitHub's canonical hostname.
- The remaining documented behavior about subtest lifecycle, cleanup timing, stage skipping and saved values, isolated Terraform working copies and state, and Kubernetes namespace limitations matched the consulted documentation.
- Lease services, health policies, ownership tags, janitors, and expiry are architectural recommendations rather than behavior supplied by Terratest itself.
