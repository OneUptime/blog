# How to Alert Only When an OpenSearch Monitor Changes State and Avoid Repeat Notifications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Alerting, Monitoring, Observability

Description: Configure per-alert execution for new and completed OpenSearch alerts while excluding deduplicated active alerts, with throttling as a separate safety control.

---

OpenSearch evaluates a monitor on its schedule. If an action runs per execution, a condition that remains true can notify on every run. Throttling reduces that frequency, but it does not mean “notify only on a state transition.”

For bucket-level monitors, the precise state-change design is a per-alert action that is actionable for `NEW` and `COMPLETED` alerts but not `DEDUPED` alerts. OpenSearch exposes the same categories to templates as `ctx.newAlerts`, `ctx.completedAlerts`, and `ctx.dedupedAlerts`.

## Understand the states and categories

An alert normally moves through these relevant states:

```text
condition false
     |
condition becomes true -> NEW / ACTIVE
     |
condition remains true -> DEDUPED / still ACTIVE
     |
condition becomes false -> COMPLETED
```

Acknowledging an alert is not resolution; it changes it to `ACKNOWLEDGED` while the condition may still be true. Define recovery from the monitor condition returning false, not from a human clicking acknowledge.

## Configure a per-alert execution policy

In the bucket-level monitor action UI, choose the option to run the action for each alert, then select the actionable alert categories for new and completed alerts. The corresponding API object is:

```json
"action_execution_policy": {
  "action_execution_scope": {
    "per_alert": {
      "actionable_alerts": ["NEW", "COMPLETED"]
    }
  }
}
```

Do not include `DEDUPED` when the requirement is transition-only notification. Preserve the other action fields generated for your installed version rather than replacing a whole monitor with this fragment.

This is materially different from per-execution scope, which invokes the action on monitor executions while the trigger is satisfied.

## Render open and recovery sections

One action can format whichever transition is present:

```mustache
Monitor: {{ctx.monitor.name}}
Trigger: {{ctx.trigger.name}}
Window: {{ctx.periodStart}} to {{ctx.periodEnd}}

{{#ctx.newAlerts}}
OPEN: {{bucket_keys}}
Alert ID: {{id}}
Severity: {{severity}}
{{/ctx.newAlerts}}

{{#ctx.completedAlerts}}
RESOLVED: {{bucket_keys}}
Alert ID: {{id}}
Started: {{start_time}}
Ended: {{end_time}}
{{/ctx.completedAlerts}}
```

Test the exact available fields in your version. The documented, stable distinction is the three alert arrays; individual serialized fields can evolve.

## Design the trigger to resist flapping

State-change delivery prevents repeated messages while a condition remains true, but a noisy metric crossing the threshold every few minutes still produces repeated open/recovery pairs.

Use signal logic to add hysteresis:

- open above a higher threshold and recover below a lower threshold;
- aggregate over a meaningful window rather than one sample;
- require a minimum document count;
- group only by stable dimensions;
- schedule frequently enough to detect the event but not faster than data arrives.

Some hysteresis designs require two triggers or an upstream derived signal. Document how their alert identities and recovery behavior interact before enabling paging.

## Treat throttling as a guardrail

Action throttling caps message frequency—for example, no more than once per hour. It is useful protection against configuration mistakes and channel outages. It can also delay or suppress a transition message depending on action behavior, so test open and recovery timing before relying on it.

If periodic “still firing” reminders are desired, that is a different policy: include deduplicated alerts or use a separate, deliberately throttled escalation action. Keep the page-on-transition action independent.

## Query-level and document-level caveats

Query-level monitors have one active alert at a time, but a normal per-execution action can still repeat while its trigger remains true. Do not try to force state changes by making the trigger condition inspect `ctx.alert` and return false on the next run; that artificially completes the alert and can create an open/complete loop.

Document-level monitors alert on matching documents, so a genuinely new document is a new alert rather than a repeat of one aggregate condition. Use per-alert execution and a stable query/window so the same document is not repeatedly rediscovered.

## Test the complete lifecycle

Use a non-production channel and controlled data:

1. Start below threshold; expect no action.
2. Cross threshold; expect one open notification.
3. Remain above for several runs; expect no transition notification.
4. Return below; expect one completed notification.
5. Cross again; expect a new open notification.

Inspect **Alerting > Alerts** or call the Alerts API after each step. Also test a monitor error: an execution failure is not the same as a clean recovery and should have its own operational handling.

## Official References

- [OpenSearch alert states](https://docs.opensearch.org/latest/observing-your-data/alerting/)
- [OpenSearch alerting actions and throttling](https://docs.opensearch.org/latest/observing-your-data/alerting/actions/)
- [OpenSearch trigger context arrays](https://docs.opensearch.org/latest/observing-your-data/alerting/triggers/)
- [OpenSearch Alerting API](https://docs.opensearch.org/latest/observing-your-data/alerting/api/)
