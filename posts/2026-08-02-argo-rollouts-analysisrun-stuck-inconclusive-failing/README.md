# Why an Argo Rollouts AnalysisRun Is Stuck, Inconclusive, or Failing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Rollouts, AnalysisRun, Kubernetes, Progressive Delivery, Troubleshooting, Observability

Description: Diagnose AnalysisRun phases by tracing measurement schedules, provider errors, condition evaluation, limits, and the Rollout action each outcome triggers.

---

An `AnalysisRun` is an instantiated `AnalysisTemplate`. Its phase is not a generic health label: `Pending`, `Running`, `Successful`, `Failed`, `Error`, and `Inconclusive` describe specific points in metric execution and evaluation.

Start with the AnalysisRun itself rather than the Rollout summary:

```bash
kubectl get analysisrun -n payments
kubectl describe analysisrun <analysis-run> -n payments
kubectl get analysisrun <analysis-run> -n payments -o yaml
```

Under `.status.metricResults`, inspect each metric's phase, counters, measurements, timestamps, value, and message. One metric can explain the phase of the whole run.

## Running May Be Correct

A metric with `count` and `interval` intentionally takes time:

```yaml
metrics:
  - name: success-rate
    interval: 2m
    count: 5
    initialDelay: 1m
    successCondition: len(result) == 1 && result[0] >= 0.99
    provider:
      prometheus:
        address: http://prometheus.monitoring.svc:9090
        query: ...
```

This run cannot finish immediately: it delays, then schedules five measurements two minutes apart. Compare `startedAt`, measurement timestamps, `initialDelay`, `interval`, and `count` before calling it stuck.

Background analysis can be deliberately open-ended. The analysis documentation allows `count: 0` to run until the Rollout ends for background analysis. In an inline analysis step, however, a zero count means the analysis is not executed. Know whether the template is referenced under `strategy.canary.analysis` or inside a `steps[].analysis` entry.

Job metrics also remain running until the Kubernetes Job completes. Read `job-name` and `job-namespace` from `.status.metricResults[].measurements[].metadata`, then inspect the Job and its pods in that namespace. If the controller is configured to run analysis Jobs in another cluster, use the corresponding `kubectl` context as well:

```bash
kubectl describe job <job-name> -n <job-namespace>
kubectl get pods -n <job-namespace> \
  -l batch.kubernetes.io/job-name=<job-name>
kubectl logs job/<job-name> -n <job-namespace>
```

A hanging test process, missing deadline, unschedulable pod, or dependency timeout can make the AnalysisRun wait.

## Inconclusive Means Neither Pass Nor Fail

The official analysis guide lists two common causes:

- the metric defines neither a success nor a failure condition;
- both conditions exist, but the returned value satisfies neither one.

For example:

```yaml
successCondition: result[0] >= 0.99
failureCondition: result[0] < 0.95
```

A value of `0.97` is intentionally inconclusive. The Rollout pauses for human action rather than promoting or aborting. That is useful for a review band, but surprising if the author assumed every number had an outcome.

Job-provider handling of terminal waiting states is version-specific. In Argo Rollouts v1.9.1 and earlier, `ErrImagePull`, `ImagePullBackOff`, and `InvalidImageName` do not by themselves make a Job metric inconclusive; the provider waits for the Job to become `Complete` or `Failed`, so the AnalysisRun can remain `Running`. Newer development builds add terminal-wait detection that short-circuits the measurement to `Inconclusive` and pauses the Rollout. Verify the installed controller version before deciding which behavior to expect.

After investigation, either promote/resume the Rollout or abort it. Do not promote merely to clear a dashboard state; record why the result was safe.

## Failed Means the Measurement Violated Policy

A failure is normally a valid provider result that the template classified as bad. Examples include:

- `failureCondition` evaluated true;
- a success condition evaluated false when no separate failure condition exists;
- a Job test exited nonzero;
- repeated failed measurements exceeded `failureLimit`.

Inspect the raw value and condition together. A query returning an empty array can fail `len(result) > 0 && result[0] >= 0.99` even though the application itself has no recorded errors. That is a telemetry-policy failure, and failing closed may be exactly the intended behavior.

When an inline or strategy analysis fails, the Rollout normally aborts the update. Confirm the stable ReplicaSet has traffic and investigate before retrying the unchanged desired revision.

## Error Is Different from Failure

An error means the measurement could not be obtained or evaluated reliably. Typical causes are:

- DNS, connection, TLS, authentication, or provider timeouts;
- an invalid PromQL query or web response;
- missing Secret keys used by template arguments;
- expression type errors, such as indexing a scalar or comparing `nil` to a number;
- controller permission failures.

Use `.status.metricResults[].measurements[].message` and the Argo Rollouts controller logs:

```bash
kubectl logs -n argo-rollouts deploy/argo-rollouts --since=30m \
  | grep '<analysis-run>'
```

Configure `consecutiveErrorLimit` when transient provider errors should be retried up to a deliberate boundary. Keep provider timeouts shorter than the acceptable deployment delay, and alert on errors separately from genuine bad application metrics.

## A Systematic Triage Sequence

1. Identify the exact AnalysisRun referenced by the Rollout.
2. Read every metric result, not only `.status.phase`.
3. Compare elapsed time with `initialDelay`, `interval`, and `count`.
4. For Jobs, inspect Job, pod scheduling, image pull, logs, and termination state.
5. For remote providers, reproduce the resolved query from the controller's network and identity context.
6. Check Secret references exist in the AnalysisRun namespace.
7. Evaluate the returned value against both conditions, including empty, `NaN`, and type behavior.
8. Review `failureLimit`, `inconclusiveLimit`, and `consecutiveErrorLimit` explicitly.
9. Confirm whether the analysis is inline, background, or an Experiment analysis.
10. Decide whether to wait, correct the provider, abort, or deliberately promote.

## Prevent Recurrence

Use `initialDelay` to let canary telemetry arrive, bounded counts and intervals for inline gates, provider timeouts, explicit no-data policy, and immutable test images. Test AnalysisTemplates independently by creating an AnalysisRun before wiring them into production progression. Retain enough measurement history to debug with `measurementRetention`, and use `ttlStrategy` or the Rollout's `successfulRunHistoryLimit` and `unsuccessfulRunHistoryLimit` to balance evidence with object cleanup.

An AnalysisRun becomes understandable when you treat it as a schedule of typed measurements plus explicit policy-not as a single opaque pass/fail check.

## Official Documentation

- [Argo Rollouts: Analysis and Progressive Delivery](https://argo-rollouts.readthedocs.io/en/stable/features/analysis/)
- [Argo Rollouts FAQ: AnalysisRun Completion, Failures, and Errors](https://argo-rollouts.readthedocs.io/en/stable/FAQ/)
- [Argo Rollouts: Job Metrics](https://argo-rollouts.readthedocs.io/en/stable/analysis/job/)
- [Argo Rollouts: Prometheus Metrics](https://argo-rollouts.readthedocs.io/en/stable/analysis/prometheus/)
- [Argo Rollouts: Web Metrics](https://argo-rollouts.readthedocs.io/en/stable/analysis/web/)
