# Measuring MTTR When Service Is Only Partially Restored

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTTR, Partial Outage, SLI, SLO, Incident Analytics

Description: Measure staged recovery with explicit service thresholds, time-to-mitigation, full-restoration time, and integrated customer impact.

---

Recovery is often a staircase, not a switch. A rollback may restore reads before writes, one region may recover before another, or a feature kill switch may return checkout for most customers while a backlog drains. A single MTTR duration cannot describe both the speed of useful mitigation and the remaining customer harm.

## Define Service States with SLIs

Start with the user-facing behavior that matters. For a checkout service, define states such as:

| State | Example condition |
| --- | --- |
| Unavailable | Less than 50 percent of valid checkout attempts succeed |
| Degraded | At least 50 percent succeed, but the mitigation condition is not met |
| Mitigated | The interim harm threshold is met, but the full restoration condition has not yet been sustained |
| Restored | All applicable SLI thresholds pass for a fixed stability window |

For example, mitigation might require at least 99 percent success, acceptable interim latency, and no irreversible loss, while restoration might require at least 99.5 percent success plus the full latency objective for ten continuous minutes. These numbers are examples, not standards. Use the service's SLO, dependency behavior, and business impact to define them. The conditions must be mutually exclusive and state their scope: endpoints, regions, customer tiers, and traffic classes. Otherwise a healthy low-volume endpoint can mask a broken critical path.

Google SRE defines an SLI as a quantitative measure of service behavior and an SLO as a target value or range for that measure. That framework is better evidence for restoration than a ticket status alone.

## Preserve Several Recovery Durations

Let \(t_0\) be impact start, \(t_m\) the first time the mitigation condition is sustained, and \(t_f\) full restoration. Report at least:

\[
T_{mitigation} = t_m - t_0
\]

\[
T_{full} = t_f - t_0
\]

\[
T_{degraded\ tail} = t_f - t_m
\]

The first shows how quickly responders reduced acute harm. The second shows how long the service took to meet the full restoration definition. The tail exposes cases where a quick workaround becomes a long degraded state.

Do not average these into one unlabeled MTTR. If leadership needs a primary duration, choose one in the measurement contract and show the others beside it.

## Measure the Area Under the Impact Curve

Duration treats a 5 percent and a 100 percent outage as equal. Add an impact integral. If \(a(t)\) is the affected fraction of eligible traffic or users at time \(t\), then:

\[
I = \int_{t_0}^{t_f} a(t)\,dt
\]

With user counts, this becomes user-minutes. With request volume, it can be failed or bad-request events. Use actual request-based SLI data when possible; estimated affected-user counts should be labeled as estimates.

Suppose 10,000 active users are in scope:

- 100 percent are affected for 10 minutes;
- 20 percent are affected for the next 20 minutes;
- 5 percent are affected for the final 30 minutes.

Full-restoration time is 60 minutes, while estimated impact is:

\[
10{,}000(1.0)(10) + 10{,}000(0.2)(20) + 10{,}000(0.05)(30)
= 155{,}000\ user\text{-}minutes
\]

The equivalent full-outage duration is \(155{,}000/10{,}000=15.5\) minutes for this fixed population. This normalized value is useful for comparison, but it does not replace the 60-minute tail experienced by the last affected group.

## Record a Restoration Ladder

Capture each meaningful scope transition as an append-only event:

```text
10:00 impact_started      success=0.00 scope=all_regions
10:10 traffic_rerouted    success=0.80 scope=all_regions
10:30 writes_restored     success=0.95 scope=eu_region
10:45 backlog_cleared     success=0.995 scope=all_regions
10:55 stability_confirmed success=0.997 scope=all_regions
```

Store the observation window and evidence query with every transition. An instantaneous 99.7 percent sample is not the same as ten continuous minutes above the threshold.

For multiple regions or customer classes, retain component intervals before aggregation. A global percentage weighted by traffic may be appropriate for an overall SLI, but also expose the worst affected slice. A small region at zero availability can disappear inside a global average.

## Calculate from Bounded Intervals

A warehouse representation can hold one row per constant-impact segment:

```sql
SELECT
  incident_id,
  SUM(
    EXTRACT(EPOCH FROM (segment_end - segment_start)) / 60.0
    * affected_users
  ) AS user_minutes,
  MAX(segment_end) - MIN(segment_start) AS restoration_span
FROM incident_impact_segments
WHERE segment_end IS NOT NULL
GROUP BY incident_id;
```

Validate that segments do not overlap for the same population. If a user can appear in two affected cohorts, use set membership or deduplicated telemetry rather than summing estimates. Also separate unknown scope from zero impact; missing telemetry during an outage is not evidence that nobody was affected.

## Decide When the Clock Stops

Full restoration should describe user behavior, not internal completeness. The clock may stop while root-cause work, data reconciliation, or a permanent fix continues, provided the documented service condition is satisfied. Conversely, closing an incident while an SLI is still degraded should not stop an impact clock.

Backlog-based services need an explicit rule. If new requests succeed but old work remains delayed, restoration might require both an acceptable fresh-request SLI and backlog age below a limit. A disaster-recovery failover may satisfy an RTO while capacity or redundancy remains reduced; call that operational recovery and track return to normal redundancy separately.

Open incidents are right-censored. Report their current age and impact-to-date, but exclude them from a simple completed-duration mean. Treating the current time as a final endpoint will make the result change every dashboard refresh and mix complete with incomplete observations.

## Present the Story Without Hiding the Tail

A useful incident row contains:

- time to first effective mitigation;
- time to full SLI restoration;
- time spent in each degradation band;
- user-minutes or bad events;
- worst affected region or cohort;
- evidence coverage and any estimated intervals.

For a trend, show completed-incident count plus median and a tail percentile for both mitigation and full restoration. Pair the duration chart with impact. An incident that takes longer but affects far fewer users after minute five may represent a successful response, while a fast administrative resolution with continuing SLI harm does not.

## Official Documentation

- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [NIST recovery time objective glossary](https://csrc.nist.gov/glossary/term/recovery_time_objective)
- [OneUptime incidents overview](https://oneuptime.com/docs/en/incidents/index)

## Conclusion

Partial restoration requires more than one timestamp. Define service states from scoped SLIs, report mitigation and full-restoration durations separately, and integrate the affected fraction over time. The resulting measures reward fast harm reduction without pretending that the last degraded users or the long recovery tail did not exist.
