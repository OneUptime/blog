# How to Dashboard Deployment Rework Rate with Change Failure Rate and Recovery Time Without Gaming the Numbers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DORA, DevOps, Dashboard, Software Delivery, Data Quality

Description: Build an auditable dashboard that aligns deployment rework, change failure, and recovery cohorts while exposing uncertainty and incentives to game the numbers.

A falling rework percentage can mean fewer emergency repairs. It can also mean more planned deployments, delayed fixes, or missing incident links. Three green cards cannot distinguish those explanations. Build the dashboard around a shared deployment population and a drill-down that explains every numerator.

## Give the Three Panels Different Jobs

DORA's deployment rework rate counts unplanned deployments resulting from production incidents. Change fail rate, commonly called change failure rate, counts deployments requiring immediate intervention. Failed deployment recovery time measures recovery from those failed deployments. [DORA metric definitions](https://dora.dev/guides/dora-metrics/).

Use the existing [rework calculation guide](https://oneuptime.com/blog/post/2026-11-19-calculate-dora-deployment-rework-rate/view) to normalize events. The design below is a local reporting contract, not a DORA-mandated schema or aggregation method.

Materialize one row per logical production deployment for one service:

```text
deployment_id, service_id, deployed_at
rework_state: yes | no | pending
failure_state: yes | no | pending
classification_evidence, definition_version, recorded_at
```

Count actual production changes, including qualifying rollbacks and repairs. Deduplicate notifications and rollout steps; exclude attempts that never change production. Keep deployments that later fail in the denominator. Each classification needs its own pending state: knowing that a deployment repaired an incident does not establish whether it subsequently failed.

Store incident links separately. Several links must not create several copies of the deployment in a metric. A timestamp-nearby deployment is a candidate for attribution, not proof of responsibility.

## Make the Time Selector Mean One Thing

For the delivery dashboard, select deployments by service and `deployed_at` within a half-open UTC interval, such as `[2026-11-01, 2026-11-08)`. Both percentage denominators use that exact population. Rework is attributed to the repair deployment's date; failure is attributed to the failed deployment's date.

Attach recovery observations to confirmed failed deployments in this same cohort. Do not additionally require the failure, recovery, or incident ticket to fall inside the selected interval.

For example:

```text
November 7 23:50 UTC: D42 changes production
November 7 23:55 UTC: verified service degradation begins
November 8 00:20 UTC: D43 deploys an unplanned repair
November 8 00:35 UTC: the defined recovery condition is met
```

D42 contributes a failure and a 40-minute recovery observation to the November 1–7 deployment cohort. D43 contributes rework to the following cohort. Similarly, a repair this week can address an incident from last month.

Use first verified deployment-caused impairment and verified restoration as the local recovery endpoints. Document stability and reopen rules. Resolve multiple incident links into a reviewed recovery record per failed deployment before aggregation; never calculate one duration per joined ticket.

Publish an “as of” timestamp. Later classification or restoration evidence can revise earlier cohorts. Retain snapshot versions and mark revised periods. Recent cohorts remain provisional under the team's review policy.

An operational chart of recoveries completed this week is useful, but has a different population. Label it separately. Broad incident MTTR also includes failures unrelated to deployments; DORA deliberately narrowed its recovery measure to production-change failures. [DORA metric history](https://dora.dev/insights/dora-metrics-history/).

## Show Counts and Missing Evidence Beside the Rates

Build the dashboard in three rows:

| Row | Display |
| --- | --- |
| Shared context | Service, production scope, UTC window, definition version, snapshot time, deployment count, ingestion freshness |
| Delivery outcomes | Rework count/rate, failure count/rate, recovery durations and completion coverage |
| Explanation | Deployment drill-down, pending classifications, open recoveries, missing timestamps, SLO impact, deployment frequency, change lead time |

Let `D` be all selected deployments, `R` confirmed rework, `F` confirmed failures, and `Ur` and `Uf` their respective pending counts. When collection is complete but classification is pending, display possible ranges:

```text
rework range = [100 × R/D, 100 × (R + Ur)/D]
failure range = [100 × F/D, 100 × (F + Uf)/D]
```

With `D=20`, `R=4`, `Ur=2`, `F=2`, and `Uf=1`, show **rework 20–30%: 4 confirmed, 2 pending**, and **failure 10–15%: 2 confirmed, 1 pending**. These are classification bounds, not confidence intervals. They cannot account for deployments absent from the registry. Flag incomplete ingestion separately.

Once pending counts reach zero, show exact fractions and percentages. With no deployments, show “no deployments,” not 0%. One reclassification among twenty deployments moves a rate five percentage points; retain those counts in every tooltip.

For confirmed failures, reconcile mutually exclusive counts of valid completed recoveries, ongoing recoveries with a known start, and records with unusable timestamps. Show completed durations plus open ages. If one of two failures recovered in 12 minutes and the other remains open, “12 minutes, one completed; one open” is honest. An unqualified 12-minute recovery headline hides unfinished work. Never insert zero for an open or missing duration.

Use raw points for sparse recovery cohorts. As completed observations accumulate, distributions and percentiles can describe completed recoveries; label that population and keep completion coverage visible. Open ages are right-censored observations: elapsed time is known, but the eventual recovery duration is not. [NIST censoring guide](https://www.itl.nist.gov/div898/handbook/apr/section1/apr131.htm). Avoid automatic green/red verdicts based on a tiny sample.

## Keep Overlap and Tradeoffs Visible

A repair can itself fail, contributing to both numerators. Rework and failure percentages therefore cannot be stacked as mutually exclusive categories or added into a “bad deployment rate.” The drill-down should expose both classifications and their evidence.

Review movements together:

| Pattern | Evidence to inspect before declaring improvement |
| --- | --- |
| Rework rises, recovery falls | More incremental repairs, repeat attempts, changed labeling, and actual customer impact |
| Rework falls, recovery rises | Deferred remediation, batching, unresolved incidents, and repair deployment history |
| Both rates fall, deployment count rises | Absolute failure and repair counts; denominator growth may explain the change |
| Recovery falls, open ages rise | Completed-case selection may conceal the hardest recoveries |

These are investigation prompts, not causal conclusions. Compare each service with its own history and annotate freezes, migrations, and definition changes. Preserve service-level views instead of averaging percentages across unrelated services. DORA cautions against disparate comparisons, single-metric goals, and competitive rankings. [DORA measurement pitfalls](https://dora.dev/guides/dora-metrics/).

## Make the Review Harder to Game

Keep an audit trail for classification edits, deployment exclusions, and corrected recovery timestamps. Sample both included and excluded rows. A sharp increase in “planned” repairs or unexplained deployment splitting deserves review, not an immediate reward.

Pair the dashboard with the service's SLO impact and error-budget policy; lower failure and rework rates do not establish lower customer harm. Google SRE's example policy uses error budgets to guide reliability investment rather than punish teams. [SRE error-budget policy](https://sre.google/workbook/error-budget-policy/).

Do not make responders choose between deploying the next safe repair and protecting their rework score. Use the incident review to select preventive work, with an owner and evidence of completion. Blameless postmortems depend on people being willing to report what happened. [Google SRE postmortem guidance](https://sre.google/sre-book/postmortem-culture/).
