# Should Infrastructure Tests Check Configuration or Real Behavior?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Infrastructure Testing, Terraform, Terratest, Behavior Testing, Cloud Infrastructure, Reliability

Description: Combine plan and control-plane checks with small end-to-end probes so tests verify both intended resource settings and the service contract users depend on.

---

Infrastructure tests should usually verify both configuration and behavior, but not at the same frequency or depth. A plan assertion answers whether Terraform intends to set a property. A control-plane read answers what the cloud API reports after apply. A behavior probe answers whether a real client can use the service contract.

None is a universal substitute for the others. A database can have the expected subnet identifiers yet be unreachable because of routing or DNS. An HTTP endpoint can return 200 while its encryption, retention, or audit settings violate policy. Design a layered test around the failure you need to detect.

## Separate Three Kinds of Evidence

Use precise names in the test plan:

1. **Planned configuration:** values and actions in Terraform's plan or native test assertions.
2. **Effective control-plane state:** values returned by the provider or cloud API after deployment.
3. **Observed behavior:** a request made through the same relevant path and identity as a consumer.

For a private HTTPS service, those layers might be:

```text
Plan:       the load balancer is internal and references private subnets
Cloud API:  the deployed load balancer reports the expected scheme and listeners
Behavior:   a workload in the test subnet resolves the name, completes TLS, and gets /ready
Negative:   a probe outside the private network cannot reach the service
```

Each result narrows diagnosis. If the plan is wrong, fix module logic. If the plan is right but the control plane differs, inspect provider behavior, defaults, policy, or drift. If both configurations look right but the probe fails, investigate DNS, routes, firewalls, certificates, service readiness, and the observation point.

## Check Configuration When the Setting Is the Contract

Configuration assertions are the best primary evidence for rules that are intrinsically declarative:

- encryption, logging, retention, deletion protection, and backup settings;
- lifecycle actions such as update versus replacement;
- required tags, identities, network attachments, and resource counts;
- absence of a forbidden resource type or public ingress declaration;
- module outputs and input validation.

Many of these can run against `terraform test` with `command = plan`, provider mocks, or plan JSON. That makes them fast and safe enough for every relevant pull request.

Prefer assertions against the module's public promise over implementation details. If a module promises one reachable endpoint, asserting an output and behavior is more durable than snapshotting every internal resource address. Assert an internal resource only when its configuration is itself a documented contract or security requirement.

Provider mocks reproduce schemas and user-supplied overrides; they do not call the cloud. They are useful for testing how computed values flow through module expressions, not for proving that a remote API accepts the configuration.

## Read Back State When Providers or Platforms Add Meaning

After apply, the remote system may select defaults, normalize values, attach generated policies, or enter a different lifecycle state. A targeted control-plane read catches gaps that a plan-only assertion cannot:

- the service selected an allowed engine or protocol version;
- all expected availability zones became active;
- a generated identity policy has no unexpected principal;
- encryption uses the intended key rather than a provider-managed fallback;
- a certificate is attached to the expected listener;
- the resource is not merely created but reports a documented ready state.

Use the official service API or provider data source carefully. Reading through the same Terraform provider can share the same interpretation bug as the resource under test. For high-risk properties, an independent official SDK or service API can provide stronger evidence.

Do not dump entire resource descriptions into snapshots. Cloud APIs add fields, reorder collections, and return timestamps or generated IDs. Select the small set of effective properties tied to the requirement, and redact diagnostic output by allowlist.

## Test Behavior When Users Depend on an Outcome

Behavior tests should exercise the externally meaningful verb:

- establish a TLS connection and validate the certificate name;
- publish and consume one uniquely identified message;
- write and read one object using the intended workload identity;
- resolve a private DNS record from an allowed network;
- fail over a disposable service and verify a bounded recovery objective;
- confirm that a denied identity receives the documented authorization failure.

The probe must use a representative observation point. A cloud API saying a target is healthy is not the same as a workload reaching it. A request from a public CI runner is not evidence about a private subnet. Run a small probe workload inside the relevant test network when the path is part of the contract.

Record the identity, resolver, source network, endpoint, protocol, and deadline with the result. Otherwise a passing `curl` command can be routed through an unintended proxy or resolve a public name while the private path remains broken.

## Include Positive and Negative Behavior

Security and isolation requirements need both sides. Verify that the allowed client succeeds and that a deliberately unprivileged client fails for the expected reason.

A negative test that merely observes a timeout is weak evidence. It could indicate a firewall denial, broken DNS, a dead service, or a failed test runner. First prove the service is healthy from an allowed path. Then assert the prohibited path's expected outcome, such as a specific authorization status or a network denial from a known source.

Do not run destructive security probes against production. Create isolated test data and identities with names tied to the CI run. Keep permissions narrow enough that a failed negative test cannot modify unrelated resources.

## Poll for a Condition, Not a Fixed Sleep

Cloud control planes and managed services often converge asynchronously. A test should wait only when official behavior or observed API state indicates convergence is expected. Poll the smallest relevant condition with a monotonic overall deadline, bounded per-attempt timeout, and jittered interval.

The state sequence should be explicit:

```text
apply completed
  -> control plane reports listener active
  -> DNS returns the expected address
  -> TLS handshake succeeds
  -> readiness endpoint returns the expected body
```

If the deadline expires, report the last safe observation from every completed stage. A single three-minute sleep delays fast cases and gives slow failures no useful diagnosis.

Keep convergence polling separate from retrying the operation under test. Repeating a mutating request can create duplicate side effects unless the API operation is idempotent or uses an idempotency key.

## Build a Minimal Layered Suite

For each module, start with this shape:

- **Every relevant pull request:** formatting, validation, plan tests, mock tests, and policy checks.
- **Selected pull requests:** one small apply-and-destroy smoke test for changed behavior or provider integration.
- **Scheduled:** broader regions, versions, failure modes, replacement, recovery, and negative paths.
- **Continuous production controls:** drift, real service indicators, and synthetic checks appropriate for production risk.

The live smoke test should be end to end but small. For a queue module, create one queue, publish one run-specific payload, consume and compare it, then delete it and destroy the infrastructure. Do not reproduce production load unless capacity is the property under test.

When a behavior has a slow managed dependency, consider a stable test fixture plus a per-test isolated payload. Keep fixture health failures distinct from module regressions and retain independent expiry cleanup.

## Keep the Layers From Contradicting Each Other

Give each requirement an identifier and map its evidence:

| Requirement | Plan | Control plane | Behavior |
| --- | --- | --- | --- |
| `NET-01` private placement | Internal scheme and subnet references | Effective scheme and addresses | Allowed path succeeds; public path fails |
| `TLS-02` approved certificate | Listener references certificate | Certificate is attached and valid | Client verifies hostname and trust chain |
| `DATA-03` encryption key | Key identifier configured | Effective key identifier | Configuration evidence is primary; optional read/write proves usability |
| `REL-04` service readiness | Health check configured | Targets become healthy | Client receives expected response before deadline |

This prevents a green endpoint probe from being treated as evidence for encryption, and prevents a green plan from being treated as evidence for connectivity.

If two layers disagree, fail the suite and show the mismatch. Do not let a behavior pass waive a policy violation automatically. Exceptions belong in the authoritative policy process with owner and expiry.

## Avoid Common False Confidence

These tests sound stronger than they are:

- asserting only Terraform output strings without using the endpoint;
- calling the cloud API from an administrator identity rather than the workload identity;
- checking a security-group rule without considering every attached group and route;
- probing from the wrong network;
- accepting any failure as proof of access denial;
- testing a mocked provider and describing it as a cloud integration test;
- reading only Terraform state and assuming no drift occurred after apply;
- making a full resource snapshot that reviewers routinely approve as noise.

State what each test cannot prove. That makes gaps visible and guides the next layer instead of encouraging a false claim of end-to-end coverage.

## Design Cleanup as Another Behavior

An apply-based test is not complete until its resources are gone. Register destroy immediately after setup, retain protected state for recovery, and add an independent expiry janitor for runner loss. Report assertion failure and cleanup failure separately.

Test deletion behavior where it matters. Retention locks, dependent resources, final snapshots, and asynchronous deletion can all make a normal destroy fail. A scheduled cleanup audit should compare expected baseline inventory with actual resources and quota use.

Terraform's native test command attempts to destroy infrastructure it creates and reports resources it could not remove. Its documentation still tells operators to monitor cleanup and use dedicated test accounts that can be safely purged.

## Official Documentation

- [Terraform test language](https://developer.hashicorp.com/terraform/language/tests)
- [Terraform provider mocking](https://developer.hashicorp.com/terraform/language/tests/mocking)
- [Terraform test command and cleanup](https://developer.hashicorp.com/terraform/cli/commands/test)
- [Terraform show and plan inspection](https://developer.hashicorp.com/terraform/cli/commands/show)
- [Terraform JSON output format](https://developer.hashicorp.com/terraform/internals/json-format)
- [Open Policy Agent Terraform plan limitations](https://www.openpolicyagent.org/docs/terraform)
- [Terratest documentation](https://terratest.gruntwork.io/docs/)
- [Go testing package](https://pkg.go.dev/testing)

## Conclusion

Use configuration tests to prove declared intent, control-plane reads to prove effective settings, and behavior probes to prove the outcome consumers experience. Keep each assertion tied to one requirement, run it from a named observation point, and poll with bounded diagnostics. A small layered suite catches both incorrect code and infrastructure that looks correct but does not work.
