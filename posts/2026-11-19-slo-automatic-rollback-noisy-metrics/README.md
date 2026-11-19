# How to Trigger Automatic Rollback from SLOs Without Letting One Noisy Metric Revert a Healthy Release

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLO, Argo Rollouts, Progressive Delivery, Prometheus, Rollback

Description: Build an SLO rollback policy with comparable release cohorts, minimum evidence, inconclusive states, and a bounded abort action.

A release starts, p99 jumps, and automation restores the previous version. Five minutes later, latency remains high: the database was saturated before deployment. The rollback added disruption without addressing the incident.

Automatic rollback needs two decisions: whether users are suffering, and whether returning traffic to the stable release is a justified, safe response. Keep incident paging active while evaluating the second question.

## Measure the release and its control

Start with a canary receiving a fixed traffic share and a stable version serving the remainder. Compare both during the same interval, partitioned by immutable revision, region, and a small set of critical operations. Match routing, customer mix, dependencies, and capacity conditions. A canary receiving only expensive requests is a poor control experiment. Google's [canary guidance](https://sre.google/workbook/canarying-releases/) explains why population breakdowns and representative traffic matter.

For each selected cohort, calculate two bad-event fractions:

- **Availability:** failed eligible requests divided by all eligible requests, using the existing SLI's treatment of timeouts and retries.
- **Latency:** eligible requests exceeding the promised duration divided by eligible requests. For a classic histogram measured in seconds, with a 300 ms boundary on every contributing series, this is `1 - bucket_increase(le="0.3") / count_increase`, with identical request filters. [Prometheus histogram documentation](https://prometheus.io/docs/practices/histograms/) describes threshold fractions.

Apply `increase()` to individual counters before summing across instances within each cohort, then divide summed bad events by summed eligible events. Do not average instance percentages. Its extrapolated values are estimates, so a minimum of 1,000 events means estimated window volume. Initialize expected series before traffic and verify scrape coverage; missing error series must not silently become zero. See the [function reference](https://prometheus.io/docs/prometheus/latest/querying/functions/) and [instrumentation guidance](https://prometheus.io/docs/practices/instrumentation/#avoid-missing-metrics).

Check arrival volume at the router as well as completed requests. Normalize by intended traffic share: raw canary RPS should not equal stable RPS at a 10/90 split. Dropped traffic, missing completions, or an incorrect split makes the comparison inconclusive and deserves investigation.

## Separate burn-rate paging from rollback evidence

Burn rate is `bad_fraction / (1 - SLO_target)`. Google's [multiwindow alerting approach](https://sre.google/workbook/alerting-on-slos/#6-multiwindow-multi-burn-rate-alerts) combines longer and shorter windows to identify substantial, ongoing budget consumption. Its paging thresholds are not proof that a release caused the problem.

Use a separately calibrated release policy. The following numbers are illustrative engineering choices, not Google or Argo defaults:

| Condition | Example policy |
|---|---|
| Availability target | 99.9%, giving a 0.001 allowed bad fraction |
| Latency target | 99% within 300 ms, giving a 0.01 allowed bad fraction |
| Windows | 5 minutes and 15 minutes |
| Evidence floor | At least 1,000 eligible requests per version, window, and selected cohort |
| Candidate degradation | Canary burn at least 6x in both windows |
| Control health | Stable burn at most 2x in both windows |
| Minimum absolute difference | Canary minus stable at least 0.005 for errors, or 0.05 for latency, in both windows |
| Persistence | Three consecutive eligible evaluations, one minute apart, for the same SLI and cohort |

Absolute differences avoid unstable percentage comparisons when the baseline is near zero. For example, 0.8% canary errors against 0.1% stable errors means 8x versus 1x burn and a 0.7 percentage-point difference. That satisfies the availability thresholds if both windows and volume checks agree.

One failed request among 1,000 produces only 1x availability burn. A brief spike that fails the longer-window check does not qualify. Overlapping windows and repeated evaluations are correlated; this policy provides persistence, not three independent statistical tests. Replay real traffic to calibrate its detection delay and false-abort rate.

## Make uncertainty an explicit state

After each traffic change has converged, wait for the full longer window plus measured ingestion delay. Evaluate both versions at the same telemetry timestamp. Keep traffic fixed during evaluation: in Argo Rollouts, use an [indefinite canary pause step](https://argoproj.github.io/argo-rollouts/features/canary/#pause-duration), with no automatic promotion while this policy is evaluating or holding. A deployment-writer lock alone does not stop the controller from advancing a timed pause. Reset evidence whenever either revision, the deployment attempt, routing step, or selected cohort changes.

Configure [native AnalysisRuns](https://argoproj.github.io/argo-rollouts/features/analysis/#background-analysis) and other automation so independent abort or promotion paths cannot bypass these safeguards. The custom coordinator's lock does not control those native decisions; competing paths must be disabled or enforce equivalent safeguards.

Use this coordinator logic; names below are application logic, not controller API fields:

```text
every minute, keyed by rollout UID + deployment attempt
                       + candidate revision + stable revision + traffic step:
    if telemetry is stale, missing, nonfinite, incomplete, or invalid:
        clear failure streaks; HOLD
    if traffic is insufficient or cohorts are not comparable:
        clear failure streaks; HOLD
    if rollback eligibility is no longer valid:
        clear failure streaks; HOLD and notify the operator

    for each required SLI and cohort:
        if ALL window, burn, control, and difference checks pass:
            increment that SLI/cohort's failure streak
        else:
            reset that SLI/cohort's failure streak

    if any failure streak reaches 3:
        request one abort for this rollout revision
    else:
        keep observing at the current traffic share
```

Reject impossible counts, such as negative counts or bad events exceeding eligible events. A missing evaluation also resets streaks; duplicate or out-of-order timestamps cannot increment them. A retry of a deployment starts a new attempt, even if its image is unchanged. Bound observation time, for example to 30 minutes after the traffic step. Expiry without a decision clears streaks and holds the release for investigation until a new evaluation attempt is explicitly started. It never means automatic success. Promotion needs its own positive acceptance criteria.

Either availability or latency can justify aborting after all its evidence checks pass. Requiring both to fail would miss genuine errors in a service whose remaining responses are fast. CPU spikes and diagnostic percentiles can trigger investigation without independently authorizing a rollback.

If both versions deteriorate, hold promotion and follow the incident path. A shared dependency may be failing, or the canary may have harmed that dependency. Similar metrics do not prove the canary innocent; this automated policy simply lacks sufficient attribution.

## Execute one bounded recovery action

Before enabling automation, establish rollback eligibility: the stable revision is available, has recovery capacity, and can read current data and messages. Schema changes, irreversible writes, and changed external contracts need a separate recovery plan. Reverting application traffic does not reverse data changes.

For an existing Argo Rollouts canary, the recovery worker can invoke:

```bash
kubectl argo rollouts abort checkout-api \
  --namespace production --context production-cluster --request-timeout 10s
```

[Argo's abort command](https://argoproj.github.io/argo-rollouts/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_abort/) reverses rollout steps and activates the previous ReplicaSet. The desired pod template still describes the new version; leaving the aborted state can retry it. [Argo Rollouts does not rewrite Git](https://argoproj.github.io/argo-rollouts/FAQ/#does-argo-rollouts-write-back-in-git-when-a-rollback-takes-place). After recovery, use the normal release workflow to revert the desired template or roll forward to a fixed version; for GitOps, make that change in Git. An ordinary Argo CD sync does not itself retry an unchanged aborted template.

Require all deployment, promotion, and retry writers, including GitOps automation and operators, to honor the same release lock as the recovery worker. Give each verdict a short validity deadline and reject it if a newer evaluation supersedes it. While holding the lock, immediately recheck the rollout UID, deployment attempt, both revisions, paused step, evidence freshness, and eligibility before each dispatch or retry.

The CLI command has no revision precondition: this read followed by abort is not atomic. Its safety depends on the maintained pause and exclusive writer coordination; if those cannot be guaranteed, hold for an operator instead of running this command automatically. Persist one action record per rollout UID and deployment attempt before dispatch, with bounded retries and a recovery deadline enforced by the worker. The command's request timeout bounds an individual API request, not the whole recovery workflow. After an ambiguous timeout, inspect rollout state before retrying. Restrict the worker's cluster permissions to its intended workload, and keep the release lock until recovery is verified or handed to an operator.

Verify traffic distribution, stable readiness, and user-facing SLIs after aborting. A successful command is not proof of recovery. Record the measurements and reason, prevent automatic retries of the rejected release, and escalate if impact continues.

## Replay the cases that should change the decision

Before enabling mutation, run the policy in observation mode against healthy releases, sustained canary-only errors, latency-only regressions, a single spike, low traffic, telemetry loss, and shared dependency failures. Also inject duplicate evaluations and delayed verdicts from an old revision.

The expected results are concrete: sustained eligible regressions request one abort; ambiguous evidence holds; duplicate or stale decisions cause no extra action. Test the actual traffic restoration separately in staging, including whether the stable version can serve data written by the candidate.
