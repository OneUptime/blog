# How to Prevent OneUptime Alert Storms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OneUptime, Alerting, Incident Management, Monitoring, Troubleshooting

Description: Reduce OneUptime alert storms with monitor dependencies, stable evaluation windows, acknowledgement behavior, and notification rollup.

---

An alert storm usually has three different causes: many checks report one shared failure, an unstable signal flips repeatedly, or notifications continue after a responder has taken ownership. OneUptime has controls for each case, but they are not one universal cooldown switch.

In OneUptime 12.0.33, use dependencies, monitor evaluation settings, acknowledgement-aware escalation and reminders, and automatic email rollup as distinct layers.

## Suppress symptoms behind a failed dependency

Open a child monitor's **Monitor Dependencies** page and add its upstream monitor under **Depends On Monitors**. For example:

```text
Internet edge
  -> public API
     -> checkout API
        -> synthetic checkout
```

If the Internet-edge parent is in a configured suppressing status, OneUptime continues evaluating the child and recording its status timeline but suppresses creation of redundant alerts and incidents for that child. When no explicit suppression statuses are selected, the dependency logic uses offline statuses.

Model causal dependencies only. A database and a CDN can both affect checkout, but that does not mean the CDN monitor depends on the database. Incorrect edges hide independent failures. OneUptime also guards against cycles, so keep the graph shallow and reviewable.

Test by failing a parent in a maintenance-safe environment and confirming the child records its condition without generating another page.

## Stabilize the signal before alert creation

For API monitors, criteria can evaluate a window of past checks instead of only the latest result. Choose an aggregate and a duration that reflects the service objective. `Any Value` reacts as soon as one sample breaches; `All Values` waits until the window is genuinely covered and every sample matches. The `If No Data` choice decides whether missing history is ignored, triggers, or counts as zero.

A practical design is:

- retry a brief network failure at the monitor level
- require a sustained breach for a noisy latency threshold
- treat missing data as failure only for heartbeat-style monitors
- use a shorter window for severe availability failures than for performance degradation

Long windows with sustained-breach or averaging criteria can reduce noise but delay detection; `Any Value` can still match on the first breach. Record that cost explicitly.

## Stop escalation when someone owns the event

Acknowledgement stops pending on-call policy execution, including remaining escalation steps and repeats. Configure policy repeats for events that remain unacknowledged. For alert and incident reminders, select whether reminders stop at the acknowledged state or continue until resolution.

Acknowledgement does not fix the service and should not erase the alert. It changes the human-notification state: somebody has accepted responsibility. Track unresolved acknowledged incidents separately so quiet does not become forgotten.

## Understand automatic email rollup

OneUptime automatically rolls up owner and member email bursts. For each recipient, project, email address, and category, the first four messages in a ten-minute window are immediate. The fifth and later messages are held for a grouped email about five minutes later. Each rollup carries at most 500 notifications, with overflow queued for later rollups, and renders at most 100 resource rows. Notifications are grouped by resource, so the email can show the latest state and an update count rather than every event separately; beyond the row limit, it shows totals and a project link.

This does not apply to on-call paging, account security, instance-health warnings, status-page subscribers, or non-email channels. A user can disable rollup for one project under **User Settings > Notification Settings**. Rollup limits inbox volume after events exist; it does not suppress alert or incident creation.

## Be precise about cooldowns

Current OneUptime documentation and the 12.0.33 settings do not establish a general, user-configurable cooldown that deduplicates every alert source. Do not tell operators to find a global cooldown field that is not there.

Use the concrete controls instead:

- dependency suppression for one upstream cause
- retries and period-based criteria for transient signal noise
- acknowledgement and reminder stop states for responder noise
- notification rollup for owner email volume
- a workflow with an explicit deduplication key and state store if a custom integration requires a true cooldown

The last item is a design you build, not a verified built-in cooldown feature. Document its key, expiry, and failure behavior.

## Measure the result

Track alerts per incident, pages per acknowledged incident, duplicate notifications per recipient, and detection delay. Run a parent-dependency test, a flapping-signal test, and an unacknowledged escalation test. Review suppressed-event logs so the team can detect an overbroad dependency graph.

## Conclusion

Prevent alert storms at the correct layer. Suppress known downstream symptoms, stabilize noisy criteria, stop paging after acknowledgement, and let rollup batch informational email. OneUptime provides those specific mechanisms, not one global cooldown control.

## Official Documentation

- [OneUptime API monitor evaluation windows](https://oneuptime.com/docs/en/monitor/api-monitor)
- [OneUptime 12.0.33 notification email rollup](https://github.com/OneUptime/oneuptime/blob/12.0.33/App/FeatureSet/Docs/Content/en/emails/notification-rollup.md)
- [OneUptime 12.0.33 monitor dependency interface](https://github.com/OneUptime/oneuptime/blob/12.0.33/App/FeatureSet/Dashboard/src/Pages/Monitor/View/Dependencies.tsx)
- [OneUptime 12.0.33 dependency suppression logic](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Utils/Monitor/MonitorDependencySuppression.ts)
- [OneUptime incident states](https://oneuptime.com/docs/en/incidents/states-and-severities)
