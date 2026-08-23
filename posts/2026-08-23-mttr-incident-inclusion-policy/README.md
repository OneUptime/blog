# Choosing Which Incidents Belong in MTTR

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTTR, Incident Classification, SRE, False Positives, Reliability Metrics

Description: Build an auditable MTTR inclusion policy for real incidents, planned maintenance, tests, false positives, and near misses.

---

The incidents included in an MTTR calculation can change the result more than the formula. False-positive alerts, exercises, planned maintenance, near misses, and genuine customer-impact events answer different operational questions. A good dataset preserves all of them but assigns each to a declared reporting population.

## Start with the Question, Not the Ticket Queue

Create separate metrics for separate decisions:

- **Customer recovery:** How long did unplanned production impact last?
- **Responder workflow:** How long did responders take to assess and mitigate pages?
- **Change recovery:** How long did it take to recover from a failed production deployment?
- **Exercise readiness:** How quickly did teams complete a controlled test scenario?
- **Alert quality:** How many pages were actionable, duplicate, or false positive?

The same event can belong to more than one dataset. A false-positive page belongs in alert-quality and responder-load analysis, but it has no customer restoration duration. A failed deployment with user impact belongs in both a deployment-recovery cohort and a customer-impact cohort, with the appropriate clocks.

## Use Explicit Classification Fields

A durable incident record should include:

```text
environment: production | staging | development
event_mode: unplanned | planned | exercise | synthetic
impact_class: customer_impact | internal_impact | near_miss | no_impact | unknown
alert_disposition: actionable | duplicate | false_positive | informational | none
change_related: true | false | unknown
included_in_customer_recovery: true | false
exclusion_reason: controlled_test
classification_policy_version: 4
```

Do not encode all of this into severity. Severity is useful for triage, but it does not establish whether an event was planned, real, or customer-facing. Keep `unknown` distinct from `no_impact`; missing evidence must not become an automatic exclusion.

## Recommended Treatment by Event Type

| Event type | Customer MTTR | Other useful measurement |
| --- | --- | --- |
| Unplanned production impact | Include | SLO impact, response phases, change linkage |
| False-positive alert | Exclude | Alert precision, responder interruption, assessment time |
| Duplicate alert for same impact | Do not add another recovery | Deduplication rate and alert fan-out |
| Planned maintenance within approved scope | Usually exclude | Maintenance duration and plan adherence |
| Planned change exceeding approved impact | Include the excess or resulting incident | Change failure and recovery |
| Game day or test | Exclude from production trend | Exercise detection and recovery results |
| Near miss with no user impact | Exclude from customer duration | Near-miss frequency and preventive action |
| Internal-only production impact | Separate cohort | Employee or operational SLO impact |

These are defensible defaults, not universal rules. Publish local exceptions. If a customer SLO counts planned downtime as bad events, the SLO-impact report must follow that SLO definition even if the operational MTTR cohort excludes approved maintenance.

## False Positives Have No Recovery Interval

A false positive means investigation found that the alert condition did not represent the specified failure. The time from page to resolution measures assessment or handling time:

\[
T_{assessment} = t_{dispositioned} - t_{page\ created}
\]

Calling it recovery time creates fast zero-impact incidents that artificially lower MTTR. It can also reward prematurely resolving ambiguous alerts. Keep the event and its responder minutes; exclude it only from the impact-recovery population.

Distinguish a false positive from a short true positive. A two-minute SLI breach is still real if it meets the incident policy. Auto-recovery is not proof of falsehood.

## Planned Maintenance Needs Boundary Checks

An approved maintenance window is not a blanket exemption. Store its planned start, planned end, approved resources, expected impact, and change ID. Then compare actual impact:

1. Impact inside the approved interval and scope can be reported as planned.
2. Impact starting early, ending late, reaching unapproved services, or exceeding the expected level becomes unplanned excess.
3. A failed maintenance action that requires rollback or hotfix may qualify as a failed deployment for DORA analysis.

If an outage runs from 01:00 to 02:20 but approval covers 01:00 to 02:00, customer recovery analysis can retain the 20-minute excess. Keep the whole event for operational review rather than splitting away its causal context.

## Tests and Near Misses Deserve Their Own Scorecards

Exercises validate runbooks, paging, failover, and communication without being production incidents. Mark them at creation time and prevent the flag from changing casually after an uncomfortable outcome. Report test success rate, detection latency, recovery against the exercise target, and failed steps.

Near misses are events where controls or luck prevented defined user impact. They have no customer-impact restoration interval, but they reveal risk. Track near-miss count, potential blast radius, control that prevented impact, and completion of follow-up actions. Google SRE recommends blameless postmortems for significant undesirable events and allows objective criteria plus stakeholder requests; a postmortem requirement does not imply inclusion in one MTTR cohort.

## Make Inclusion Reproducible

Implement policy as data and a reviewable query:

```sql
CASE
  WHEN environment <> 'production' THEN false
  WHEN event_mode IN ('exercise', 'synthetic') THEN false
  WHEN impact_class <> 'customer_impact' THEN false
  WHEN planned_maintenance_id IS NOT NULL
       AND unplanned_excess_seconds = 0 THEN false
  ELSE true
END AS included_in_customer_recovery
```

Real logic will reflect the SLO and business rules. Save an exclusion reason, policy version, and evaluation timestamp. Review manual overrides independently, because retroactive exclusion is an easy way to improve a chart without improving reliability.

Every dashboard should show the funnel: total records, classified records, eligible incidents, completed durations, and missing timestamps. A sudden drop in eligible count may indicate a taxonomy or ingestion change rather than better service.

## Audit the Policy

Sample included and excluded incidents each quarter. Look for short incidents relabeled as false positives, maintenance windows expanded after the fact, tests missing their marker, and customer impact left as unknown. When the policy changes, recompute a comparable history or annotate the break.

DORA's failed deployment recovery time deliberately narrows the population to deployment failures requiring immediate intervention. That metric should not be populated from every incident ticket. Likewise, an incident MTTR cohort should not be stretched to claim software-delivery performance.

## Official Documentation

- [DORA software delivery performance metrics](https://dora.dev/guides/dora-metrics/)
- [Google SRE: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
- [Google SRE Workbook: Error Budget Policy](https://sre.google/workbook/error-budget-policy/)
- [OneUptime declaring incidents](https://oneuptime.com/docs/en/incidents/declaring-incidents)
- [OneUptime incidents overview](https://oneuptime.com/docs/en/incidents/index)

## Conclusion

Do not delete inconvenient records or force every ticket into MTTR. Classify event mode, impact, alert disposition, maintenance scope, and change linkage; preserve separate cohorts for recovery, alert quality, exercises, and near misses; and make exclusions versioned and auditable. The resulting trend reflects service behavior instead of queue composition.
