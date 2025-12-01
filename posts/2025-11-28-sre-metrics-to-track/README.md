# 18 SRE Metrics Worth Tracking (And Why)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Site Reliability Engineering, Metrics, Observability, SLOs, OpenTelemetry, OneUptime

Description: A concise guide to the metrics every SRE team should monitor, grouped by outcome, with notes on instrumentation and decision triggers.

---

## Principles Before Metrics

1. **Measure user impact first.** Raw host metrics are supporting actors.
2. **Instrument with intent.** OpenTelemetry gives you the schema; OneUptime keeps it queryable and tied to incidents.
3. **Tie metrics to actions.** If no one would change behavior, drop the metric.

---

## A. User Experience & SLO Health

| Metric | Why | Trigger |
|--------|-----|---------|
| **Availability SLI (per journey)** | Captures user-visible uptime | Burn rate > 2× for 1h → investigate |
| **Latency P95/P99 (per journey)** | Exposes tail pain that averages hide | P99 > target for 3 intervals → rollback or add capacity |
| **Error Budget Remaining** | Balances speed vs safety | <50% mid-period → slow risky deploys |
| **Synthetic Success Rate** | Validates critical flows proactively | Drop >2% → check recent changes |

## B. Incident Response

| Metric | Why | Trigger |
|--------|-----|---------|
| **MTTD (mean time to detect)** | Measures monitoring efficacy | >10 min for Sev-1 → tighten alerting |
| **MTTR (mean time to resolve)** | Reflects mitigation and rollback muscle | Upward trend → invest in automation |
| **Page Volume per Engineer per Week** | Protects on-call health | >2 wake-ups → prune alerts |
| **Postmortem SLA Compliance** | Ensures learning happens | <90% on-time → unblock reviews |

## C. Systems & Capacity

| Metric | Why | Trigger |
|--------|-----|---------|
| **Request Saturation (utilization)** | Early warning for scaling | >70% for 3 windows → scale or optimize |
| **Queue Depth / Backlog Age** | Shows hidden latency | Rising trend without matching traffic → investigate |
| **GC Pause Time / Tail Latency Correlation** | Links runtime behavior to UX | GC > 200ms → tune heap |
| **Resource Cost per Request** | Highlights efficiency regressions | 20% jump week over week → profile |

## D. Change & Delivery

| Metric | Why | Trigger |
|--------|-----|---------|
| **Deployment Frequency** | Checks if teams can ship | Flatline + unmet roadmap → look for bottlenecks |
| **Change Failure Rate** | Reliability of releases | >15% rollbacks/hotfixes → add pre-prod tests |
| **Lead Time to Production** | Measures flow efficiency | >24h for small changes → streamline pipelines |
| **Rollback Time** | Confidence indicator | >10 min → automate scripts |

## E. Toil & Investment

| Metric | Why | Trigger |
|--------|-----|---------|
| **Toil Percentage of SRE Capacity** | Keeps focus on engineering | >50% for two sprints → pick automation target |
| **Automation Coverage (runbooks with scripts)** | Shows maturity | <70% scripts → plan improvements |
| **Reliability Debt Backlog Size** | Visible trade-offs | If growing faster than burn-down → exec escalation |
| **Observability Cost vs Budget** | Prevents silent spend creep | >10% variance → adjust OpenTelemetry sampling |

---

## Connecting the Dots

- Instrument metrics via OpenTelemetry (histograms for latency, counters for errors, traces for dependency timing).
- Ship everything into OneUptime to build SLO dashboards, burn-rate alerts, and incident timelines that reference the same dataset.
- Review metrics during a monthly Reliability Business Review. Highlight 3 metrics improving, 3 regressing, and the experiments you will run next.

## Action Checklist

1. Inventory current metrics; delete anything without an owner.
2. Map each metric to a decision (alert, roadmap, staffing, automation).
3. Add deploy markers and customer segments to metrics so you can slice impact fast.
4. Automate reports so stakeholders receive the signal without manual stitching.

A focused metric set creates calm confidence. Measure what your users feel, back it with clean telemetry, and every incident becomes faster to detect, fix, and learn from.
