# Reduce Deployment Blast Radius with Progressive Delivery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Progressive Delivery, Canary Deployment, Argo Rollouts, Kubernetes, Deployment Safety

Description: Limit release exposure with representative canaries, staged traffic, measurable bake periods, and tested automated abort criteria.

---

A rolling deployment limits how many replicas change at once. It does not necessarily limit how much traffic, data, or business impact reaches the new version. A single canary Pod can receive a disproportionate load, call a shared database, corrupt global state, or trigger an irreversible downstream action.

Progressive delivery reduces risk only when exposure is deliberately bounded and promotion is tied to evidence. Design the canary population, traffic steps, observation windows, health checks, and abort behavior as one control system.

## Define Blast Radius in More Than Replicas

For each release, identify the dimensions through which harm can spread:

| Dimension | Questions to answer |
| --- | --- |
| Traffic | What percentage and request types reach the canary? |
| Users | Are internal, low-risk, or representative cohorts isolated? |
| Geography | Can one region or zone receive the change first? |
| Data | Does the canary write shared tables, queues, or object keys? |
| Dependencies | Can it overload a shared backend despite low user traffic? |
| Time | How long can a latent fault run before detection? |
| Privilege | Can the new version perform destructive or administrative actions? |

A traffic canary does not bound shared side effects. If 5 percent of requests can update 100 percent of customer records through a background task, the data blast radius is still global. Add feature flags, shadow writes, separate topics, scoped credentials, or idempotency controls where traffic weighting alone is insufficient.

## Understand What Kubernetes Provides

A Kubernetes `Deployment` with `RollingUpdate` controls availability through `maxUnavailable` and capacity through `maxSurge`. It retains ReplicaSets according to `revisionHistoryLimit`, and `kubectl rollout undo` can restore a previous Pod template revision.

Two details matter operationally:

- Replica proportion is not exact traffic proportion. A regular Kubernetes Service balances across ready endpoints according to its implementation and connection behavior; it does not promise that one of ten Pods receives exactly 10 percent of requests.
- `progressDeadlineSeconds` reports stalled progress as `ProgressDeadlineExceeded`. Kubernetes documentation states that the Deployment controller does not automatically roll back only because this deadline is exceeded. A higher-level controller or pipeline must decide and act.

Use a progressive delivery controller and supported traffic router when exact staged weights, pauses, and metric analysis are required.

## Build a Representative Canary

Google SRE defines a canary as a partial, time-limited deployment evaluated before rollout proceeds. Its sample must be large and long enough to represent production behavior.

Choose a canary that covers:

- the important request and customer segments;
- realistic concurrency and connection reuse;
- peak or otherwise stressful load when performance is the risk;
- cache warmup and runtime effects such as garbage collection;
- periodic work, queue consumption, and scheduled boundaries;
- the failure latency of each selected signal.

Do not mechanically standardize on `5% for 5 minutes`. A service handling ten requests per hour cannot learn much from that sample. A service handling hundreds of thousands of homogeneous requests per second may learn quickly, but a daily billing defect still needs a different test.

## Choose Promotion Signals Before the Release

Start with user-facing SLIs and add guardrails that expose leading failure:

- success ratio or correctness rate;
- latency distribution, not only averages;
- SLO error-budget burn;
- request volume by response class;
- queue age and depth;
- dependency errors, latency, and retries;
- CPU, memory, connection pools, and other saturation;
- business invariants such as successful checkout or duplicate charge rate.

Compare canary and stable populations over the same time window where possible. Google SRE warns that before-and-after comparison is vulnerable to unrelated time effects. Label telemetry by release revision so a query can distinguish control from canary without using unbounded identifiers.

Every signal needs four states:

1. **pass:** promotion may continue;
2. **fail:** abort immediately;
3. **inconclusive:** pause for investigation or abort conservatively;
4. **missing:** treat explicitly rather than silently passing.

Missing telemetry is not evidence of health.

## Encode Steps and Analysis

Argo Rollouts can set canary weights, pause, and run an `AnalysisTemplate`. This shortened example shows the step and analysis structure but omits the Service resources. Because it also omits a router-specific `trafficRouting` block, `setWeight` uses Argo Rollouts' replica-weighted approximation rather than an exact traffic percentage:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: checkout-api
spec:
  replicas: 20
  revisionHistoryLimit: 5
  selector:
    matchLabels:
      app: checkout-api
  template:
    metadata:
      labels:
        app: checkout-api
    spec:
      containers:
        - name: api
          image: registry.example.com/checkout@sha256:REPLACE_ME
  strategy:
    canary:
      stableService: checkout-stable
      canaryService: checkout-canary
      steps:
        - setWeight: 5
        - pause:
            duration: 10m
        - analysis:
            templates:
              - templateName: checkout-health
        - setWeight: 25
        - pause:
            duration: 20m
        - analysis:
            templates:
              - templateName: checkout-health
        - setWeight: 50
        - pause: {}
```

An analysis definition can encode an abort threshold:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: checkout-health
spec:
  metrics:
    - name: canary-success-ratio
      interval: 1m
      count: 10
      successCondition: len(result) > 0 && result[0] >= 0.995
      failureLimit: 1
      provider:
        prometheus:
          address: http://prometheus.monitoring.svc:9090
          query: |
            sum(rate(http_requests_total{
              service="checkout-api",
              track="canary",
              outcome="success"
            }[2m]))
            /
            sum(rate(http_requests_total{
              service="checkout-api",
              track="canary"
            }[2m]))
```

The 5, 25, and 50 percent steps, durations, query labels, `0.995` threshold, and failure limit are example team policy. They are not Argo Rollouts defaults or universal reliability targets. Test the query against empty results, low traffic, delayed ingestion, and malformed values before it can control production.

## Make Abort a Tested State Transition

An abort procedure should be automatic for clear, high-confidence conditions and manual for ambiguous risk. Define:

- who or what can abort;
- which alarms trigger it;
- how quickly traffic returns to stable;
- whether new canary Pods scale down;
- what happens to active connections and in-flight work;
- how messages and side effects created by the canary are contained or repaired;
- whether database compatibility allows old code to resume;
- how the incident and release state are communicated.

Argo Rollouts documents that an aborted update falls back to its stable version. That controls workload state; it does not undo database writes, external API calls, emitted messages, or configuration changes outside the Rollout. Build compensating actions or forward fixes for those effects.

Keep stable capacity available to absorb returned traffic. If the stable ReplicaSet was scaled down aggressively, a nominally fast abort can still overload it while it scales up.

## Prevent False Confidence

Common canary mistakes include:

- testing only process health and ignoring user outcomes;
- using a canary too small to exercise concurrency or traffic diversity;
- routing sticky or internal traffic that is not representative;
- evaluating a one-hour aggregate during a ten-minute canary;
- sending high traffic weight to too few canary replicas;
- promoting when telemetry is missing;
- watching dozens of noisy signals until operators stop trusting failures;
- assuming rollback reverses shared state;
- leaving manual promotion without an owner or timeout.

Argo Rollouts warns that explicit canary replica scaling can be imbalanced with traffic weight. Capacity-test every weight step, including the abort path.

## Production Readiness Evidence

Require these artifacts before enabling automated progression:

```yaml
progressive_delivery_gate:
  blast_radius_dimensions_reviewed: true
  stable_and_canary_telemetry_separable: true
  representative_sample_justified: true
  analysis_empty_result_tested: true
  abort_alarm_tested: true
  stable_capacity_on_abort_verified: true
  shared_side_effect_repair_documented: true
  manual_pause_owner: release-commander
  maximum_pause: "30m"
```

The schema and maximum pause are example organizational policy. The readiness evidence should show test output, dashboard links, and a recorded abort drill, not only checked boxes.

## Official Documentation

- [Google SRE Workbook: Canarying Releases](https://sre.google/workbook/canarying-releases/) defines canarying, discusses representative samples, and explains how to select attributable metrics.
- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) documents rolling update controls, revision history, rollout status, and the reporting behavior of `progressDeadlineSeconds`.
- [Argo Rollouts canary strategy](https://argo-rollouts.readthedocs.io/en/stable/features/canary/) documents weight steps, pauses, and the interaction between canary scale and traffic weight.
- [Argo Rollouts analysis and progressive delivery](https://argo-rollouts.readthedocs.io/en/stable/features/analysis/) documents `AnalysisTemplate`, `AnalysisRun`, success and failure conditions, and how analysis affects progression, abort, or pause.
- [Argo Rollouts basic usage](https://argo-rollouts.readthedocs.io/en/stable/getting-started/) documents promotion and the stable-version behavior after an abort.

## Conclusion

Progressive delivery is effective when it bounds the real ways a release can cause harm, sends representative traffic to a measurable canary, and stops on predeclared evidence. Separate stable and canary telemetry, test missing-data behavior, preserve capacity for abort, and remember that returning traffic does not reverse shared side effects.
