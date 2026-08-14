# What Belongs in a Cloud Account for Infrastructure Integration Tests?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Infrastructure Testing, Terraform, Cloud Governance, CI/CD, AWS, Security

Description: Design a governed cloud account where integration tests can create realistic resources without risking production data, credentials, networks, or budgets.

---

An infrastructure integration test needs enough freedom to prove that a provider can create, update, and destroy real resources. Giving that test access to a normal development or production account creates the wrong failure boundary. A bad test can collide with a human-managed name, consume a regional quota, modify shared routing, or leave an expensive resource running after CI is canceled.

A dedicated test account is therefore not merely a billing bucket. It is a disposable, governed failure domain. AWS describes accounts as natural boundaries for permissions, security, costs, and workloads and recommends separating production from test and development. HashiCorp separately recommends dedicated provider testing accounts that operators can safely purge after failed `terraform test` cleanup. The equivalent boundary may be a Google Cloud project or Azure subscription. This article uses an AWS account for concrete examples, but the design principles are portable.

## Put Test-Owned Resources Behind the Boundary

The account should contain resources that a test is allowed to create and destroy without negotiating with another team:

- short-lived networks, subnets, routing tables, firewalls, load balancers, databases, queues, and compute created by the test;
- a small, versioned bootstrap layer that enables testing, such as the CI role, audit logging, budget notifications, approved KMS keys, and required service endpoints;
- test-only DNS zones or delegated subdomains when DNS behavior is under test;
- test fixtures whose ownership and lifecycle are explicit, such as one prebuilt VPC used by a read-only compatibility suite;
- logs and resource inventory needed to diagnose and clean up failed runs.

Keep two lifecycles separate. The account baseline is installed by a platform-owned stack and changes slowly. Test payloads are created by individual runs and carry an expiry marker. A test must not destroy the baseline, and the baseline must not depend on a particular test payload.

Do not place production data, production secrets, customer identities, shared transit routing, the organization's authoritative DNS zone, or the only copy of a build artifact in this account. If a test must integrate with a shared service, expose the narrowest test interface possible. For example, delegate `pr-tests.example.net` rather than granting CI permission over `example.net`.

## Use an Account, Not One Account per Test Case

A dedicated account does not imply creating a new cloud account for every test. Account creation, organizational enrollment, quota initialization, and closure have their own limits and lead times. Most suites work better with a pool of pre-governed test accounts and unique resource namespaces inside each account.

Use a new account or project when tests need one of these boundaries:

- account-level IAM, organization policy, billing, or service-enablement behavior is itself under test;
- a quota or API-rate boundary must not be shared with other suites;
- the test needs destructive account-wide cleanup;
- regulatory or tenant isolation requires a distinct administrative boundary.

Otherwise, allocate a lease from a pool and suffix every mutable name with a run identifier. The lease should record the account, region, repository, commit, run URL, owner, and expiry time. That record lets a janitor decide what is safe to remove without guessing from a name.

## Bootstrap Guardrails Before Granting CI Access

Place test accounts in a non-production organizational unit. Apply organization-level controls that define the maximum permissions available in the account. In AWS, a service control policy is a guardrail, not a grant: the CI role still needs an IAM policy that permits the required actions.

A useful baseline includes:

1. Central audit logs and security findings that test code cannot disable.
2. An allowlist of regions if the organization has data-location requirements.
3. Denials for leaving the organization, disabling security controls, changing billing, or modifying the bootstrap role.
4. A least-privileged CI role with a short session duration and a trust policy restricted to the intended repository and execution context.
5. Budgets and anomaly alerts routed to an owned channel.
6. Known service quotas for the regions used by the suite.
7. An inventory and cleanup role independent from the role that creates test payloads.

Prefer workload identity federation to stored access keys. In AWS, a GitHub Actions OIDC trust policy can require the token's `sub` claim to identify the intended repository and an execution context such as a branch, the `pull_request` event, or a GitHub environment. Do not trust every repository in an organization by default, and do not expose cloud credentials to workflows that execute untrusted fork code.

The creation role should normally be unable to change its own policy. For services that cannot be tag-restricted at create time, limit resource types, regions, and account-level operations, then rely on isolation, quotas, and cleanup as additional controls. Test this policy with the same scenarios the suite needs; an overly narrow role produces confusing false failures, while an overly broad role turns a test bug into an account-wide incident.

## Make Ownership Machine-Readable

Names are useful to humans, but tags or labels are better cleanup keys. Require a minimal schema on every resource type that supports it:

```hcl
locals {
  integration_test_tags = {
    managed-by = "infrastructure-test"
    repository = var.repository
    run-id     = var.run_id
    expires-at = var.expires_at
  }
}
```

Use an unambiguous UTC timestamp for `expires-at`, and validate its format before deployment. Not every dependent resource inherits tags, so a custom apply/destroy harness should retain its Terraform state and a manifest of identifiers returned by external setup code. Because `terraform test` keeps its state in memory rather than a reusable state file, retain its cleanup output and the same kind of identifier manifest. Activate relevant cost-allocation tags before relying on them for billing reports; cost allocation is not necessarily retroactive.

Tag-based cleanup needs protections against deleting the baseline. Use a positive selection such as all of the expected ownership tags, reject resources without a parseable expiry, scope deletion to the test account, and maintain an explicit denylist for bootstrap resources. Start a new janitor in report-only mode before enabling deletion.

## Design Networking for the Behavior Under Test

Do not connect a test account to production merely because the module normally expects a hub VPC. Choose one of three models:

- **Self-contained:** create the complete topology in the test account. This is safest and gives the best teardown isolation.
- **Emulated dependency:** provide a small test fixture with the same contract as the shared service, such as a test DNS resolver or mock HTTP endpoint.
- **Controlled shared dependency:** connect through a narrowly routed, observable interface with no path to production data.

Test both sides of the boundary. A deployment can succeed while the real behavior fails because a route, security group, endpoint policy, DNS rule, or certificate trust path is wrong. Conversely, a broad test-account egress rule can hide a missing production dependency. Keep the test topology representative of the property being asserted, not automatically identical to all production networking.

## Treat Quotas and Cost as Test Inputs

A new account may have different quotas from an established production account. Inventory required quotas during bootstrap, request increases deliberately, and keep enough headroom to avoid mid-run failures. A suite that exhausts a network-interface or Elastic IP quota can make later create or update operations fail, leave a partially created run, and complicate recovery.

Use several independent cost controls:

- choose small resource shapes unless scale is the behavior under test;
- set per-suite concurrency limits;
- apply budget and anomaly alerts;
- prohibit or separately approve unusually expensive services;
- run a scheduled inventory for expired resources;
- report cost by repository and run tags.

A budget alert is not generally a real-time kill switch. Cleanup and permissions must still bound exposure. Measure create time, test time, destroy time, orphan count, and tagged cost so that an allegedly cheap suite does not accumulate hidden fixtures.

## Define a Recovery Procedure

Terraform attempts to destroy infrastructure created by a test file after the test completes, but its documentation requires operators to monitor cleanup and handle failures. CI cancellation, runner loss, provider bugs, eventual consistency, and dependencies created outside Terraform can all bypass the normal path.

Every account should therefore have a written recovery procedure:

1. Revoke or pause new account leases.
2. Enumerate active and expired run ownership records.
3. Retry normal destroy using the preserved state and original provider version when the harness uses persistent state; otherwise use the `terraform test` cleanup output and manifest for manual cleanup.
4. Remove external dependencies in documented order.
5. Run the janitor in report mode, review the targets, then delete.
6. Verify that only the baseline remains and that quota usage returned to its expected level.
7. Rebuild the account from the baseline if ownership cannot be proven safely.

The last option is a major advantage of a genuinely dedicated account. It is reasonable only when no irreplaceable data or shared service was allowed inside the boundary.

## Official Documentation

- [Terraform test command and cleanup](https://developer.hashicorp.com/terraform/cli/commands/test)
- [Terraform test language](https://developer.hashicorp.com/terraform/language/tests)
- [AWS Organizations best practices for multiple accounts](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_best-practices.html)
- [AWS Organizations authorization policies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_authorization_policies.html)
- [AWS Service Quotas with Organizations](https://docs.aws.amazon.com/organizations/latest/userguide/services-that-can-integrate-servicequotas.html)
- [GitHub Actions OpenID Connect reference](https://docs.github.com/en/actions/reference/security/oidc)
- [AWS guidance for tagging and cost tracking](https://docs.aws.amazon.com/solutions/tagging-on-aws/)

## Conclusion

An infrastructure test account should contain a governed baseline and resources that tests can safely own end to end. Keep production data and shared control planes outside it, federate a tightly scoped CI identity, make ownership and expiry machine-readable, and provide cleanup that survives a lost runner. The account boundary then turns destructive testing from an organizational risk into a controlled engineering tool.
