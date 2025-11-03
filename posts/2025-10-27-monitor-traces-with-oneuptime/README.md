# Monitor Traces with OneUptime: Follow Every Request the Easy Way

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, Observability, Tracing, Traces, DevOps, OpenTelemetry

Description: Discover how to set up and manage OneUptime trace monitors as an end user so you can react to latency or error spikes without touching code.

---

Trace monitors watch the journey of each request through your services. They count matching spans on a schedule and alert you when performance drifts or traces disappear. Everything happens inside the dashboard with friendly forms, previews, and automation hookups.

---

## Why trace monitors matter

- Spot latency increases before customers complain.
- Catch missing traces that signal broken instrumentation or outages.
- Track errors or retries at a specific step in a workflow.
- Share a live picture of performance with the whole team.

---

## Set up a trace monitor

1. **Create a new monitor** and choose **Traces**.
2. **Name the monitor** after the user journey or span you care about, for example "Checkout latency".
3. **Describe the spans to watch** by filling in:
   - Span name or partial match (such as `GET /checkout`).
   - Span kind (server, client, internal, producer, consumer).
   - Services or attributes that should match (environment, region, partner, and so on).
   - Time window that each check should cover (start with one or five minutes).
   - Optional duration thresholds if you only want slow spans.
4. **Check the live preview** to make sure the right traces show up. Adjust filters until the results match your expectations.
5. **Pick a monitoring interval** so the monitor runs as frequently as you need.
6. **Configure alert rules** by setting how many spans should trigger a warning or critical alert. You can also trigger when spans disappear entirely.
7. **Connect the incident workflow** to your on-call rotation, notification channels, or automated runbooks.
8. **Save** and monitor activity in the chart and incident timeline.

---

## Common scenarios

- **Latency guardrail**: Alert when a specific span spends more than two seconds over the last few minutes.
- **Error burst**: Monitor spans with status "Error" and signal when the count spikes.
- **Missing telemetry**: Raise an incident if a key span does not appear for several intervals.
- **Regional watch**: Filter by a region attribute to keep each deployment healthy.

---

## Keep alerts useful

- Use the preview every time you change filters so you know what will trigger.
- Add separate warning and critical rules to encourage early investigation without constant paging.
- Group monitors by feature area so the right teams own them.
- Review the monitor history after an incident to adjust thresholds and reduce noise.

---

## Quick troubleshooting

- **No spans match**: Double-check the span name and attributes, and widen the time window temporarily.
- **Too many alerts**: Narrow the filters, shorten the window, or increase the required count before an alert fires.
- **Alerts never clear**: Lower the duration threshold or adjust the criteria so they match your new steady state.

---

Trace monitors turn distributed tracing into actionable guardrails. Pair them with log and metric monitors to see the full picture: what happened, where it happened, and how big the impact is- all without writing a single query by hand.
