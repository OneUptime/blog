# Rolling vs Calendar-Aligned SLO Windows: Which One Should Drive Operations?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLO, Error Budget, Service Level Objectives, SRE, Reliability, SLA

Description: Use a rolling window for continuous operational risk and a calendar window when a fixed business or contractual period is the real decision boundary.

---

A rolling SLO answers, “How reliable were the most recent N days?” A calendar-aligned SLO answers, “How reliable were we in this named week, month, or quarter?” Neither is universally superior, but only one should control a given policy decision.

For most day-to-day engineering operations, a four-week rolling window is the stronger default. It retains recent incidents across month boundaries and keeps the decision signal continuous. Calendar windows are valuable for contracts, credits, financial reporting, and planning tied to fixed periods.

## Understand the Behavioral Difference

| Property | Rolling window | Calendar-aligned window |
|---|---|---|
| Boundary | Moves continuously | Fixed start and end |
| Budget reset | No abrupt reset | Resets at the next period |
| Incident memory | Remains until events age out | Can disappear at a boundary |
| Mid-period forecast | Always evaluates a full trailing period | Future traffic in the period is unknown |
| Best fit | On-call, release risk, continuous prioritization | SLA credits, invoices, quarterly planning |

An outage on August 31 remains in a rolling view on September 1. A September calendar report begins with a fresh budget even though users and operators have not forgotten the incident. That reset may be correct for a billing contract but is a poor reason to resume risky changes.

## Prefer Whole Weeks for Rolling Operations

Google SRE recommends an integral number of weeks so each evaluation contains the same weekday and weekend mix. A 28-day window contains exactly four of each weekday. A 30-day rolling window rotates through different weekday mixes, which can move a request-based SLI for reasons unrelated to reliability when weekend traffic differs.

A common operational stack is:

- 28-day rolling SLO for error-budget policy;
- multiwindow burn-rate alerts for urgent response;
- weekly summaries for task prioritization;
- calendar-quarter summaries for strategic investment.

The reports may derive from the same good and total events, but label them clearly. Do not present a calendar-month score as if it were the 28-day operational budget.

## Use Calendar Windows When the Boundary Matters

Choose a calendar period when a real consequence resets there:

- customer service credits are assessed monthly;
- a regulator requires named-quarter reporting;
- business planning allocates headcount each quarter;
- a scheduled service has an agreed event season or business week.

Specify the time zone, inclusive/exclusive boundary rules, late-arriving data policy, and how a partial first period is handled. “Monthly” is not the same as rolling 30 days: calendar months vary from 28 to 31 days.

## Do Not Switch Views Opportunistically

If the rolling window is out of budget but the new calendar month is green, which result freezes releases? Decide this in the error-budget policy before an incident. A robust policy might say:

> The 28-day rolling SLO controls engineering risk. The calendar-month SLO controls external SLA reporting. A green calendar reset does not override a rolling-window freeze.

Conversely, a contractual breach in a completed calendar month remains a breach even if a rolling view later turns green.

## Implement Both from One Canonical SLI

Keep raw good and eligible event counters or durable event records. The rolling ratio can be queried over a trailing duration:

```promql
sum(increase(api_requests_total{sli_result="good",sli_eligible="true"}[28d]))
/
sum(increase(api_requests_total{sli_eligible="true"}[28d]))
```

Evaluate calendar periods with exact report start and end timestamps in an SLO/reporting system. A `[30d]` PromQL selector does not become a calendar month just because a dashboard panel is titled “monthly.”

OpenSLO represents rolling and calendar-aligned time windows separately, which is useful for keeping this intent in source control. Whichever system you use, make the window, target, SLI version, and policy owner part of one definition.

## Account for Window-Specific Failure Modes

Rolling windows can confuse teams that expect budget to refill immediately after a fix; incident events leave only as the window moves. Calendar windows can encourage risky behavior just after a reset or conceal a severe event split across two periods. Both can be distorted by changing traffic mix, eligibility rules, missing telemetry, or an incomplete initial window.

Test each view against historical incidents and ask whether it would have triggered the intended action at the intended time. If the answer differs by view, document why rather than averaging the scores.

## References

- [Google SRE Workbook: Choosing an Appropriate Time Window](https://sre.google/workbook/implementing-slos/#choosing-an-appropriate-time-window)
- [Google Cloud Observability: Compliance periods](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring)
- [OpenSLO specification](https://github.com/OpenSLO/OpenSLO)
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)

## Conclusion

Use a whole-week rolling window to drive continuous operational risk unless a fixed boundary is itself part of the decision. Maintain calendar-aligned reporting where contracts or planning require it, but never let a convenient reset erase recent engineering risk.
