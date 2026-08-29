# 14, 28, or 30 Days? How to Choose an SLO Evaluation Window

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLO, Service Level Objectives, Error Budget, SRE, Reliability, Monitoring

Description: Select an SLO window from decision cadence, traffic, and seasonality while keeping target, budget, and alerts consistent.

---

An SLO window is not a dashboard preference. It determines how much evidence the score contains, how long incidents influence decisions, how many failures the budget permits, and how burn-rate alerts map to budget spend.

For a general-purpose operational SLO, 28 days is usually the best starting point. It contains exactly four weeks, so every weekday appears four times. Choose 14 or 30 days only when their tradeoffs match a real decision.

## Compare the Common Choices

| Window | Strength | Cost | Good fit |
|---|---|---|---|
| 14 days | Faster feedback; exactly two weeks | Fewer events; incidents dominate more; noisier low-volume ratios | Rapidly changing service with enough traffic |
| 28 days | Four equal weekly cycles; stable operational memory | Slower to reflect a durable improvement | Default release and reliability policy |
| Rolling 30 days | Familiar “monthly” language | Uneven weekday/weekend mix; still not a calendar month | Existing tooling or policy fixed to 30 days |
| Calendar month | Aligns with billing and credits | 28-31 day length and abrupt reset | SLA or financial reporting |

Google SRE recommends a four-week rolling interval as a good general-purpose choice, supplemented by weekly summaries and quarterly reporting. Google Cloud also recommends 28 days as a starting point for SLI measurement.

## Calculate Event Granularity

For target `S` and expected eligible events `N`:

```text
nominal bad-event budget = (1 - S) x N
```

A 99.9% SLO with 1,000,000 events permits about 1,000 bad events. With 200 events, it permits 0.2 event, so one failure misses the target. A longer window can increase the sample, but it cannot make a fractional event spendable. If traffic is very low, revisit aggregation, the target, logical-event design, and alert response.

For time-slice SLOs, calculate the number of slices. A 28-day period with five-minute slices has 8,064 eligible slices before exclusions. Confirm that the slice size and target permit meaningful failures.

## Match the Window to the Decision

Use 14 days when teams can and will make meaningful corrections within days, the service changes rapidly, and two weekly cycles provide enough events. Avoid it when a single ordinary incident would keep the team permanently oscillating between freeze and release.

Use 28 days for continuous operational policy, especially when weekday and weekend load differ. It balances tactical response with enough history for reliability work.

Use rolling 30 days when compatibility with a mature SLO system or established organizational policy outweighs the traffic-mix drawback. Do not claim it is a calendar month.

Use a calendar month when the actual consequence-such as a service credit-resets on that boundary. Maintain a rolling operational view so a boundary does not erase recent risk.

## Recalibrate Burn Alerts

Burn rate is current bad-event rate divided by the error-budget rate. The fraction of a budget consumed during an alert lookback is approximately:

```text
budget fraction = burn rate x lookback duration / SLO window duration
```

Changing a window from 28 to 14 days doubles the budget fraction represented by the same burn rate and lookback. Re-derive page and ticket thresholds, replay incidents, and update runbooks. Do not copy 30-day multiwindow alert numbers without checking the desired percentage of budget spend.

## Test Candidate Windows Against History

Replay at least several months of good and total events and compare:

- known incidents captured or missed;
- false pages and ticket volume;
- weekday/weekend and seasonal movement;
- time spent frozen by the error-budget policy;
- low-traffic denominator size;
- time to reflect sustained improvement;
- data retention and query cost.

Pick the shortest window that gives representative evidence for the intended decision. If a yearly peak is critical, do not stretch one operational window to a year; add load-specific objectives, capacity tests, and seasonal reports.

## Treat Target and Window as One Versioned Contract

“99.9% over 14 days” and “99.9% over 28 days” are different objectives. When changing the window:

- record the rationale and approval date;
- version the SLO rather than rewriting history;
- preserve old results for comparison;
- update budget policies, alerts, dashboards, and reports together;
- define how the new SLO warms up before it controls decisions.

Never choose the window that makes the current score green. That is outcome shopping, not reliability management.

## References

- [Google SRE Workbook: Choosing an Appropriate Time Window](https://sre.google/workbook/implementing-slos/#choosing-an-appropriate-time-window)
- [Google Cloud Observability: SLI metrics overview](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/overview)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Google Cloud Observability: Compliance periods](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring)

## Conclusion

Start with 28 rolling days for operations, then deviate only for a documented evidence or decision need. Validate event granularity, replay historical incidents, and change the target, alerts, and budget policy as one versioned unit.
