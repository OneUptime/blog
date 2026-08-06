# Feature Flags as Production Operational Controls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Feature Flag, AWS AppConfig, OpenFeature, Kill Switch, Production Readiness

Description: Design feature flags with safe defaults, narrow access, gradual rollout, health alarms, ownership, drills, and enforced cleanup.

---

A production feature flag is a mutable control plane inside the request path. It can separate code deployment from feature release, stop risky behavior without rebuilding an image, and limit exposure while a change is observed. It can also become an unaudited global switch whose failure mode is unclear.

Treat every operational flag as a small production system: define its behavior, owner, permissions, telemetry, failure mode, rollout method, and retirement date before launch.

## Distinguish the Control Types

Do not put every runtime setting behind a boolean. Name the operational purpose:

| Control | Example | Desired property |
| --- | --- | --- |
| Release flag | expose a new checkout flow | Supports targeted or percentage rollout |
| Kill switch | stop image processing | Fast, tested mitigation with a safe fallback |
| Permission flag | allow beta tenants | Evaluated with trusted identity context |
| Operational mode | read-only, cache-only, shed optional work | Bounded behavior with visible degraded state |
| Experiment | select treatment A or B | Stable assignment and separate analysis ownership |
| Tuning value | batch size or timeout | Typed range validation, not a boolean |

Avoid reusing one flag for multiple meanings. A release flag that also disables writes and changes an authorization rule cannot be reasoned about or rolled back independently.

## Write the Flag Contract

Store metadata next to the flag definition, even if your flag provider does not require it:

```yaml
key: checkout.recommendations.enabled
type: boolean
purpose: release
owner: team-checkout
default: false
safe_value: false
created: 2026-08-06
expires: 2026-09-17
runbook: https://runbooks.example.com/checkout-recommendations
change_ticket_required: true
targeting_data: [tenant_tier, region]
health_signals:
  - checkout_success_ratio
  - checkout_latency_p99
  - recommendation_dependency_errors
```

This is an example team schema, not an OpenFeature or AWS AppConfig object. The key outcome is that an operator can answer who owns the flag, which value is safe, what it affects, and how to verify a change.

## Choose Defaults for Failure, Not Convenience

OpenFeature's evaluation API requires a default value, and its specification says abnormal evaluation returns that default. That makes the default an active failure decision.

For each call site, ask what should happen when:

- no provider is configured;
- the flag key is absent;
- the provider times out or returns the wrong type;
- cached configuration is stale;
- targeting context is incomplete;
- the process starts before configuration is ready.

A safe default is contextual. `false` is often right for an unfinished user feature, but wrong for a flag named `security_checks_disabled`. Prefer positive names whose safe value is obvious, such as `security_checks_enabled`, and test provider failure explicitly.

Example using the OpenFeature JavaScript API:

```typescript
const recommendationsEnabled = await client.getBooleanValue(
  "checkout.recommendations.enabled",
  false,
  evaluationContext,
);

if (!recommendationsEnabled) {
  return renderCheckoutWithoutRecommendations(cart);
}

return renderCheckoutWithRecommendations(cart);
```

The fallback path must be production-capable. If it is never exercised, the kill switch is only a theory.

## Keep Evaluation off the Critical Network Path

Do not make an uncached remote control-plane request for every user request. Use the provider's supported SDK, agent, streaming update, or local cache model. Define:

- the maximum acceptable configuration age;
- startup behavior before the first successful fetch;
- whether the last known value survives restart;
- how quickly an emergency change must propagate;
- what happens when different instances briefly see different versions.

Expose configuration version and fetch status in diagnostics. Alert on sustained fetch failure or excessive staleness, but avoid logging every failed evaluation in a hot path. The OpenFeature specification specifically discourages client evaluation methods from producing high-volume logs.

## Separate Change Permission from Code Permission

Deploying code should not automatically grant permission to enable every production flag. Use least privilege:

- developers can create and test flags in non-production;
- a limited release role can change scoped production release flags;
- security or data controls require the relevant approver;
- emergency operators can activate documented kill switches;
- every read and mutation is attributed to an identity and retained in audit logs.

Do not share a generic flag-admin credential. Protect the control plane with strong authentication, review broad targeting rules, and prevent client-controlled context from becoming an authorization assertion. A user can often influence headers, cookies, or device properties; only trusted server-side attributes should make security decisions.

## Roll Out the Flag Like Code

A flag change can produce the same user impact as a deployment. Apply the same release controls:

1. Validate the type, allowed range, prerequisites, and targeting rules.
2. Enable for internal or synthetic traffic.
3. Enable for a small, representative production cohort.
4. Observe user-facing SLIs and dependency health for a defined bake period.
5. Increase exposure in bounded steps.
6. Stop or revert automatically when a predeclared alarm fires.

AWS AppConfig deployment strategies support linear or exponential growth, a deployment duration, and a final bake time. With the required CloudWatch alarm permissions, AppConfig can roll configuration back when an alarm enters `ALARM` during the deployment or bake period.

The percentages and bake duration are workload policy. Choose them from traffic volume, failure latency, and blast-radius tolerance. A five-minute bake is not useful for a failure that appears in an hourly settlement job.

## Design a Real Kill Switch

A kill switch needs all of these properties:

- **narrow scope:** disable one risky behavior without taking down unrelated paths;
- **safe behavior:** return a known degraded response, queue bounded work, or use a verified fallback;
- **fast propagation:** meet a measured control-plane objective;
- **idempotent operation:** repeated activation has the same result;
- **visible state:** dashboards, logs, and incident status show that degraded mode is active;
- **independent access:** authorized responders can operate it during the likely failure mode;
- **tested recovery:** re-enabling does not release an unbounded backlog or duplicate side effects.

Avoid a switch that merely hides errors while the system keeps accepting work it cannot finish. Specify what happens to in-flight operations, queued work, retries, and stored partial state.

## Drill the Failure Paths

Before launch, run at least these tests:

```text
provider unavailable at process startup
provider becomes unavailable during steady state
flag key deleted or wrong type returned
safe value activated under peak-like traffic
partial fleet receives the new configuration
health alarm forces an automatic rollback
operator follows the runbook without console-admin access
feature re-enabled after backlog or dependency recovery
```

Measure propagation time and user impact. Capture the configuration version, actor, target scope, and health evidence for each drill.

## Remove Flags Deliberately

Every temporary flag creates at least two code paths and one operational decision. Retirement is complete only when you:

1. choose the permanent value;
2. verify that value at full exposure for the agreed period;
3. remove the alternate branch and tests that only support it;
4. deploy the simplified code;
5. verify no supported old binary still evaluates the key;
6. delete the control-plane flag and stale dashboards or alerts.

Track expiry as an alert or build check. An expiry date with no owner and no enforcement is documentation, not cleanup.

## Production Readiness Gate

Use evidence-based launch criteria:

```yaml
feature_flag_gate:
  typed_definition_validated: true
  safe_default_tested: true
  provider_failure_tested: true
  audit_log_query_attached: true
  gradual_strategy_configured: true
  abort_alarms_tested: true
  kill_switch_drill_seconds: 42
  owner: team-checkout
  removal_issue: OPS-1842
  expiry: 2026-09-17
```

The fields and values above are example team policy. Official tools provide mechanisms, but they do not decide your safe value, appropriate owner, propagation target, or acceptable drill time.

## Official Documentation

- [OpenFeature Flag Evaluation API specification](https://openfeature.dev/specification/sections/flag-evaluation/) defines typed evaluation, required defaults, error behavior, and detailed evaluation metadata.
- [OpenFeature Evaluation API concepts](https://openfeature.dev/docs/reference/concepts/evaluation-api/) emphasizes that evaluation errors return the supplied default value.
- [AWS AppConfig deployment strategies](https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-deployment-strategy.html) documents linear and exponential rollout, growth factor, deployment duration, and bake time.
- [AWS AppConfig reverting a configuration](https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-deploying-reverting.html) documents alarm-driven automatic rollback and explicit revert behavior.
- [AWS AppConfig validators](https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-configuration-and-profile-validators.html) documents Lambda and JSON Schema validation, including automatic JSON Schema validation for AppConfig feature flags.

## Conclusion

Feature flags are reliable operational controls only when their defaults, failure behavior, access, telemetry, rollout, and cleanup are designed in advance. Keep each flag narrow, make the fallback genuinely safe, change it progressively against user-facing health signals, drill provider failure and emergency operation, and remove temporary branches on an enforced schedule.
