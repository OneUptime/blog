# Observe an Argo Event from Source to Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Events, Observability, Prometheus, CloudEvent, Argo Workflows, Logging, OpenTelemetry

Description: Correlate CloudEvent IDs, Argo Events logs and metrics, EventBus backlog, and Workflow metadata across the complete event path.

---

Argo Events observability works best as a correlation chain, not as one dashboard counter. The EventSource creates or preserves a CloudEvent identity, the EventBus transports it, the Sensor logs the IDs that satisfied a trigger, and the Workflow trigger adds Sensor and trigger labels to the submitted Workflow.

The missing piece is usually deliberate propagation: a CloudEvent ID is not automatically a business idempotency key or a Workflow argument. Carry both explicitly so an operator can move from an external delivery to its final effect without searching by timestamp alone.

## Define the Correlation Identifiers

Use at least two identifiers:

- **source event ID**: the CloudEvent context `id`, interpreted together with `source`, useful for following one Argo delivery;
- **operation ID**: a producer-owned stable key for the logical business action, useful across provider retries and manual replay.

They solve different problems. A replay may create a new CloudEvent ID but should normally retain the same operation ID. Conversely, one CloudEvent can cause multiple triggers and Workflows.

Also record:

- CloudEvent `source`, `subject`, and `time`;
- provider delivery ID, Kafka topic/partition/offset, or queue message ID where available;
- EventSource, event name, Sensor, and trigger name;
- Workflow namespace, name, UID, phase, and completion time.

Do not place an unbounded event or operation ID in Prometheus labels. That creates high-cardinality time series. Put per-event identifiers in structured logs, Workflow arguments or annotations, and a trace/log backend.

## Carry the CloudEvent ID into the Workflow

This complete trigger resource maps context and data into Workflow arguments:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Sensor
metadata:
  name: workflow-router
  namespace: argo-events
spec:
  template:
    serviceAccountName: operate-workflow-sa
  loggingFields:
    environment: production
    owner: platform
  dependencies:
    - name: request
      eventSourceName: public-webhook
      eventName: submit
  triggers:
    - template:
        name: start-observed-workflow
        conditions: request
        argoWorkflow:
          operation: submit
          source:
            resource:
              apiVersion: argoproj.io/v1alpha1
              kind: Workflow
              metadata:
                generateName: observed-
              spec:
                entrypoint: main
                arguments:
                  parameters:
                    - name: event-id
                      value: unset
                    - name: event-source
                      value: unset
                    - name: event-subject
                      value: unset
                    - name: operation-id
                      value: unset
                templates:
                  - name: main
                    container:
                      image: alpine:3.24
                      command:
                        - sh
                        - -c
                      args:
                        - >-
                          printf 'event_id=%s source=%s subject=%s operation_id=%s\n'
                          '{{workflow.parameters.event-id}}'
                          '{{workflow.parameters.event-source}}'
                          '{{workflow.parameters.event-subject}}'
                          '{{workflow.parameters.operation-id}}'
          parameters:
            - src:
                dependencyName: request
                contextKey: id
              dest: spec.arguments.parameters.0.value
            - src:
                dependencyName: request
                contextKey: source
              dest: spec.arguments.parameters.1.value
            - src:
                dependencyName: request
                contextKey: subject
              dest: spec.arguments.parameters.2.value
            - src:
                dependencyName: request
                dataKey: body.operationId
              dest: spec.arguments.parameters.3.value
```

`contextKey` reads CloudEvent context; `dataKey` reads the EventSource-specific data object. The last path is correct for a generic webhook whose JSON body contains `operationId`. Change it for GitHub, Kafka, or another source only after checking that source's documented event structure.

Bind `operate-workflow-sa` to the minimum Workflow permissions required in the target namespace. The example omits that environment-specific Role and RoleBinding, but the Sensor pod must be authorized to submit the Workflow.

If a trigger condition requires multiple dependencies, one successful round has multiple source event IDs. The Sensor success log records all of them in `triggeredByEvents`. Carry a separate argument for each required dependency, or create a controlled correlation envelope before invoking the Workflow. Do not collapse several IDs into one without retaining the mapping.

## Use the Labels Argo Adds Automatically

When the Argo Workflow trigger submits a Workflow, the current implementation adds:

```text
events.argoproj.io/sensor
events.argoproj.io/trigger
events.argoproj.io/action-timestamp
```

The action timestamp value is Unix time in milliseconds. These labels identify the submitting Sensor and trigger, but they do not include the source CloudEvent ID.

Find submitted Workflows for one route:

```bash
kubectl -n argo-events get workflows \
  -l events.argoproj.io/sensor=workflow-router,events.argoproj.io/trigger=start-observed-workflow \
  --sort-by=.metadata.creationTimestamp
```

Then read the propagated identifiers:

```bash
argo get -n argo-events observed-abcde
argo logs -n argo-events observed-abcde
```

Keep Sensor and trigger names stable enough for dashboards. If they must change, treat that as an observability schema migration and update recording rules and alerts.

## Follow One Event Through Structured Logs

At the EventSource stage, current success logs include `eventSourceName`, `eventName`, `eventSourceType`, and `eventID`. The message is "Succeeded to publish an event" in the current implementation. That line establishes the source-to-EventBus boundary.

At the Sensor stage, successful action logs include `triggeredBy` dependency names and `triggeredByEvents` IDs. Failed actions log the trigger name and error. Filter errors are warnings; ordinary filter rejection is visible at debug level in current implementations.

A practical log query sequence is:

```text
providerDeliveryId -> EventSource eventID
eventID -> Sensor triggeredByEvents
Sensor + trigger -> Workflow labels
Workflow argument operation-id -> business-system record
```

Configure the log platform to parse JSON fields rather than treating each line as opaque text. Index low-cardinality route fields such as namespace, EventSource, event name, Sensor, and trigger. Keep event IDs searchable but do not promote them to global metric dimensions.

`spec.loggingFields` on a Sensor adds static key-value context such as environment or owner. It does not propagate a dynamic event ID and it does not change log level. Use it to make multi-cluster log queries unambiguous.

## Measure Each Argo Events Boundary

Generated EventSource and Sensor pods expose Prometheus metrics. The current official metric set includes:

| Stage | Metric | Meaning |
| --- | --- | --- |
| EventSource | `argo_events_event_service_running_total` | Configured event listeners actively running |
| EventSource | `argo_events_events_sent_total` | Events published successfully |
| EventSource | `argo_events_events_sent_failed_total` | EventBus publication failures |
| EventSource | `argo_events_events_processing_failed_total` | All processing failures, including send failures |
| EventSource | `argo_events_event_processing_duration_milliseconds` | Receive-to-EventBus-publish duration |
| Sensor | `argo_events_action_triggered_total` | Actions completed successfully |
| Sensor | `argo_events_action_failed_total` | Failed action attempts |
| Sensor | `argo_events_action_retries_failed_total` | Actions failed after retries were exhausted; also increments when no retry strategy is configured |
| Sensor | `argo_events_action_duration_milliseconds` | Trigger action duration |

The counters carry stable labels such as namespace, EventSource and event name, or Sensor and trigger. Build recording rules around expected route cardinality. A difference between source sends and actions is meaningful only after accounting for filters, multi-dependency conditions, multiple triggers, and intentional fan-out.

For a route expected to produce exactly one successful action per accepted source event, compare rates over a window and alert on a sustained gap. For `A && B`, `A || B`, or filtered routes, define the expected relationship explicitly instead of subtracting unrelated counters.

Duration metrics cover separate portions of the path. Event processing duration ends at EventBus publication; action duration begins after conditions are met. Neither measures time waiting in EventBus or pending dependency state. Calculate end-to-end age from a trustworthy producer/event timestamp carried into the Workflow, while also recording receipt times so clock skew is visible.

## Instrument the EventBus Gap

Argo Events counters show publication and action outcomes, but the wait between them belongs to the EventBus implementation.

For JetStream, observe the managed NATS exporter and stream/consumer state, including:

- stream messages and bytes versus limits;
- consumer pending and acknowledgment-pending work;
- redelivery and delivery attempts;
- stream and consumer replica health;
- leader changes, storage pressure, and publish errors.

For Kafka, observe:

- event-topic consumer-group lag by partition;
- oldest unprocessed record age;
- trigger and action topic health;
- consumer rebalances and partition assignment;
- under-replicated partitions, broker request failures, and retention pressure.

Backlog count alone can mislead when payload size or processing cost varies. Pair it with oldest-event age and measured drain rate. Alert before JetStream limits or Kafka retention can discard work.

## Connect to Argo Workflows Telemetry

Once the Workflow object exists, Argo Workflows has its own controller, executor, pod, archive, log, and custom metrics. Current Argo Workflows documentation also describes beta distributed tracing through OpenTelemetry.

Argo Events official documentation does not describe automatic OpenTelemetry span propagation from EventSource through Sensor into a Workflow. Treat the CloudEvent and operation IDs as the bridge:

1. propagate them into Workflow parameters;
2. add them to application log context;
3. attach the operation ID to application spans where safe;
4. store the resulting trace ID with the business operation;
5. link from the Workflow UI or log backend to that trace.

Do not assume the Argo Workflows controller trace begins at the external producer. It covers Workflow processing after submission. A log/trace correlation field is what joins the two telemetry domains.

## Build a Route Dashboard

For each important EventSource-to-trigger route, show:

- external ingress or source-consumer rate;
- EventSource successful and failed publication rate;
- EventBus backlog count and oldest age;
- Sensor successful, failed-attempt, and final-failure action rates;
- source and action duration;
- Workflow creation, pending, running, succeeded, failed, and error rates;
- duplicate operation rejections;
- downstream dependency saturation.

Annotate deployments, Sensor/EventSource generation changes, EventBus upgrades, credential rotations, and topic/stream retention changes. A flat action rate after a new filter may be intended; the deployment annotation provides the explanation.

Avoid dashboarding only pod readiness. A ready EventSource may have invalid broker ACLs, a ready Sensor may have a condition that never resolves, and a ready Workflow controller may be throttled by the Kubernetes API.

## Define Alerts That Point to a Stage

Useful alerts include:

- A nonzero EventSource send-failure increase or rate over a sustained interval;
- running event services below the configured expectation;
- EventBus oldest-message age approaching the route SLO;
- Sensor final action failures on any production trigger;
- action success rate unexpectedly below the route's accepted-event model;
- Workflow pending age or failure ratio above its budget;
- no successful synthetic event within its schedule.

Route alerts to the owner recorded in static metadata or configuration, not by parsing a free-form error. Include EventSource, event name, Sensor, trigger, namespace, EventBus, and a runbook link. Include an event ID only for a representative sample, not as an alert grouping label.

## Verify with a Synthetic Event

Send a harmless, uniquely identified synthetic event through the same network, authentication, EventSource, EventBus, Sensor, and Workflow admission path as production. Its Workflow should perform no external mutation beyond recording success.

Validate:

1. the EventSource log contains its CloudEvent ID;
2. source counters increment without a failure increment;
3. the Sensor success log contains the same ID;
4. the Workflow has automatic Sensor and trigger labels;
5. its parameters contain the event and operation IDs;
6. the Workflow completes within the route SLO;
7. the log or trace backend can retrieve the entire chain.

A synthetic that stops at the webhook only checks ingress. A synthetic that submits a Workflow directly bypasses Argo Events. The useful test crosses every owned boundary.

## Protect Telemetry Data

Event payloads may contain tokens, signatures, personal data, or proprietary objects. Keep normal logs to identifiers and routing metadata. Debug-level Sensor logs and the Log trigger can emit event data; enable them briefly, restrict access, and revert them.

Hash or tokenize sensitive operation IDs if operators only need equality. Define log, trace, metric, and Workflow archive retention separately. Observability should make a delivery explainable without becoming an uncontrolled copy of every payload.

## Official Documentation

- [Argo Events Prometheus metrics](https://argoproj.github.io/argo-events/metrics/)
- [Argo Events parameterization](https://argoproj.github.io/argo-events/tutorials/02-parameterization/)
- [Argo Events Argo Workflow trigger](https://argoproj.github.io/argo-events/sensors/triggers/argo-workflow/)
- [Argo Events webhook event structure](https://argoproj.github.io/argo-events/eventsources/setup/webhook/)
- [Argo Events Kafka EventBus](https://argoproj.github.io/argo-events/eventbus/kafka/)
- [Argo Events Log trigger](https://argoproj.github.io/argo-events/sensors/triggers/log/)
- [Argo Workflows metrics](https://argo-workflows.readthedocs.io/en/latest/metrics/)
- [Argo Workflows tracing](https://argo-workflows.readthedocs.io/en/latest/tracing/)

## Conclusion

Observe Argo Events by joining stable identities across stage-specific evidence. EventSource logs and counters prove publication, broker metrics expose waiting, Sensor logs and action counters prove condition and trigger outcomes, and automatic Workflow labels identify the submitting route. Propagate CloudEvent and business operation IDs into every Workflow, keep them out of high-cardinality metric labels, and verify the whole chain with a safe synthetic event.
