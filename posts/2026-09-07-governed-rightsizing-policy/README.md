# Building a Governed Rightsizing Policy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Rightsizing, Cost Optimization, Capacity Planning

Description: Turn recommendations into governed changes with minimum evidence, transparent confidence, risk tiers, approvals, canaries, and expiry.

---

A rightsizing engine produces candidates. A rightsizing policy decides when evidence is sufficient, who can approve a change, how it is tested, and when the decision expires. Without that layer, teams either auto-apply unsafe changes or let every recommendation age in a dashboard.

Build policy around workload risk and evidence quality, not one global utilization threshold.

## Define the recommendation contract

Every candidate should include:

```yaml
recommendation_id: rs-2026-0907-1842
resource: payments/checkout
current_shape: 2-vcpu-4gib
candidate_shape: 1-vcpu-3gib
observation:
  start: 2026-08-06T00:00:00Z
  end: 2026-09-06T23:59:59Z
  expected_samples: 46080
  valid_samples: 45610
  stable_configuration_fraction: 0.94
included_events:
  - weekly-peak
  - deployment
risk_class: high
estimated_monthly_savings: 420
expires_at: 2026-10-07T00:00:00Z
```

Also preserve metric resolution, percentiles, maxima, headroom components, missing intervals, source versions, constraints, and predicted service impact. A number without provenance is not approvable.

## Set minimum evidence by workload class

Minimum sample count alone is insufficient. Ten thousand samples from two quiet days do not cover a weekly cycle. Require all of:

- a minimum valid-sample fraction;
- a minimum time span;
- complete relevant calendar cycles;
- enough time in the current deployment or configuration epoch;
- required events such as peak, backup, deployment, and failover test;
- no unresolved telemetry gaps at critical periods.

Example policy classes:

| Class | Typical workload | Minimum evidence | Change mode |
| --- | --- | --- | --- |
| Low | disposable development | 7 representative days | automated with rollback |
| Medium | stateless internal service | 2 weekly cycles and a deploy | canary plus owner approval |
| High | customer path or stateful data | full business cycle and recovery test | platform and service approval |

These are example organizational rules, not provider defaults. Adjust them to actual recurrence and consequence.

Cloud tools also refuse or qualify recommendations when evidence is insufficient. AWS Compute Optimizer documents resource requirements, analyzed days, and performance risk for supported recommendations. Your policy should preserve such source risk but not substitute it for application-specific evidence.

## Make confidence explainable

Avoid an unexplained machine-learning score. Calculate a policy score from visible components:

```text
coverage score      0 to 25
cycle score         0 to 20
configuration score 0 to 15
cross-source score  0 to 10
headroom evidence   0 to 10
load-test score     0 to 20
total               0 to 100
```

Add hard vetoes. No score should override a missing memory metric, an untested failover requirement, or a candidate that cannot host the largest pod. Confidence measures evidence quality, not certainty that the future repeats the past.

Store the component scores and reasons so a reviewer can challenge them.

## Tier approvals by blast radius

Risk can include statefulness, customer criticality, replica count, rollback time, percentage reduction, data durability, and shared-infrastructure impact.

```yaml
approval:
  low:
    required: [automation-policy]
  medium:
    required: [service-owner]
  high:
    required: [service-owner, platform-owner, change-manager]
```

Finance approval belongs on long-term commitment decisions, while security or compliance may review changes to isolation. Do not make a cost tool the sole approver for a production reliability change.

## Define rollout and rollback gates

Policy should produce an executable experiment:

- maximum first-stage traffic or workload share;
- minimum observation period and required peak;
- application latency, error, and throughput gates;
- CPU throttling, OOM, queue, and storage gates;
- scheduling, eviction, and node-autoscaler gates;
- maximum rollback time;
- exact rollback artifact and owner;
- behavior when telemetry is missing.

Missing critical telemetry should pause or fail the experiment. A zero-valued chart during a collector outage is not a passing result.

For Kubernetes, Validating Admission Policy can enforce static invariants such as requiring approved ranges or metadata, but it cannot prove a workload-specific recommendation is safe. Keep observational approval in the delivery workflow and use admission controls for narrowly defined guardrails.

## Manage recommendation state

Use a lifecycle such as:

```text
ACTIVE -> CLAIMED -> TESTING -> SUCCEEDED
                         \-> FAILED
ACTIVE -> DISMISSED
any stale state -> EXPIRED
```

Prevent two actors from applying different versions. Google Cloud Recommender documents an `etag` as the fingerprint of current recommendation state and uses it when changing state. It supports claimed, dismissed, succeeded, and failed outcomes. The same optimistic-concurrency pattern is useful in an internal system.

When a recommendation is claimed, freeze its inputs or create a new version if data changes. Record actor, ticket, deployment, timestamps, and outcome metadata. Feed failures back into future eligibility rules.

## Expire and re-evaluate

Expire candidates after a material release, topology change, new peak, changed forecast, or fixed maximum age. A recommendation should not wait six months for approval and then apply against a different service.

Schedule a post-change review. Verify actual cost, capacity, service outcomes, and commitment effects. Mark the recommendation successful only after the intended business result appears, not merely after an API update returns success.

## Start in audit mode

Run the policy without applying changes for several cycles. Compare decisions with experienced reviewers, tune false positives, and test state transitions. Then automate only low-risk, reversible classes. Expand automation from evidence, not pressure to close a recommendation backlog.

## Conclusion

A mature rightsizing policy requires representative evidence, an explainable confidence model, risk-based approvals, progressive rollout, optimistic state control, and expiry. Automate reversible low-risk changes first and keep hard safety vetoes outside the score. Success means verified service health and realized savings.

## Official Documentation

- [AWS Compute Optimizer overview and data requirements](https://docs.aws.amazon.com/compute-optimizer/latest/ug/what-is-compute-optimizer.html)
- [AWS Compute Optimizer EC2 performance risk](https://docs.aws.amazon.com/compute-optimizer/latest/ug/view-ec2-recommendations.html)
- [Google Cloud Recommender concepts](https://cloud.google.com/recommender/docs/key-concepts)
- [Google Cloud Recommender state changes](https://cloud.google.com/recommender/docs/use-api)
- [Kubernetes Validating Admission Policy](https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/)
