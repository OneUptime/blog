# What Baseline Do You Need Before Changing a Process?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Continuous Improvement, Baselines, Process Measurement, Experimentation, Flow Metrics, Statistical Process Control

Description: Build a decision-ready process baseline with frozen definitions, trustworthy event coverage, distributions, segments, and enough history to expose normal variation.

---

A baseline is not “last month's average.” It is a reproducible description of the current process that is good enough to distinguish an improvement from normal variation, measurement drift, or a changed mix of work.

The baseline you need depends on the decision. A reversible two-week meeting experiment may need a few cycles plus qualitative evidence. A global change to a high-volume payment process may require validated measurements, seasonal coverage, stable segmentation, and a formal control approach. More data is not automatically better; data collected under obsolete definitions can make the comparison worse.

## Begin with the Decision

Write the improvement hypothesis before choosing the baseline window:

```yaml
population: "normal production changes for checkout-api"
problem: "changes wait too long for production verification"
intervention: "add an automated verification environment"
expected: "p85 ready-to-verified time falls below 40 hours"
guardrails:
  - "change fail rate does not worsen"
  - "verification support toil stays below 3 hours/week"
decision_date: "after 6 post-change weeks"
```

This tells you what pre-change evidence is needed: timestamps for the same start and finish events, enough observations to estimate the tail, failure outcomes, toil, and context about work mix. It prevents “collect everything” instrumentation and reduces the temptation to select a favorable metric after results appear.

## Freeze the Operational Definitions

For each measure, record:

- population and exclusions;
- numerator and denominator;
- exact start and finish events;
- clock and time-zone treatment;
- unit and aggregation;
- source system and query version;
- late, missing, duplicated, and retried event handling;
- grouping dimensions;
- observation window;
- data owner.

For example:

```text
Cycle time = production_verified_at - implementation_started_at

Population: normal checkout-api changes whose implementation_started_at falls
inside the window. One logical change remains one item across retries. Emergency
incident mitigations and scheduled compliance releases are reported separately,
not deleted. Times are stored in UTC. Items confirmed unfinished at the window
cutoff are right-censored and contribute to work-item-age reporting. Missing
finish events are investigated rather than assumed to indicate open work.
```

Do not silently change these rules after the intervention. If a correction is necessary, version the definition and recompute both periods where possible.

Google's SRE guidance recommends standardized indicator definitions that specify aggregation intervals, measurement frequency, included requests, acquisition method, and related conditions. The same discipline applies to process events.

## Validate the Measurement System

A dashboard can be precise and wrong. Before using it as a baseline, reconcile samples against source records and the people doing the work.

Check:

1. **Coverage:** What proportion of eligible work has all required events?
2. **Identity:** Can retries, reopened items, rollbacks, and split work create duplicates?
3. **Timestamp meaning:** Is “started” a status change, first human activity, or automated event?
4. **Clock quality:** Are sources synchronized, and can import time be mistaken for event time?
5. **Bypasses:** Does urgent or manual work avoid the instrumented path?
6. **Classification:** Would two people label the same failure or work type consistently?
7. **Query reproducibility:** Can another analyst get the same result from the saved definition?

ASQ's measurement-system material emphasizes that the complete measurement process includes instruments, procedures, people, environment, standards, and assumptions. Software telemetry still has a measurement system even when there is no physical gauge.

Publish coverage beside the result. “p85 cycle time is 4.2 days for 96% of 413 eligible items” is more honest than a number that quietly excludes the hardest 4%.

## Capture the Distribution, Not Only the Mean

Process time is usually skewed. A few long waits may carry most customer harm while the average appears acceptable. Store or report:

- sample count;
- median;
- relevant high percentiles such as p85 or p95;
- minimum and maximum, with investigated extremes;
- histogram or empirical distribution;
- proportion meeting a service expectation;
- age distribution for unfinished work.

Google SRE notes that percentiles reveal different parts of a distribution and warns against assuming normally distributed data. Averages can hide tail behavior. The Kanban Guide defines cycle time, work item age, throughput, and work in progress as its four mandatory flow metrics; together they prevent a completed-item baseline from ignoring work still stuck in the system.

If sample volume is small, display every point or use weekly aggregates with the underlying count. Do not report p99 from 18 observations as though it were stable. Use uncertainty intervals or describe the range of plausible effects.

## Include Outcomes and Diagnostics

An improvement baseline needs the outcome the team wants to change and diagnostics that explain why it might change.

For a delivery workflow:

| Level | Example baseline measures |
| --- | --- |
| Customer or service outcome | Availability, escaped defects, request completion |
| Delivery outcome | Change lead time, deployment frequency, failed deployment recovery time, change fail rate, deployment rework rate |
| Flow diagnostic | Queue time by state, WIP, work item age, throughput, blocked time |
| Process diagnostic | Manual steps, handoffs, retry rate, automation coverage |
| Sustainability guardrail | Toil, after-hours work, interruptions, well-being survey |

DORA's current delivery model contains both throughput and instability measures. Improving speed while increasing rework is not an unqualified improvement. Choose only the measures relevant to the hypothesized mechanism; a scorecard with 60 metrics makes the decision ambiguous.

## Segment Before the Change

A changed work mix can mimic an improvement. Define meaningful cohorts in advance:

- service or product;
- work-item type and class of service;
- normal versus emergency change;
- change-size band;
- region or platform when the workflow differs;
- team only where ownership and process are truly comparable;
- customer segment when outcome expectations differ.

Suppose median cycle time falls after rollout, but the post-change period contains far more small configuration changes. The aggregate moved even if each comparable cohort did not. Report the aggregate for overall impact and stable segments for explanation.

Avoid excessive slicing. Tiny cohorts create noisy conclusions and privacy risk. Select segments tied to a plausible mechanism, and pool or suppress groups that are too small.

## Choose a Window That Represents the Process

There is no universal requirement for four weeks, 30 data points, or 100 observations. Choose the window from process cadence, variation, and decision risk.

A useful baseline should usually include:

- enough completed and unfinished items to show typical and tail behavior;
- multiple normal planning or release cycles;
- routine variation in weekdays, staffing, and demand;
- known periodic events relevant to the process;
- a stable measurement definition;
- no major structural change that makes old data non-comparable.

For a weekly release, two weeks supplies only two cycles. For a high-volume API, one day may contain millions of requests but miss payday traffic or a weekly batch. Calendar length and event count both matter.

Start with 8–12 weeks for many team-level delivery flows as a pragmatic hypothesis, then inspect whether it covers representative conditions. This is not a standard. Extend for quarterly seasonality or rare failures; shorten when a platform migration makes older data irrelevant. Document why the window was selected.

## Annotate Instability and External Events

Plot the metric through time before summarizing it. Mark:

- incidents and degraded dependencies;
- holidays, leave, and staffing changes;
- release freezes;
- product launches or demand spikes;
- policy and tooling changes;
- telemetry outages;
- organizational handoffs;
- unusually large or urgent work.

NIST's process-control guidance describes comparing current behavior with historical behavior and using time-ordered charts to distinguish expected and nonrandom patterns. Do not apply manufacturing control limits mechanically to sparse, dependent software work. Use the principle first: understand stability and variation before declaring that two averages differ.

If the baseline contains a clear structural break, do not average across it. Choose the current regime, model the regimes separately, or acknowledge that a clean baseline is unavailable and use a phased pilot or concurrent comparison.

## Preserve Qualitative Evidence

Numbers locate patterns; people explain the work. Capture structured observations:

- interviews across roles and shifts;
- direct observation of representative work items;
- annotated process maps;
- recurring workaround and exception logs;
- a short, consistently worded survey;
- examples of customer or operator impact.

Record collection methods and response coverage. Quotes should be anonymized where necessary. Do not turn a five-person survey into a precise organization-wide score, but do not discard repeated evidence just because telemetry lacks the event.

## Create a Baseline Snapshot

Store a reproducible artifact in the team's analytics or documentation system:

```yaml
baseline_id: checkout-verification-v1
population_definition: query://delivery/checkout-normal-changes@8f21c9a
window: 2026-05-11/2026-08-02
eligible_items: 438
complete_event_coverage: 0.964
metrics:
  cycle_time_hours: {p50: 31, p85: 67, p95: 104}
  throughput_per_week: {median: 34, range: [27, 41]}
  open_item_age_hours: {p85: 58}
  change_fail_rate: 0.081
annotations:
  - "release freeze 2026-06-15/2026-06-19"
owner: delivery-analytics
```

The values are illustrative. Link the query, schema, dashboard version, and raw-data retention policy. Protect personal and customer data; a process baseline rarely needs individual performance ranking or raw identifiers.

## Know When to Start Anyway

Waiting for a perfect baseline can prolong known harm. Act immediately when safety, security, legal, or severe reliability risk requires it. Preserve whatever pre-change evidence exists, document why randomization or delay was unacceptable, roll out in stages where possible, and measure prospective results.

You can also begin a low-risk reversible pilot while the broader baseline matures. The evidentiary burden should match the decision: adopting a harmless meeting prompt does not need the same proof as changing authentication or financial reconciliation.

## Official Documentation

- [DORA software delivery performance metrics](https://dora.dev/guides/dora-metrics/)
- [The Kanban Guide](https://kanbanguides.org/the-kanban-guide/)
- [Google SRE: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [ASQ: Measurement System Analysis](https://asq.org/training/measurement-system-analysis--msa--msaasq)
- [NIST: Process Control Techniques](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc12.htm)
- [NIST: What Are Control Charts?](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm)
- [NIST: Assessing Process Stability](https://www.itl.nist.gov/div898/handbook/ppc/section4/ppc45.htm)

## Conclusion

Build the baseline backward from the improvement decision. Freeze operational definitions, validate event coverage and classification, show distributions and unfinished work, segment by plausible mechanisms, and choose enough representative history to reveal normal variation. Preserve context, qualitative evidence, and query versions so the comparison can be reproduced. The right baseline is not the largest dataset; it is the smallest trustworthy description of the current process that lets the team decide whether a change helped, harmed, or merely coincided with a different month.
