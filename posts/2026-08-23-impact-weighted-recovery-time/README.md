# Impact-Weighted Recovery Time from User-Minutes and Error-Budget Burn

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTTR, User-Minutes, Error Budget, SLO, Incident Analytics

Description: Weight recovery analysis by measured customer harm or error-budget consumption while preserving duration tails and explicit units.

---

An unweighted recovery mean gives a two-user degradation the same influence as a global outage. Impact weighting can align the summary with customer harm, but only if the weight is well defined. User-minutes, bad events, and error-budget consumption are different quantities; none should be hidden behind an unlabeled MTTR acronym.

## Keep Duration and Impact as Separate Facts

For incident \(i\), first compute a declared recovery duration:

\[
T_i = t_i(restored)-t_i(impact\ started)
\]

Then compute an impact measure. If \(u_i(t)\) is the number of affected users at time \(t\):

\[
U_i=\int u_i(t)\,dt
\]

The unit is user-minutes when time is measured in minutes. For request-based services, a more directly observable quantity may be bad events:

\[
E_i=\sum_{t\in incident} bad\_events_i(t)
\]

Store \(T_i\), \(U_i\), and \(E_i\) independently. Duration says how long recovery took. Impact says how much harm accumulated. One cannot reconstruct the shape of an incident from the other.

## Define an Impact-Weighted Recovery Summary

For a cohort, a weighted mean duration is:

\[
\bar{T}_w=\frac{\sum_i w_iT_i}{\sum_i w_i}
\]

Choose \(w_i=U_i\) to make each user-minute of incident impact determine the influence of its incident's duration. Or choose an incident's share of error budget as the weight. The result remains a duration, but its interpretation must be explicit: the user-minute-weighted mean of incident recovery durations.

This statistic intentionally emphasizes high-impact incidents. It also multiplies a duration-derived impact by duration again when user-minutes grow with time, so it can be dominated by long broad outages. That is not necessarily wrong, but it is why the raw impact total and unweighted distribution must remain on the dashboard.

## Worked Example

Suppose two completed incidents have:

| Incident | Recovery | User-minutes |
| --- | ---: | ---: |
| A | 20 min | 100,000 |
| B | 120 min | 5,000 |

The unweighted mean is 70 minutes. The user-minute-weighted mean is:

\[
\frac{20(100{,}000)+120(5{,}000)}{105{,}000}=24.8\ minutes
\]

That accurately states that most observed user-minute impact belonged to the faster-recovered global incident. It does not mean the 120-minute recovery stopped mattering. Publish p90 or maximum duration and link Incident B for review.

## Calculate User-Minutes from Segments

Estimate impact over intervals where the affected population is approximately constant:

```sql
WITH per_incident AS (
  SELECT
    incident_id,
    MAX(restored_at) - MIN(impact_started_at) AS recovery_interval,
    SUM(
      EXTRACT(EPOCH FROM (segment_end - segment_start)) / 60.0
      * affected_users
    ) AS user_minutes
  FROM incident_impact_segments
  WHERE segment_end IS NOT NULL
  GROUP BY incident_id
)
SELECT
  SUM(EXTRACT(EPOCH FROM recovery_interval) * user_minutes)
    / NULLIF(SUM(user_minutes), 0) AS weighted_recovery_seconds,
  SUM(user_minutes) AS total_user_minutes,
  COUNT(*) AS n
FROM per_incident;
```

Use non-overlapping user populations. Summing regional counts is valid only if users cannot be counted in multiple regions during the same segment. When the active population changes over the day, use the eligible population for each interval rather than a fixed peak-day denominator.

If user counts are unavailable, label modeled estimates and record the model version. Affected sessions, orders, requests, or device-minutes may be more auditable units for a particular service.

## Connect Impact to an SLO Error Budget

For a request-based SLO with target \(S\) over a compliance period and \(N\) eligible events, the nominal allowed bad events are:

\[
B=(1-S)N
\]

An incident that contributes \(E_i\) SLO-bad events consumes approximately:

\[
c_i=\frac{E_i}{B}
\]

Use \(c_i\) as a cohort weight only when all incidents use the same SLO and compliance period, or after carefully defining a comparable normalization. Ten percent of one service's budget is a comparable governance signal, but the underlying user harm can differ from ten percent of another service's budget.

Google SRE defines burn rate as the rate of error-budget consumption relative to the SLO. A burn rate of 1 would consume the budget evenly across the full window. Burn rate is a rate, not the same thing as budget fraction consumed. To obtain incident budget consumption, integrate bad events over its window and divide by the period's allowed amount; do not multiply a single peak burn-rate sample by incident duration unless the rate truly remained constant.

## Attribute Overlapping Incidents Carefully

Two incident records can describe the same bad request. If both receive the event, total budget consumption is doubled. Establish an attribution rule:

1. Build the SLI bad-event set for the compliance period.
2. Join each event or time bucket to active incident impact windows.
3. Assign it to one primary incident, or allocate fractions that sum to one.
4. Leave unattributed SLO loss visible.

Do not infer impact solely from alert count or severity. A noisy alert storm can create many incident records without adding more bad events.

## Present a Balanced Scorecard

A defensible panel shows:

- unweighted median, p75, p90, and mean recovery time;
- total user-minutes or bad events;
- weighted mean recovery with its exact weight;
- share of error budget consumed by incident;
- sample size, missing-impact coverage, and open incidents;
- largest incidents by both duration and impact.

Track mitigation separately from full restoration. A feature kill switch may sharply reduce user-minutes while a low-impact recovery tail continues. Both are operationally important, and the impact curve demonstrates the value of fast mitigation.

## Official Documentation

- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google SRE Workbook: Error Budget Policy](https://sre.google/workbook/error-budget-policy/)
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [OneUptime incidents overview](https://oneuptime.com/docs/en/incidents/index)

## Conclusion

Impact weighting is useful when broad incidents should influence recovery analysis more than narrow ones. Define and retain the raw duration, impact unit, and SLO budget consumption; prevent overlapping attribution; and publish unweighted tails beside the weighted mean. That keeps customer harm central without erasing slow low-volume failures.
