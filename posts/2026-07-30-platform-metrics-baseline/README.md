# Establishing a Platform Metrics Baseline Before You Launch or Migrate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Platform Engineering, Baseline, Developer Experience, DORA, Measurement, Migration

Description: Build a defensible pre-launch baseline by freezing definitions, capturing eligible demand, and separating normal operations from migration effects.

---

The easiest time to measure the old developer experience is before replacing it. Once a platform migration starts, teams change their behavior, support staff prepare workarounds, and the organization begins explaining the new model. A baseline assembled afterward is usually a reconstruction of a moving target.

A useful baseline is more than a screenshot of several dashboards. It records who performs a workflow, what qualifies as a start and a success, how long the workflow takes, how it feels, how much manual work it creates, and how reliable its measurement is.

## Define the Decision First

State what the baseline will help evaluate:

> We will determine whether the new service-onboarding path lets application teams reach a verified first production deployment sooner, with fewer manual handoffs, while maintaining change stability and policy compliance.

This produces a bounded set of measures:

- end-to-end onboarding time;
- time to first production deployment;
- manual handoffs and approvals;
- self-service completion rate;
- developer effort and clarity;
- failed deployment and rework rates;
- policy failures and exceptions.

Without an explicit decision, teams often collect everything that is easy and discover later that none of it represents the promised outcome.

## Inventory the Current Paths

Map all ways the task is completed today:

- official ticket or request form;
- scripts maintained by application teams;
- direct cloud-console changes;
- a previous platform;
- chat-based requests;
- exceptions handled by a specialist;
- work that is abandoned or never requested.

The denominator is eligible demand, not only activity visible in the future platform. If 100 teams need an environment but only 40 use the official request queue, using those 40 as the whole baseline hides 60 teams and their workarounds.

For each path, record:

| Field | Example |
| --- | --- |
| Eligible population | Services requiring a nonproduction environment |
| Start | Complete request enters any recognized path |
| Ready | Credentials work and required resources pass verification |
| Exclusions | Training sandboxes and disaster-recovery tests |
| Owner | Platform operations |
| Evidence | Request system, infrastructure events, verification probe |

## Freeze a Metric Dictionary

Definitions must survive the launch. Write a small data contract for every primary measure:

```text
Metric: environment_provisioning_time
Population: eligible environment requests
Start: first accepted request timestamp
End: successful readiness verification timestamp
Unit: elapsed hours
Clock: continuous elapsed time
Percentiles: p50, p75, p90
Exclusions: cancelled requests before work begins
Timeout: requests open after 30 days reported separately
Owner: platform analytics
Schema version: 1
```

Decide whether waiting for requester information and approval time are included. Usually they should be visible as separate stages even when the headline measure uses end-to-end elapsed time.

Do not redefine success from “resource exists” before launch to “resource is usable” after launch. That guarantees a misleading improvement.

## Choose a Representative Window

The right duration depends on task frequency and business cycles. Capture enough observations to cover:

- normal release weeks;
- on-call rotations;
- month- or quarter-end controls;
- common workload types;
- both new and experienced developers;
- a reasonable number of tail cases.

Annotate abnormal periods such as:

- incident response;
- code freezes;
- reorganization or staffing changes;
- cloud-provider disruption;
- large product launch;
- new compliance rule;
- mass migration preparation.

Do not automatically delete those periods. Report results with and without a truly exceptional event and explain the choice.

## Capture Five Kinds of Baseline

### 1. Demand and population

Count eligible services, teams, requests, and workflow opportunities. Record which populations are not observable.

### 2. Workflow behavior

Measure starts, stage transitions, success, abandonment, retries, duration, queue time, and manual handoffs. Report distributions rather than only averages.

### 3. Developer experience

Ask stable questions about recent named tasks: knowing where to start, clarity of feedback, perceived effort, need for routine help, and intention to reuse the path.

### 4. Delivery outcomes

Use DORA’s current software delivery measures at the application or service level: change lead time, deployment frequency, failed deployment recovery time, change fail rate, and deployment rework rate. Preserve the service boundary because blending unlike applications can be misleading.

### 5. Reliability and risk

Record workflow availability and latency, failed or stuck operations, cleanup failures, security or policy exceptions, and incidents caused by the current process.

A baseline should include guardrails as well as hoped-for improvements.

## Establish Instrumentation Quality

For every source, measure:

- percentage of eligible workflows observed;
- duplicate event rate;
- missing start or end timestamps;
- clock and time-zone consistency;
- unmatched deployment and commit records;
- survey response rate;
- lag between event occurrence and availability;
- known manual paths with no telemetry.

Create a reconciliation sample. Select a small set of real workflows and follow each one across ticket, platform, deployment, policy, and verification systems. If the event stream cannot reproduce what happened, repair it before treating its aggregate as a baseline.

Missing does not mean zero. An absent completion event may represent failure, an integration bug, or a workflow completed outside the tracked path.

## Segment Before Aggregating

At minimum, consider:

- workflow type;
- standard versus exception path;
- workload or service class;
- new versus established team;
- region or environment class;
- frequency of use;
- current tool or path.

A migration that starts with simple stateless services will appear successful if compared with a baseline containing every complex legacy workload. Preserve cohort definitions and compare the same eligible population.

## Record the Migration Boundary

Maintain a rollout registry:

```text
team_id
eligible_date
invited_date
first_use_date
migration_complete_date
platform_version
exception_status
```

These dates answer different questions. “Invited” is not “adopted,” and “first use” is not “fully migrated.”

Define analysis periods:

1. stable pre-launch baseline;
2. preparation or contamination period;
3. migration and learning period;
4. established-use period.

Do not count the learning period as steady-state platform performance without labeling it.

## Pre-Register Success and Guardrails

Before launch, agree on direction and materiality:

```text
Primary outcome:
  p75 time to verified first deployment falls from baseline

Supporting outcomes:
  manual handoffs per service fall
  survey clarity improves
  successful self-service rate rises

Guardrails:
  change fail rate does not materially worsen
  policy exception rate does not rise
  platform remains within its error budget
```

Not every threshold needs to be a formal statistical test, but it must be chosen before the team sees favorable or unfavorable results.

## Preserve a Baseline Snapshot

Store:

- metric definitions and schema versions;
- exact queries or transformation versions;
- source-system coverage;
- cohort membership;
- observation dates;
- distributions and sample counts;
- survey instrument and response rate;
- annotations for exceptional events;
- unresolved data-quality limitations;
- the success decision agreed before launch.

Keep raw access controlled, but make aggregate definitions and results reviewable. A chart that cannot be reproduced later is not a durable baseline.

## Avoid Common Baseline Traps

- **Starting too late:** migration communications already change behavior.
- **Measuring only official usage:** workarounds and abandoned demand disappear.
- **Using a single week:** normal operational variation dominates the result.
- **Comparing different cohorts:** easy early adopters replace a mixed legacy population.
- **Changing definitions:** “done” becomes easier after launch.
- **Ignoring reliability:** speed improves while failures or exceptions rise.
- **Ranking teams:** contextual delivery measures become performance targets and invite gaming.
- **Overbuilding instrumentation:** measurement delays the improvement it was meant to guide.

## A Minimum Viable Baseline

If time is short, capture:

1. one high-value workflow and its eligible population;
2. one end-to-end duration distribution;
3. success, abandonment, and manual-handoff rates;
4. three stable developer-experience questions;
5. application-level delivery and risk guardrails;
6. cohort and rollout dates;
7. coverage and missing-data notes.

That small, honest baseline is more useful than a sophisticated dashboard built from unstable definitions.

A platform baseline is a contract with your future analysis. Define the population, workflow boundaries, evidence, and limitations while the old system still exists. Then the launch can be evaluated against what developers actually experienced—not what the organization later remembers.

## Official Documentation

- [DORA: DORA’s software delivery performance metrics](https://dora.dev/guides/dora-metrics/)
- [DORA: Platform engineering](https://dora.dev/capabilities/platform-engineering/)
- [DORA: Choosing measurement frameworks to fit your organizational goals](https://dora.dev/research/2025/measurement-frameworks/)
- [Microsoft Learn: Start your platform engineering journey](https://learn.microsoft.com/en-us/platform-engineering/journey)
