# Monitor Logs with OneUptime: Stay Ahead of Issues in Plain English

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, Observability, Logs, Logging, DevOps

Description: Learn how to create, tune, and act on OneUptime log monitors as an end user—no code or internal tooling knowledge required.

---

Log monitors keep a constant eye on the messages your applications send. When something unusual happens—errors spike, heartbeats disappear, or partners start failing—you get notified automatically. The experience is fully guided inside the dashboard, so you can set everything up with a few fields and a preview.

---

## What a log monitor gives you

- A rolling search over your log stream that reruns on a schedule you choose.
- Visual confirmation of what will match before you save anything.
- Automatic incidents or alerts when the number of matching logs crosses the threshold you set.
- Built-in history so you can spot trends and prove when the noise stopped.

---

## Create a log monitor step by step

1. **Open Monitors → New Monitor** and pick **Logs**.
2. **Give it a clear name** such as "Checkout errors" so teammates instantly know its purpose.
3. **Describe the log you care about** by filling in one or more of these fields:
   - Keywords or phrases that must appear.
   - How far back to look each time (for example, the last 1 minute or 15 minutes).
   - Optional filters like severity level, telemetry service, or specific log attributes (for example `env = production`).
4. **Use the preview panel** to confirm the monitor is catching the events you expect. Adjust filters until the preview looks right.
5. **Set how often to check** by choosing the monitoring interval (every minute, every five minutes, and so on).
6. **Review the default alert rule** (fires when at least one log matches) and add extra rules if needed, such as warning at 10 matches and critical at 50.
7. **Assign who should know** by connecting incidents to on-call policies, Slack channels, status pages, or automated workflows.
8. **Save** and let OneUptime handle the rest.

---

## Everyday use cases

- **Catch error spikes quickly** by watching for messages that contain "error" or specific exception names.
- **Detect silent systems** by flagging when expected logs do not show up within the chosen window.
- **Verify releases** by keeping temporary monitors for launch keywords during the rollout window.
- **Watch partner integrations** with attribute filters (such as `partner = shipping`) so third-party issues never surprise you.

---

## Tips for reliable alerts

- Start with a short time window (one or five minutes) for fast detection. Widen it later if you need more smoothing.
- Use the preview before saving every change. It shows exactly what will trigger.
- Layer multiple alert levels. A warning can start a conversation; a critical alert should wake someone up.
- Revisit the monitor timeline after incidents to tune thresholds and remove noise.

---

## Troubleshooting fast

- **Getting too many alerts?** Tighten the filters or raise the required count before alerts fire.
- **Not seeing any matches?** Expand the time window or remove extra filters to confirm the log is still being written.
- **Need to pause alerts?** Put the monitor into maintenance mode directly from the incident or monitor view.

---

Log monitors put the right information in front of the right people without touching code. Combine them with metric and trace monitors for a complete picture, and let OneUptime handle the repetitive work of watching your logs every minute of every day.
