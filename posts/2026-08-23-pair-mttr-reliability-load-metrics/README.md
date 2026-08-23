# Pairing MTTR with Reliability and Operational Load Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTTR, SLO, Incident Frequency, Reactive Hours, Reliability Metrics

Description: Combine recovery duration with SLO impact, incident frequency, reactive hours, and recovery success to avoid one-dimensional reliability decisions.

---

Recovery duration describes one part of reliability. A service can recover quickly but fail every day, recover slowly with almost no user harm, consume enormous responder effort, or appear restored and repeatedly regress. Pair MTTR with impact, frequency, labor, and recovery quality to see those different operating states.

## Define a Small Metric System

Use one canonical incident and impact model, then derive named measures.

### Recovery duration

For each completed incident:

\[
T_i=t_i(restored)-t_i(impact\ started)
\]

Publish count, median, p75 or p90, mean, and maximum. State the clock and cohort.

### SLO impact

For a request-based SLO, count eligible bad events attributable to the incident and express them directly or as a share of the compliance period's error budget:

\[
C_i=\frac{bad\ events_i}{(1-SLO)\times eligible\ events_{period}}
\]

Avoid double attribution when incidents overlap. User-minutes or delayed jobs can complement SLO bad events when they better represent business harm.

### Incident frequency

Count unique canonical incident episodes per fixed time or per exposure unit, such as deployments, requests, or service-hours. Define episode linking so alert fan-out and ticket splitting do not change the count.

### Reactive hours

Sum actual human time spent on paging, active response, communication, immediate cleanup, and required postmortem work under a declared policy:

\[
H_i=\sum_r hours_{ir}
\]

Elapsed recovery time and responder-hours are different. Ten responders working for one hour is about ten reactive hours, not one.

### Recovery success rate

Define a successful recovery before calculating it. One useful policy is:

> The selected mitigation restores the scoped SLI within the target, causes no declared safety violation, and does not regress with the same failure mode during a 24-hour stability horizon.

Then:

\[
R=\frac{successful\ qualifying\ recoveries}{attempted\ qualifying\ recoveries}
\]

Report the numerator, denominator, and reasons for failure. Ticket closure alone is not recovery success.

## Read the Metrics as a Matrix

| Pattern | Likely interpretation | Investigation |
| --- | --- | --- |
| MTTR down, frequency up | Faster response to a worsening recurrence problem | Preventive work, change quality, capacity |
| MTTR up, SLO impact down | Longer low-impact tails after effective mitigation | Full restoration, backlog, last affected cohort |
| MTTR down, reactive hours up | More people or manual parallel work bought speed | Automation, roles, cognitive load |
| MTTR down, success rate down | Premature or risky mitigations | Verification, rollback safety, stability window |
| Frequency down, SLO impact up | Fewer but larger incidents | Blast radius, isolation, disaster recovery |
| All stable, open age rising | Completed cohort hides ongoing incidents | Censoring and open-incident review |

No single cell is a verdict. Link the pattern to incident records and postmortems.

## Do Not Multiply Averages Blindly

For the same completed cohort, `incident count x mean recovery` equals the sum of incident durations apart from display rounding. That sum is incident-duration exposure, not unioned elapsed downtime or user impact, and it can exceed calendar time when incidents overlap.

Calculate totals from raw rows. Materialize `recovery_eligible`, `recovery_attempted`, and nullable `recovery_success` under the declared recovery policy so ineligible, unattempted, and unknown outcomes remain outside the known-outcome success-rate denominator:

```sql
SELECT
  date_trunc('month', impact_started_at) AS month,
  COUNT(DISTINCT incident_id) AS incident_count,
  SUM(recovery_seconds) AS incident_seconds,
  SUM(slo_bad_events) AS bad_events,
  SUM(reactive_hours) AS reactive_hours,
  COUNT(*) FILTER (
    WHERE recovery_eligible
      AND recovery_attempted
      AND recovery_success IS TRUE
  )::double precision
  / NULLIF(
      COUNT(*) FILTER (
        WHERE recovery_eligible
          AND recovery_attempted
          AND recovery_success IS NOT NULL
      ),
      0
    ) AS recovery_success_rate,
  COUNT(*) FILTER (
    WHERE recovery_eligible
      AND recovery_attempted
      AND recovery_success IS NULL
  ) AS recovery_outcome_unknown
FROM canonical_incident_facts
WHERE environment = 'production'
GROUP BY 1;
```

If multiple service rows belong to one parent incident, calculate organization count from the parent table and service exposure from the child table. Do not let a join multiply impact or labor.

## Build a Balanced Dashboard

A monthly or quarterly dashboard can contain:

1. **Reliability:** SLO attainment, error budget remaining, incident bad events, and user-minutes.
2. **Occurrence:** unique incident count and rate by service or deployment.
3. **Recovery:** median, p90, mean, maximum, completed count, and open ages.
4. **Response load:** pages, after-hours interruptions, reactive hours, and maximum concurrent responders.
5. **Recovery quality:** first-action success, reopen rate, recurrence, and failed mitigation.
6. **Data quality:** eligible, excluded, missing timestamps, missing impact, and policy version.

Add a table of the largest incidents by SLO impact, duration, and reactive hours. The top incident may differ under each ordering, revealing different investments.

## Choose Denominators Deliberately

Raw frequency can rise simply because traffic, customers, or deployments increased. Complement it with rates such as incidents per 1,000 deployments or per million service-hours where those exposures make sense. Still show the raw count because operational burden is real.

Reactive-hour capture can itself be burdensome. Prefer automated attendance and incident-role intervals with a simple correction workflow. State whether time includes passive waiting, postmortem writing, and remediation engineering. Never infer labor by multiplying channel membership by full incident duration.

Recovery success denominator matters. If only automated rollback attempts are eligible, do not mix manual diagnosis incidents into the rate. Show not attempted, ineligible, and unknown outcomes.

## Tie Each Measure to a Decision

- High SLO impact supports resilience and blast-radius investment.
- High frequency supports prevention and change-quality work.
- Long recovery tails support observability, escalation, and recovery-path engineering.
- High reactive hours support automation, staffing, and toil reduction.
- Low recovery success supports safer rollback, validation, and runbook revision.

Prioritize where measures converge. A repeated failure mode with high budget consumption, long p90, and heavy responder-hours is a stronger investment case than a small movement in the overall mean.

Keep the review blameless. Google SRE treats error budgets as a balance between reliability and innovation and postmortems as learning tools. Metrics should guide work on systems and processes rather than rank responders.

## Official Documentation

- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Google SRE Workbook: Error Budget Policy](https://sre.google/workbook/error-budget-policy/)
- [Google SRE: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
- [OneUptime incidents overview](https://oneuptime.com/docs/en/incidents/index)

## Conclusion

Pair recovery duration with customer impact, occurrence, human effort, and recovery quality. Keep each numerator, denominator, cohort, and unit explicit, and calculate from canonical facts rather than combined averages. The resulting scorecard distinguishes faster response from genuinely better reliability and sustainable operations.
