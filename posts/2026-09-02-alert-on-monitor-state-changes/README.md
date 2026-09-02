# How to Alert Only When an OpenSearch Monitor Changes State and Avoid Repeat Notifications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Alerting, Monitoring, Observability

Description: Configure per-alert execution for new and completed OpenSearch alerts while excluding deduplicated active alerts, with throttling as a separate safety control.

---

OpenSearch evaluates a monitor on its schedule. If an action runs per execution, a condition that remains true can notify on every run. Bucket-level per-execution actions are not throttled; in modes that do support throttling, it reduces frequency but does not mean “notify only on a state transition.”

For bucket-level monitors, the precise state-change design is a per-alert action that is actionable for `NEW` and `COMPLETED` alerts but not `DEDUPED` alerts. OpenSearch exposes the same categories to templates as `ctx.newAlerts`, `ctx.completedAlerts`, and `ctx.dedupedAlerts`.

## Understand the states and categories

A bucket alert normally moves through these per-run categories and persisted states:

```text
condition false
     |
condition becomes true -> category NEW; state ACTIVE
     |
condition remains true and is unacknowledged -> category DEDUPED; state ACTIVE
     |
condition becomes false -> category COMPLETED; state COMPLETED
```

Acknowledging an alert is not resolution; it changes it to `ACKNOWLEDGED` while the condition may still be true. Define recovery from the monitor condition returning false, not from a human clicking acknowledge.

## Configure a per-alert execution policy

In the bucket-level monitor action UI, choose the option to run the action for each alert, then select the actionable alert categories for new and completed alerts. The corresponding API action fragment is:

```json
{
  "action_execution_policy": {
    "action_execution_scope": {
      "per_alert": {
        "actionable_alerts": ["NEW", "COMPLETED"]
      }
    }
  }
}
```

Do not include `DEDUPED` when the requirement is transition-only notification. Preserve the other action fields generated for your installed version rather than replacing a whole monitor with this fragment.

This is materially different from per-execution scope, which invokes the action once for a monitor run and can include new, deduplicated, and completed alerts in one context. The current implementation falls back to per-execution when a monitor or trigger errors or when the run exceeds `plugins.alerting.max_actionable_alert_count` (50 by default); that fallback bypasses the per-alert category filter.

## Render open and recovery sections

During per-alert execution, OpenSearch puts the current alert in the matching array and leaves the other two arrays empty, so one action can format whichever transition is present:

```mustache
Monitor: {{ctx.monitor.name}}
Trigger: {{ctx.trigger.name}}
Window: {{ctx.periodStart}} to {{ctx.periodEnd}}

{{#ctx.error}}
ERROR: {{ctx.error}}
{{/ctx.error}}

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

For a per-alert action, throttling limits repeat executions of that action for the same alert-for example, to no more than once per alert per hour. It does not globally cap notifications across different bucket alerts. It is useful protection against configuration mistakes and channel outages. A `COMPLETED` transition that occurs within the throttle interval after `NEW` is skipped rather than queued for later, so the recovery notification can be suppressed. Test open and recovery timing before relying on it.

If periodic “still firing” reminders are desired, that is a different policy: include deduplicated alerts or use a separate, deliberately throttled escalation action. Keep the page-on-transition action independent.

## Query-level and document-level caveats

Query-level monitors maintain at most one in-progress alert per trigger, but their actions can still run on every execution while the trigger remains true, subject to acknowledgment and throttling. Do not try to force state changes by making the trigger condition inspect `ctx.alert` and return false on the next run; that artificially completes the alert and can create an open/complete loop.

Document-level monitors process individual newly indexed or updated documents. By default, each matching document produces a finding and alert rather than a repeat of one aggregate condition. The monitor tracks the last processed `_seq_no` per shard, so an unchanged document is not normally rediscovered on every run; updating the same document can cause it to be processed again. Use per-alert scope when you want one action invocation for each generated alert-this scope controls action batching, not document deduplication.

## Test the complete lifecycle

Use a non-production channel and controlled data:

1. Start below threshold; expect no action.
2. Cross threshold; expect one open notification.
3. Remain above for several runs; expect no transition notification.
4. Return below; expect one completed notification.
5. Cross again; expect a new open notification.

Inspect **Alerting > Alerts** or call the Alerts API after each step. Also test a monitor error: an execution failure is not the same as a clean recovery, and the current bucket runner falls back to per-execution scope to communicate it. Ensure the template renders `ctx.error` and give errors their own operational handling.

## Official References

- [OpenSearch alert states](https://docs.opensearch.org/latest/observing-your-data/alerting/)
- [OpenSearch alerting actions and throttling](https://docs.opensearch.org/latest/observing-your-data/alerting/actions/)
- [OpenSearch trigger context arrays](https://docs.opensearch.org/latest/observing-your-data/alerting/triggers/)
- [OpenSearch Alerting API](https://docs.opensearch.org/latest/observing-your-data/alerting/api/)
