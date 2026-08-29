# When Does a Rolling Error Budget Recover After an Incident?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLO, Error Budget, Incident Management, Reliability, SRE, SLI

Description: Forecast rolling-budget recovery from event timestamps, traffic, and window boundaries instead of resetting it when an incident ends.

---

A rolling error budget does not reset when an incident is resolved. The failed events remain in the trailing window until they age out, while new events enter and old events leave. Alert recovery, service recovery, and budget recovery are three different moments.

## Define What “Recovered” Means

For a request-based SLO with target `S`, bad events `B`, and eligible events `N` in the current rolling window:

```text
allowed bad events = (1 - S) x N
remaining budget  = allowed bad events - B
```

Teams use “recovered” for at least three states:

- **The service is healthy:** the current error rate returned to normal.
- **The burn alert resolved:** its short and long lookback windows no longer exceed thresholds.
- **The SLO is back in budget:** current rolling-window bad events are within the allowed amount.
- **The incident is fully aged out:** none of its bad events remain in the window.

Name the state in dashboards and incident updates. A five-minute alert can resolve while a 28-day budget remains exhausted.

## See How a Constant-Traffic Outage Ages Out

Assume a full 28-day window, constant traffic, and a two-hour outage ending at `T0`. With no new failures:

- The entire outage remains inside the window until `T0 + 27 days 22 hours`.
- At that point, the first incident failures reach the left edge and begin to leave.
- The incident's failures age out progressively for two hours.
- The last incident failure leaves at `T0 + 28 days`.

Under constant traffic, new good requests initially replace equally old good requests, so the bad fraction does not improve merely because the service is healthy. It begins improving when incident failures themselves leave. The SLO may become compliant during that two-hour aging interval before the last failure leaves, depending on how far over budget it was.

## Request Traffic Makes Recovery Nonlinear

Real request-based budgets depend on the denominator:

- High volumes of new good traffic can improve the ratio before all bad events age out.
- If high-volume good traffic at the old edge leaves while quiet traffic enters, compliance can worsen despite no new errors.
- A high-traffic incident contributes more bad events than the same duration at low traffic.
- With no new traffic, old good and bad events continue to leave; eventually the request ratio can become undefined because no eligible events remain.

This is why “incident duration divided by window length” is only a time-based, constant-load approximation. Forecast request SLOs from timestamped good and bad events or representative per-interval counts.

## Build a Recovery Forecast

At each future evaluation time:

1. Remove events older than `evaluation_time - window`.
2. Add forecast good and bad events using an explicit traffic assumption.
3. Recalculate allowed bad events from the forecast denominator.
4. Find the first time remaining budget becomes nonnegative.
5. Show a range for low, expected, and high traffic rather than one false-precision timestamp.

Keep a marker for the last incident event's age-out time. It is deterministic from event timestamps even when the compliance-crossing time is not.

For a windows-based SLO, apply the same method to good and bad time slices. A bad minute leaves when that exact minute crosses the left boundary; request volume does not reweight it.

## Avoid Artificial Recovery

- Do not reset counters or recreate the SLO after the incident.
- Do not change the target or eligibility filter without versioning a new objective.
- Do not backfill synthetic successes to offset real failures.
- Do not call a calendar-period reset “recovery”; it is a new accounting period.
- Do not resume risky changes solely because a short burn alert resolved. Follow the written budget policy.

Google Cloud's SLO documentation describes this rolling behavior directly: old data drops out, new data replaces it, and budget can rise when poor compliance leaves the window. It can also move with request volume, so retain numerator and denominator in operational views.

## Communicate the Timeline

A useful incident closeout says:

```text
Service healthy:                 29 Aug 14:10 UTC
Fast-burn page resolved:         29 Aug 15:10 UTC
Expected return within SLO:      25 Sep, 12:00-18:00 UTC
Last incident event ages out:    26 Sep 14:10 UTC
Forecast assumption:             normal weekday traffic, 0.02% background errors
```

That gives release managers and stakeholders the information needed to apply policy without mistaking operational stability for restored budget.

## References

- [Google Cloud Observability: Trajectory of error budgets](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Google SRE Workbook: Choosing an Appropriate Time Window](https://sre.google/workbook/implementing-slos/#choosing-an-appropriate-time-window)

## Conclusion

A rolling budget recovers as the composition of its trailing window changes, not when an incident ticket closes. Forecast it from the actual event stream and distinguish healthy service, resolved alert, restored compliance, and fully aged-out impact.
