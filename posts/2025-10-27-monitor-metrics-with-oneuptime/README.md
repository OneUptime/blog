# Monitor Metrics with OneUptime: Turn Numbers into Action Without Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, Observability, Metrics, DevOps, OpenTelemetry

Description: Learn how to set up metric monitors in OneUptime using the built-in dashboards so you can watch key KPIs and act quickly when numbers drift.

---

Metrics tell you when performance is slipping, capacity is filling up, or success rates drop. OneUptime wraps that information in a guided experience so you can build powerful metric monitors with clicks, not code.

---

## What you get with metric monitors

- A rolling view of the metric slice you choose, refreshed on the schedule you set.
- Friendly chart previews while you configure the monitor.
- Alerts and incidents that follow your own thresholds.
- Full history and automation hooks shared with every other monitor type.

---

## Build a metric monitor step by step

1. **Create a new monitor** and select **Metrics**.
2. **Name it clearly**, for example "Checkout success rate" or "API latency".
3. **Choose the time window** (one minute, fifteen minutes, one hour, and so on) to decide how far back each check will look.
4. **Pick the metric data** using the MetricView builder:
   - Select the metric (such as request count, latency, CPU usage).
   - Add filters for tags like region, environment, or service.
   - Optional: group results (for example by status code) or build formulas (like errors divided by total requests).
5. **Watch the live chart** to confirm the monitor matches real data. Tweak filters until it looks right.
6. **Set alert rules** by deciding when a warning or critical alert should fire. Examples: warning at 1% error rate, critical at 3%.
7. **Connect automation** to on-call schedules, Slack channels, email, webhooks, or workflows.
8. **Save** and let the monitor run on its schedule.

---

## Everyday examples

- **Latency guardrails**: Alert when the P95 latency of your checkout API rises above two seconds.
- **Error ratios**: Build a formula for errors divided by total requests and notify the team when it climbs.
- **Traffic shifts**: Watch request volume per region and flag sudden drops or spikes.
- **Infrastructure health**: Track CPU or memory utilization so you can scale before saturation.

---

## Make alerts meaningful

- Pair short windows for quick detection with longer windows for stability.
- Use separate warning and critical levels to avoid unnecessary paging.
- Add maintenance windows when planned work would otherwise trigger alerts.
- Review historical charts after an incident to tune thresholds.

---

## Quick fixes when things feel off

- **No data in the preview?** Double-check the metric name and filters. Try a wider time range to confirm data exists.
- **Alerts too noisy?** Raise the threshold, shorten the window, or simplify the formula.
- **Need to pause monitoring?** Switch the monitor to maintenance mode from its detail page.

---

Metric monitors help you stay ahead of the numbers that matter. Combine them with log and trace monitors to build incidents that show what went wrong, where it happened, and how big the impact is- all without writing custom scripts.
