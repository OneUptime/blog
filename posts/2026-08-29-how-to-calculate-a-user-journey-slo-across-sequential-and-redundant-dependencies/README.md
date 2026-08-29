# How to Calculate a User-Journey SLO Across Sequential and Redundant Dependencies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLO, Dependencies, Service Dependencies, Reliability, User Experience, SLI

Description: Use dependency math for design bounds, then measure the correlated end-to-end journey that users actually experience.

---

For independent components used in sequence, multiply availabilities. For independent redundant alternatives, multiply failure probabilities and subtract from one. Those formulas are useful architecture estimates-but they are rarely an adequate production SLI because real failures and failover mechanisms are correlated.

The SLI underlying the production user-journey SLO should count observed logical outcomes at the journey boundary.

## Sequential Dependencies

If a journey requires components A, B, and C, and each succeeds independently with probability `A_i`, the theoretical journey availability is:

```text
A_journey = A_A x A_B x A_C
```

Three independent 99.9% dependencies yield:

```text
0.999 x 0.999 x 0.999 = 0.997003 = 99.7003%
```

This shows why adding hard dependencies consumes reliability margin. It does not prove a 99.7003% user SLO: public SLAs have different scopes, and independence may be false.

Without independence, the exact expression is:

```text
P(journey good) = 1 - P(A fails OR B fails OR C fails)
```

Shared DNS, identity, region, network, deployment, quota, or configuration can make failures overlap. Multiplying marginal SLO scores ignores that joint behavior. Microsoft explicitly cautions against treating multiplied provider SLA percentages as a workload guarantee.

## Redundant Dependencies

If either independent alternative can satisfy the outcome and failover itself works, the theoretical availability is:

```text
A_redundant = 1 - ((1 - A_primary) x (1 - A_secondary))
```

Two independent 99.9% alternatives yield 99.9999%. The assumptions are demanding:

- both paths have enough capacity;
- they do not share the relevant failure mode;
- detection and routing occur within the journey deadline;
- credentials, data, semantics, and idempotency work on both;
- the failover controller is available;
- operators regularly test the path.

If any assumption fails, the formula overstates reliability. A primary-first implementation is better described from observed conditional events:

```text
P(good) = P(primary succeeds)
        + P(primary fails AND failover works AND secondary succeeds)
```

Instrument all parts of the second term. A healthy secondary that was never invoked does not demonstrate successful redundancy.

## Count One Logical Outcome

Define the journey event independently of attempts:

```text
good journeys / eligible journey starts
```

A primary failure followed by successful fallback within the deadline is one good journey. A primary and secondary failure is one bad journey, not two. Record attempts and causes for diagnostics, but do not multiply user impact.

A rolling five-minute SLI query can look like:

```promql
sum(rate(journey_outcomes_total{journey="checkout",result="good"}[5m]))
/
sum(rate(journey_outcomes_total{journey="checkout"}[5m]))
```

This query measures finalized outcomes-including correlation and failover-as users encountered them. Persist every eligible journey start and reconcile it into exactly one terminal `journey_outcomes_total` outcome: emit at completion, or emit `result="bad"` once its deadline passes without a terminal outcome. The denominator then counts finalized eligible journeys.

## Allocate Component Risk Without Turning It into Compliance

Use dependency math to decide whether the design plausibly meets the target. Allocate portions of the user budget to application changes, each hard dependency, failover, and unknown risk. Set internal component objectives tight enough to support that plan.

Then compare attributed journey failures with the allocation. If payment causes 60% of budget loss despite a 20% allocation, improve fallback, renegotiate the provider relationship, reduce dependency, or revise the achievable product target. Do not exclude those events from the journey score.

## Validate the Model

Run controlled tests for:

- each dependency failing alone;
- shared regional or identity failure;
- slow rather than hard failure;
- fallback capacity under full traffic;
- duplicate side effects during failover;
- stale or inconsistent data between providers;
- recovery and failback;
- telemetry loss during the same incident.

Compare predicted and observed journey outcomes. Update correlation and failover assumptions from incident evidence, not just provider documents.

## Avoid Common Calculation Errors

- Do not average component success percentages; the operation topology matters.
- Do not multiply scores from different periods, populations, or failure definitions.
- Do not assume retries are independent when they hit the same unhealthy system.
- Do not add provider SLA service credits to your error budget.
- Do not treat active/active paths as independent redundancy if both share a hard control-plane dependency.
- Do not substitute the worst component SLO for an end-to-end measurement; it can miss integration failures.

## References

- [AWS Well-Architected Reliability Pillar: Availability with hard and redundant dependencies](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/availability.html)
- [AWS: Availability with dependencies](https://docs.aws.amazon.com/whitepapers/latest/availability-and-beyond-improving-resilience/availability-with-dependencies.html)
- [Microsoft Azure: How to read a service-level agreement](https://learn.microsoft.com/en-us/azure/reliability/concept-service-level-agreements)
- [Google SRE Workbook: Modeling User Journeys](https://sre.google/workbook/implementing-slos/#modeling-user-journeys)

## Conclusion

Multiply independent sequential availability and combine independent redundant failure probabilities only as design estimates. For operations, count the final journey once; when every eligible start is eventually classified, that measurement captures real correlation, retries, fallback, and integration behavior.
