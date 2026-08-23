# Defining the MTTR Clock: Which Start and End Events Count?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTTR, Incident Management, SRE, Reliability Metrics, SLO

Description: Define explicit MTTR start and end events so recovery reports measure customer impact, response work, or workflow latency consistently.

---

MTTR is not one universally defined metric. The acronym is used for mean time to repair, recover, restore, or resolve, and those words imply different endpoints. A duration from alert creation to ticket closure can be useful, but it is not the same thing as customer-impact duration. A credible report therefore starts by naming the interval, not by choosing a dashboard label.

## Name Every Event Before Choosing the Clock

Use a small event vocabulary and retain all of the timestamps:

| Event | Definition |
| --- | --- |
| `impact_started_at` | The earliest evidence that the defined SLI left its acceptable range |
| `detected_at` | Monitoring or a person first detected the condition |
| `declared_at` | An incident record was created |
| `acknowledged_at` | A responder accepted ownership |
| `mitigated_at` | The immediate harmful effect was controlled |
| `restored_at` | The measured service returned to its stated acceptable condition |
| `resolved_at` | Incident command declared the response complete |
| `closed_at` | Administrative follow-up allowed the ticket to close |

These events can occur close together, but they are not interchangeable. OneUptime, for example, records an incident declaration and state timeline; its seeded lifecycle includes identified, acknowledged, and resolved states. PagerDuty likewise has triggered, acknowledged, and resolved incident states. Neither product state automatically proves when users first suffered or when an SLI recovered.

## Define Metrics That Answer Different Questions

Let \(t_i(x)\) be the timestamp of event \(x\) for incident \(i\). Useful durations include:

\[
T_{impact,i} = t_i(restored) - t_i(impact\_started)
\]

\[
T_{response,i} = t_i(mitigated) - t_i(detected)
\]

\[
T_{workflow,i} = t_i(closed) - t_i(declared)
\]

The mean for a cohort of \(n\) completed incidents is \(\sum_i T_i/n\). Always publish the selected definition beside the result, such as mean impact-to-restoration time, rather than publishing MTTR alone.

Pick the interval from the decision it supports:

- Use impact start to restoration when evaluating user harm and service resilience.
- Use detection to mitigation when improving alerting and incident response.
- Use declaration to resolution when inspecting the incident-management workflow.
- Use resolution to closure to find administrative backlog, not to describe reliability.

A team can report all four. It should not silently replace one with another when a data source is easier to query.

## Make Restoration a Testable Condition

Ticket status is a human assertion. Restoration should be based on a documented service condition. For a request-based SLO, that might mean the rolling success ratio and latency SLI are back within thresholds for a ten-minute stabilization window. For a batch system, it might mean processing is current and the backlog is below a limit. Record both the first healthy sample and the end of the stabilization window so analysts can reproduce the policy.

A fixed stability window avoids declaring victory on a single green probe. It also makes comparisons fair: changing the window from five to fifteen minutes changes the metric even when the underlying response does not change.

Mitigation can precede restoration. Disabling a broken feature may stop new damage at 10:18, while queues drain and the full SLI recovers at 10:31. Preserve both events rather than forcing one timestamp to serve two meanings.

## Handle Delayed Discovery Without Rewriting History

Suppose logs show impact began at 09:02, an alert fired at 09:07, a responder acknowledged it at 09:10, traffic was rerouted at 09:24, service stabilized at 09:29, and the ticket closed at 12:00.

| Measure | Result |
| --- | ---: |
| Impact to restoration | 27 minutes |
| Detection to mitigation | 17 minutes |
| Detection delay | 5 minutes |
| Restoration to closure | 151 minutes |

Backfill `impact_started_at` when later evidence establishes 09:02, but keep provenance: source, observed timestamp, author, update timestamp, and confidence. Do not overwrite the alert timestamp. Backfilling changes an estimate; an audit trail explains why a historical report moved.

When the impact start is unknown, store it as unknown. Substituting declaration time creates a downward bias because slowly detected incidents appear shorter. A report can show impact-duration coverage, for example 38 of 45 incidents had a defensible impact start, alongside response durations for the full cohort.

## Write a Versioned Measurement Contract

A compact contract should specify:

1. The population, such as production customer-impacting incidents for one service.
2. Exact start and end event semantics.
3. Time zone and timestamp precision; UTC instants are safest for storage.
4. Rules for partial restoration, flapping, reopens, missing values, and maintenance.
5. Required stability window and SLI evidence.
6. Aggregates to publish: count, median, p75, p90, mean, and maximum.
7. A version and effective date.

Store the definition version on each derived row. If policy version 2 changes the end from incident resolution to SLI restoration, either recompute all history consistently or draw a visible break in the trend. Splicing definitions into one line produces a process improvement that may exist only in the query.

A minimal completed-incident table might contain:

```sql
incident_id, service_id, severity,
impact_started_at, detected_at, acknowledged_at,
mitigated_at, restored_at, resolved_at, closed_at,
measurement_policy_version, timestamp_provenance
```

Derive durations in the warehouse after validating event order. Keep raw events immutable so a correction does not destroy source evidence.

## Avoid Common Clock Errors

- Do not use a live age gauge as a completed-incident duration. Open incidents are right-censored, not zero-duration recoveries.
- Do not mix minutes and seconds. Store a canonical unit and attach the unit to exported fields.
- Do not infer customer impact solely from severity. Severity is a classification; impact should come from SLIs or explicit evidence.
- Do not stop the impact clock merely because an alert auto-resolved. Verify the restoration condition and flapping policy.
- Do not compare teams that use different start events, stability windows, or inclusion rules.

Google SRE material treats postmortems as records of impact, mitigation or resolution actions, causes, and follow-up work. That structure supports multiple timestamps rather than one overloaded status. DORA now uses the more specific failed deployment recovery time for deployment-caused failures, further illustrating why the population and boundaries matter.

## Official Documentation

- [DORA software delivery performance metrics](https://dora.dev/guides/dora-metrics/)
- [Google SRE Workbook: Incident Response](https://sre.google/workbook/incident-response/)
- [Google SRE: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
- [OneUptime incidents overview](https://oneuptime.com/docs/en/incidents/index)
- [OneUptime incident states and severities](https://oneuptime.com/docs/en/incidents/states-and-severities)

## Conclusion

An MTTR number is interpretable only when its clock is explicit. Retain impact, detection, acknowledgment, mitigation, restoration, resolution, and closure as separate events; choose the interval that answers the decision at hand; and publish the cohort, statistic, and policy version with every result.
