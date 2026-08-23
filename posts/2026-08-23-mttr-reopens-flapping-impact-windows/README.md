# MTTR Across Reopens, Flapping Recoveries, and Multiple Impact Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTTR, Incident Analytics, SRE, Flapping Alerts, Reliability Metrics

Description: Calculate defensible recovery durations by separating incident episodes from merged customer-impact windows and documenting reopen rules.

---

An incident can turn green, regress, reopen, and affect users in several disjoint intervals. Subtracting the first start from the final close is sometimes useful, but calling that number MTTR hides healthy gaps and makes tool behavior determine the result. Model the event sequence first, then calculate the particular duration your question needs.

## Separate the Incident Record from Impact Windows

Treat the incident as an episode with one or more impact windows. The formulas below assume overlapping source windows have been merged into disjoint, time-ordered windows:

\[
W_i = \{[s_{i1}, e_{i1}), [s_{i2}, e_{i2}), \ldots\}
\]

Each half-open interval begins when the defined service condition becomes unacceptable and ends when it returns to acceptable. Half-open intervals avoid counting an endpoint twice when windows touch.

Three measurements are then available:

\[
T_{span,i} = \max_j(e_{ij}) - \min_j(s_{ij})
\]

\[
T_{impact,i} = \left|\bigcup_j [s_{ij}, e_{ij})\right|
\]

\[
T_{final\ recovery,i} = \max_j(e_{ij}) - \max_j(s_{ij})
\]

The episode span includes healthy gaps. Unioned impact duration counts only time under impact and prevents overlapping signals from double-counting the same minute. Final recovery time describes the last regression only. None is universally correct; label the one you report.

## Define a Stable-Recovery Rule

An alert changing from firing to normal is evidence, not necessarily restoration. Define recovery with an SLI condition plus a stability interval. For example:

> Restored means the checkout availability SLI is at least 99.5 percent and p95 latency is below 800 ms for ten continuous minutes.

If the signal fails again during those ten minutes, confirmed recovery has not been established. Keep the incident episode open, but do not relabel healthy samples as customer impact: end the measured impact window at `candidate_healthy_at` and open another window when the SLI fails again. Store both `candidate_healthy_at` and `restored_at` to show the stabilization cost.

This is similar to using a Prometheus alert rule with a `keep_firing_for` interval to reduce flapping, but the metric policy should be defined independently of any particular alert implementation. Changing an alert rule must not silently rewrite historical incident semantics.

## Choose When a Regression Is a Reopen

Write an episode-linking rule before analyzing data. A practical rule can combine time and causality:

- Link a regression to the same episode when it occurs within a fixed horizon, affects the same service and SLI, and has the same remediation context.
- Create a new incident when there is evidence of a new initiating event, a different failure mode, or a long healthy period beyond the horizon.
- Allow a human override, but require a reason and retain the automatic suggestion.

Do not use ticket identity alone. Some tools reopen the original ticket; others create a new alert or incident. Analytics should produce the same answer from the same operational facts.

The linking horizon is a policy choice, not an industry constant. A five-minute horizon may suit a fast request path; a daily batch process may need hours. Test how sensitive results are to plausible horizons.

## Worked Example

Consider these service states in UTC:

| Event | Time |
| --- | --- |
| Impact starts | 10:00 |
| Candidate recovery | 10:18 |
| Ten-minute stability completes | 10:28 |
| Impact returns | 10:35 |
| Candidate recovery | 10:47 |
| Stability completes | 10:57 |
| Ticket closes | 12:10 |

The measured customer-impact windows are `[10:00,10:18)` and `[10:35,10:47)`. Unioned impact is 30 minutes, and the span from first impact to the final healthy sample is 47 minutes. Confirmation completes at 10:28 and 10:57. A separate impact-to-final-confirmed-recovery span is therefore 57 minutes, but the healthy stabilization intervals are not customer-impact minutes.

Both 30-minute unioned impact and 57-minute impact-to-confirmed-recovery are reproducible measures, but they answer different questions. Name the selected primary series and publish whether it includes stabilization. Ticket-close duration, 130 minutes, is workflow latency and should remain separate.

## Merge Intervals Before Aggregating

Multiple monitors may describe the same customer impact. Merge overlapping and touching intervals per incident and measurement scope before taking a sum. The algorithm is straightforward:

```text
sort windows by start
current = first window
for each next window:
  if next.start <= current.end:
    current.end = max(current.end, next.end)
  else:
    emit current
    current = next
emit current
```

Run this on UTC instants. Keep the original windows and their evidence IDs so an analyst can trace each merged interval to an SLI, alert, status update, or manual correction.

If the goal is service-level impact, merge all qualifying symptoms of that service. If the goal is product-level customer impact, merge across services only after mapping them to the same product SLI. The scope belongs in the metric name.

## Treat Open Windows as Censored

At report cutoff, an incident may still be active or awaiting the stability threshold. Its final duration is unknown. Excluding every open incident biases the cohort toward faster recovery, while treating it as zero is plainly wrong.

For a simple operational report, show:

- completed-episode count and distribution;
- open-episode count and current age;
- longest open age;
- number awaiting stability confirmation.

More formal survival analysis can include right-censored episodes, but do not mix its estimates with an arithmetic mean without explaining the method.

## Store a Reconstructable State Model

Keep append-only facts such as:

```json
{
  "incident_id": "INC-42",
  "event_type": "sli_breached",
  "occurred_at": "2026-08-23T10:35:00Z",
  "observed_at": "2026-08-23T10:35:18Z",
  "source": "prometheus",
  "source_event_id": "...",
  "policy_version": 3
}
```

Deduplicate on the source and source event ID, not just timestamp. Record late arrival separately from occurrence. Derive windows in a versioned job, then test invariants: every end follows its start, merged windows never overlap, and completed episodes have no open window.

OneUptime's state timeline records when an incident enters each state and for how long. PagerDuty incident log entries provide another source of lifecycle evidence. Neither substitutes for the SLI windows, but both are valuable when constructing the episode and auditing manual actions.

## Official Documentation

- [Prometheus alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus querying functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [OneUptime incident states and timelines](https://oneuptime.com/docs/en/incidents/states-and-severities)
- [PagerDuty REST API](https://developer.pagerduty.com/api-reference/)

## Conclusion

Reopens and flapping are modeling problems, not spreadsheet exceptions. Preserve distinct impact windows, define stable recovery and episode-linking rules, merge overlaps before summing, and report episode span separately from unioned impact. That produces an MTTR series whose behavior is controlled by an explicit policy rather than by whichever ticket happened to reopen.
