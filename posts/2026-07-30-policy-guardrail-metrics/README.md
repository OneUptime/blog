# Policy Guardrail Metrics: Tracking Failed Checks, Exceptions, and Time to Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Platform Engineering, Policy as Code, Compliance, Kyverno, OPA, Metrics

Description: Measure guardrails as an evaluation-to-remediation system that distinguishes violations, blocked attempts, errors, exceptions, and restored compliance.

---

A dashboard showing “12,000 policy failures” could describe a serious compliance problem, one developer retrying a typo, a newly introduced audit rule scanning old resources, or a broken policy engine. A raw failure count cannot distinguish them.

Useful guardrail metrics preserve the policy decision lifecycle:

```text
evaluate
  -> pass, fail, skip, or error
  -> enforce, warn, or report
  -> remediate or request exception
  -> verify compliance
```

## Define the Event Taxonomy

At minimum, distinguish:

- **pass:** resource or request was evaluated and compliant;
- **fail:** evaluation completed and found a violation;
- **skip/not applicable:** rule was not evaluated for this subject;
- **error:** the policy could not be evaluated correctly;
- **blocked:** enforcement prevented the requested operation;
- **warned/audited:** operation continued but a violation was recorded;
- **excepted:** a valid exception caused the rule to be bypassed or treated according to policy;
- **remediated:** the subject later passed or no longer existed.

Do not merge `skip` with `pass`. Kyverno’s PolicyReport documentation explicitly treats a skip as a rule bypass—for example, due to unmet preconditions or a matching `PolicyException`.

Also separate evaluation from subject state. Ten rejected deployment attempts may concern one noncompliant manifest. One background scan may identify 10,000 existing resources without any new attempt.

## Use Several Denominators

### Evaluation failure rate

```text
failed evaluations / applicable completed evaluations
```

Exclude engine errors from the denominator and report them separately. State whether repeated evaluations are deduplicated.

### Block rate

```text
blocked admission or pipeline attempts
/
enforced applicable attempts
```

This represents developer interaction with enforcement, not compliance prevalence.

### Noncompliant subject rate

```text
unique currently noncompliant subjects
/
unique applicable subjects
```

This is a state view. For Kyverno, policy reports represent current cluster state and remove entries when resources are deleted; they are not a historical event store.

### Evaluation error rate

```text
policy evaluation errors
/
all attempted evaluations
```

Treat this as a guardrail reliability signal. A silent or erroring policy engine is not successful compliance.

## Preserve Dimensions Without Exploding Cardinality

Useful bounded dimensions:

- policy and rule identifier;
- version or bundle revision;
- control family;
- enforcement mode;
- environment class;
- workflow stage;
- resource kind;
- owning group, if governed and sufficiently aggregated;
- result category;
- exception state.

Avoid resource names, repository names, usernames, image digests, free-form messages, or request payloads in metric labels. Keep sensitive investigation details in access-controlled logs.

OPA decision logs can include the policy query input and result, bundle metadata, timestamp, requester context, and decision identifier. OPA also provides masking and erasure mechanisms because inputs and results may contain sensitive information. Apply those controls before centralizing logs.

## Track Time to Compliance as a Lifecycle

Choose the clock deliberately:

```text
detected_at =
  first reliable observation of the violation

acknowledged_at =
  owning team accepts or triages the finding

compliant_at =
  a subsequent evaluation verifies pass,
  or the subject is retired under documented rules
```

Then report:

```text
time to acknowledge = acknowledged_at - detected_at
time to compliance  = compliant_at - detected_at
active remediation time
waiting time by stage
```

Use medians and tail percentiles, plus age buckets for open violations. Do not average open items as zero. Use censored-age or backlog views for unresolved work.

Separate:

- pre-existing findings from a new audit policy;
- violations introduced after enforcement;
- production from nonproduction;
- critical from advisory controls;
- standard remediation from approved exception.

## Operate Exceptions as First-Class Data

An exception should include:

```text
exception_id
policy_and_rule
subject_scope
business_reason_category
risk_owner
approved_at
expires_at
review_at
compensating_control
status
```

Measure:

- exception requests and approvals;
- approval and rejection rate;
- approval lead time;
- active exceptions by policy and risk class;
- expired but still effective exceptions;
- median exception age;
- percentage with an owner, expiry, and compensating control;
- repeated renewals;
- compliance after expiry;
- exception scope.

An exception rate needs a denominator:

```text
excepted applicable subjects / applicable subjects
```

Also show exceptions per violation or per 1,000 evaluations where useful. A raw count rises naturally with platform scale.

Kyverno supports declarative `PolicyException` resources and recommends narrow scoping. Its reports can expose exception-driven skips, depending on configuration. Preserve the difference between a deliberate exception and a nonapplicable rule.

## Measure Developer Friction

Guardrails should make the safe path easier, not merely block unsafe work. Track:

- repeated identical failures before success;
- time from first failed check to successful run;
- percentage of failures with an actionable message;
- documentation link selection and successful remediation;
- support contacts per 100 failed workflows;
- abandoned workflows after a failed check;
- local or pre-commit detection versus late admission rejection;
- false-positive and policy-defect reports.

Segment by rule. One confusing control can create most of the delay while aggregate compliance appears healthy.

## Measure Detection Shift

Classify where a violation is found:

```text
authoring or IDE
pre-commit
pull request
CI
deployment
admission
background scan
runtime
audit
```

Earlier detection is usually less disruptive, but only if the same policy semantics and versions apply. Report version drift between local, CI, and enforcement engines.

A useful measure is:

```text
early detection rate =
  violations first detected before deployment
  / all newly detected violations
```

Do not count the same violation at every stage as several independent findings.

## Roll Out Policies with Observable Phases

Use:

1. **shadow or audit:** evaluate without blocking;
2. **feedback:** fix false positives, messages, ownership, and remediation;
3. **enforce:** block within a defined scope;
4. **review:** monitor compliance, errors, exceptions, and friction;
5. **expand:** add populations only when evidence supports it.

Kyverno’s policy reports are specifically useful for observing audit impact before enforcement. Note an important limitation from its documentation: enforced admission failures are blocked before a resource exists, so current-state policy reports are not the place to count those blocked attempts; use execution metrics or Kubernetes events.

Mark policy version and enforcement-mode changes on every time series. A failure spike at rollout may reflect new coverage, not deteriorating behavior.

## Build a Guardrail Scorecard

For each material policy:

| Dimension | Measures |
| --- | --- |
| Coverage | Applicable subjects and evaluation coverage |
| Compliance | Unique compliant and noncompliant subjects |
| Enforcement | Block and audit rates |
| Reliability | Evaluation errors, timeouts, and missing decisions |
| Remediation | Open age, p50/p90 time to compliance |
| Exceptions | Active, expiring, expired, scope, and renewals |
| Experience | Repeats, abandonment, support, actionable feedback |
| Versioning | Engine, bundle, and stage drift |

Aggregate by control family only after rule-level review.

## Avoid Guardrail Metric Traps

- **Pass rate without coverage:** unevaluated resources look compliant.
- **Failures without deduplication:** retry loops inflate the problem.
- **Blocked attempts as noncompliant resources:** events and state are mixed.
- **Skip as pass:** exceptions and nonapplicability disappear.
- **Exceptions as failures:** approved risk decisions are misrepresented.
- **Exceptions as success:** accumulated risk disappears.
- **Time to closure:** findings are closed without verified compliance.
- **Team rankings:** teams hide or avoid reporting issues.
- **Policy count:** more rules do not prove better control.
- **No engine health:** broken evaluation appears as a quiet dashboard.

Policy guardrail metrics should explain whether the right subjects were evaluated, what decision occurred, how developers experienced it, how exceptions are governed, and how quickly verified compliance returned. That lifecycle turns policy as code from a rejection counter into an operational control system.

## Official Documentation

- [Kyverno: Policy Reports](https://kyverno.io/docs/guides/reports/)
- [Kyverno: Policy Exceptions](https://kyverno.io/docs/guides/exceptions/)
- [Kyverno: Metrics](https://kyverno.io/docs/reference/metrics/)
- [Open Policy Agent: Decision Logs](https://www.openpolicyagent.org/docs/management-decision-logs)
- [Open Policy Agent: REST API](https://www.openpolicyagent.org/docs/rest-api)
