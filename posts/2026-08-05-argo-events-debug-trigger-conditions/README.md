# Debug Argo Events Trigger Conditions Not Met

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Events, Sensor, Trigger Conditions, Debugging, EventBus, Filters, Kubernetes

Description: Diagnose Argo Sensor conditions systematically by tracing dependency identity, filters, cached state, resets, and EventBus delivery.

---

When an Argo Sensor does not fire, "trigger conditions not met" is a state description, not a root cause. The missing dependency may never have reached the EventSource, may have failed EventBus publication, may use the wrong source or subject, may have been rejected by a filter, or may have been cleared by a condition reset.

Debug the path in that order. Starting at the Workflow trigger often wastes time because no trigger code runs until the dependency expression evaluates to true.

## Understand the State Argo Is Evaluating

A Sensor dependency has three distinct identifiers:

```yaml
spec:
  dependencies:
    - name: approval
      eventSourceName: release-signals
      eventName: approved
```

- `name` is local to the Sensor and appears in `conditions`.
- `eventSourceName` must match the EventSource object's metadata name, and the CloudEvent source Argo publishes.
- `eventName` must match the key under the EventSource type, and the CloudEvent subject.

For example:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: EventSource
metadata:
  name: release-signals
spec:
  webhook:
    approved:
      port: "12000"
      endpoint: /approved
      method: POST
```

The matching Sensor dependency is `eventSourceName: release-signals` and `eventName: approved`; the HTTP path `/approved` is not the event name.

Each trigger has its own dependency expression. If `template.conditions` is omitted, Argo uses AND across every dependency defined on the Sensor. A new dependency added for another purpose can therefore stop an existing conditionless trigger. Set explicit conditions when triggers use different subsets.

## Read the Rendered Sensor Before Its Logs

Start with the object accepted by the API server:

```bash
kubectl -n argo-events get sensor workflow-router -o yaml
kubectl -n argo-events describe sensor workflow-router
kubectl -n argo-events get deployment -l sensor-name=workflow-router
kubectl -n argo-events get pods -l sensor-name=workflow-router -o wide
```

Confirm:

- the expected generation and spec are present;
- dependency names exactly match the condition expression;
- only documented operators `&&`, `||`, and parentheses are used;
- the Sensor references the intended `eventBusName`;
- a generated Deployment exists and has ready pods;
- the service account and trigger RBAC are correct.

An expression such as `(image || chart) && approval` is valid. Values such as `AND`, `&`, commas, or event names in place of dependency names are not equivalent.

The Sensor status reports resource health, not a public live dump of every cached dependency event. Do not expect `kubectl get sensor -o yaml` to show which half of `A && B` is currently stored.

## Prove the EventSource Published the Event

Inspect all EventSource replicas with pod prefixes:

```bash
kubectl -n argo-events logs \
  -l eventsource-name=release-signals \
  --all-containers=true \
  --prefix=true \
  --since=15m
```

Look for the configured event name, source type, and a successful publication containing an event ID. A provider's HTTP `2xx`, Kafka producer acknowledgment, or GitHub delivery record proves only that it reached some ingress boundary. The EventSource success log and `argo_events_events_sent_total` prove Argo published a CloudEvent to its EventBus.

Use source metrics to classify the failure:

- `argo_events_events_processing_failed_total` is the superset of all processing failures, including EventBus send failures;
- `argo_events_events_sent_failed_total` specifically counts failures to send to EventBus;
- no change in `argo_events_events_sent_total` suggests the configured listener did not publish that event.

For an active-passive EventSource, inspect every replica but identify the leader. A quiet standby is normal. For an active-active webhook source, confirm the Service and ingress include all ready endpoints.

## Verify CloudEvent Source and Subject

Argo routes Sensor dependencies using CloudEvent source and subject. EventSource logs include `eventSourceName`, `eventName`, and `eventID`; current debug logs also identify source type. Compare those values directly with the Sensor dependency.

Common mismatches include:

- renaming the EventSource metadata but not the Sensor;
- renaming a configuration key under `spec.webhook`, `spec.github`, or another source type;
- deploying the Sensor to a namespace with a different EventBus;
- sending a request to a similarly named EventSource Service;
- copying an environment-specific event name into production.

Make one test event carry a unique correlation value. Avoid relying only on timestamps when several replicas interleave structured logs.

## Evaluate Transforms and Filters Next

Sensor transformation occurs before dependency filtering. A failed Lua or JQ transform discards the event for that dependency. A filter error, including a missing JSON path, is treated as false by the documented filter behavior.

Temporarily set Sensor logging to debug through its pod template:

```yaml
spec:
  template:
    container:
      env:
        - name: LOG_LEVEL
          value: debug
```

This changes the Sensor resource and rolls its pods, so use it as a controlled diagnostic change and revert it afterward. Debug logs can include event data. Do not enable them broadly when payloads contain credentials, personal data, or proprietary content.

Then inspect Sensor logs:

```bash
kubectl -n argo-events logs \
  -l sensor-name=workflow-router \
  --all-containers=true \
  --prefix=true \
  --since=15m
```

Current implementations log filter errors at warning level and ordinary filter rejection at debug level. A filter path must address the EventSource-specific `data` object. Generic webhook data uses `body` and singular `header`; GitHub data uses `body` and plural `headers`; Kafka data includes `body`, `topic`, `partition`, `timestamp`, and headers. Confirm the source's documented event structure before editing a path.

For numeric dependency filters, inspect the event value and configure the DataFilter `type` and comparator deliberately. `useRawData` is separate: it controls whether a resolved trigger parameter is injected as a native JSON value or converted to a string after the condition has fired.

## Read Dependency-State Logs by EventBus

Log wording and state storage vary by EventBus implementation.

For current JetStream Sensors, logs can include:

```text
Current state of dependencies: map[approval:true image:false]
dependency expression false: image&&approval
```

When the expression becomes true, the Sensor executes the action and clears the stored dependency set for that trigger. JetStream persists pending dependency information in its key-value state used by the Sensor implementation; do not mutate it as a debugging shortcut.

For current Kafka EventBus Sensors, evaluation logs include the expression and boolean parameter map. Kafka uses Sensor-specific trigger and action topics for coordination across active replicas. Inspect all Sensor pods because partitions and work are distributed.

Legacy NATS Streaming logs may use the literal phrase `trigger conditions not met`. Do not build parsing or alerts around one exact log string across every EventBus and release. Prefer structured labels, event IDs, metrics, and a synthetic path.

## Account for Latest-Event Semantics

For `A && B`, the Sensor stores dependency state until the expression is satisfied. If `a1` through `a10` arrive before `b1`, official documentation says `a10` and `b1` are used and `a1` through `a9` are dropped from the combination.

This explains cases where the trigger eventually fires but contains an unexpected payload. It also means a Sensor condition is not a lossless stream join. If each A must pair with a B, correlate in a durable application or stream processor and send the completed pair as one event.

With `A || B`, a parameter sourced from the absent dependency is skipped, so the destination keeps its template value; set `src.value` when that branch needs a deterministic fallback. A bad key on a dependency that is present errors if no default is defined. Test both branches independently.

## Check Condition Resets and Time Zones

`conditionsReset` prevents stale partial matches from surviving a boundary:

```yaml
spec:
  triggers:
    - template:
        name: daily-release
        conditions: build && approval
        conditionsReset:
          - byTime:
              cron: "59 23 * * *"
              timezone: Europe/London
        # Complete trigger configuration follows.
```

The documented default time zone is UTC. A wrong IANA time zone, daylight-saving assumption, or cron time can clear `build` just before `approval` arrives. Current Sensor startup also calculates the previous scheduled reset so that old state does not survive a restart past the boundary.

Log the event context time, the reset time zone, and the Sensor pod time together. The CloudEvent time describes the event; it is not necessarily when the Sensor received it.

## Use a Temporary Log Trigger Carefully

Argo Events has a Log trigger intended for debugging, but it runs only when its own condition is satisfied. Adding a conditionless Log trigger to a multi-dependency Sensor defaults to AND across all dependencies and does not reveal the missing side.

Instead, create a temporary, tightly scoped trigger with an explicit single dependency:

```yaml
spec:
  triggers:
    - template:
        name: debug-approval
        conditions: approval
        log: {}
```

This shows events that already passed the dependency's transform and filters. To inspect an event before those filters, use an isolated temporary Sensor whose dependency omits them. Remove the diagnostic trigger promptly, restrict log access, and never dump unredacted production secrets.

## Distinguish Condition Failures from Trigger Failures

Once conditions resolve true, trigger logs include the dependencies and CloudEvent IDs that caused execution. Current successful-action logs use fields such as `triggeredBy` and `triggeredByEvents`.

The metrics provide a clean boundary:

- if `argo_events_action_triggered_total` increases, conditions were met and the action succeeded;
- if `argo_events_action_failed_total` increases, conditions were met but execution or policy failed;
- if `argo_events_action_retries_failed_total` increases, the action exhausted its configured attempts, or failed with no retry strategy;
- if source sends increase while all action counters stay flat, investigate subscription identity, transforms, filters, and conditions.

There is no documented built-in counter for "condition remained false." Build an alert from an expected source-to-action rate relationship only when the business mapping is truly one-to-one.

## Follow a Deterministic Runbook

For one uniquely identified test event:

1. confirm it reached the external source or webhook ingress;
2. find its EventSource publication log and CloudEvent ID;
3. verify source and subject match the dependency triple;
4. confirm the intended Sensor pod is subscribed to the correct EventBus;
5. inspect transform and filter results;
6. read the expression and dependency-state log;
7. check the last condition reset boundary;
8. when the expression becomes true, follow `triggeredByEvents` into the action;
9. use action metrics and target logs for post-condition failures;
10. revert debug logging and remove diagnostic triggers.

Change one variable at a time. Sending many test events can overwrite the cached "latest" dependency and make the evidence harder to interpret.

## Official Documentation

- [Argo Events trigger conditions](https://argoproj.github.io/argo-events/sensors/trigger-conditions/)
- [Argo Events multiple-dependency semantics](https://argoproj.github.io/argo-events/sensors/more-about-sensors-and-triggers/)
- [Argo Events Sensor filters](https://argoproj.github.io/argo-events/sensors/filters/intro/)
- [Argo Events DataFilter](https://argoproj.github.io/argo-events/sensors/filters/data/)
- [Argo Events transformations](https://argoproj.github.io/argo-events/sensors/transform/)
- [Argo Events parameterization](https://argoproj.github.io/argo-events/tutorials/02-parameterization/)
- [Argo Events Log trigger](https://argoproj.github.io/argo-events/sensors/triggers/log/)
- [Argo Events Prometheus metrics](https://argoproj.github.io/argo-events/metrics/)
- [Argo Events Kafka EventBus topics](https://argoproj.github.io/argo-events/eventbus/kafka/)

## Conclusion

Debug a false condition from source to state: prove publication, match CloudEvent source and subject, inspect transformations and filters, then read the EventBus-specific dependency map and reset boundary. The Sensor custom resource does not expose a live dependency cache, and a Log trigger sees only the condition assigned to it. Unique event IDs, temporary debug logs, stage-specific metrics, and one-event-at-a-time tests turn "conditions not met" into a precise, reproducible cause.
