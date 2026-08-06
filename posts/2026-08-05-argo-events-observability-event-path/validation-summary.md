# Validation Summary: Observe an Argo Event from Source to Workflow

## Status
validated

## Post Type
Technical observability guide

## Technologies Covered
- Argo Events EventSources, EventBus, Sensors, triggers, filters, logs, and Prometheus metrics
- Argo Workflows resources, CLI, metrics, logging, and OpenTelemetry tracing
- CloudEvents 1.0 context attributes and correlation identifiers
- Kubernetes manifests, RBAC, labels, label selectors, and `kubectl`
- Prometheus metrics and label-cardinality practices
- NATS JetStream and its Prometheus exporter
- Apache Kafka topics, consumer groups, lag, and retention
- Alpine Linux container images

## Sources Consulted
- [Argo Events Prometheus metrics](https://argoproj.github.io/argo-events/metrics/)
- [Argo Events parameterization](https://argoproj.github.io/argo-events/tutorials/02-parameterization/)
- [Argo Events Argo Workflow trigger](https://argoproj.github.io/argo-events/sensors/triggers/argo-workflow/)
- [Argo Events webhook event structure](https://argoproj.github.io/argo-events/eventsources/setup/webhook/)
- [Argo Events Kafka EventBus](https://argoproj.github.io/argo-events/eventbus/kafka/)
- [Argo Events JetStream EventBus](https://argoproj.github.io/argo-events/eventbus/jetstream/)
- [Argo Events Log trigger](https://argoproj.github.io/argo-events/sensors/triggers/log/)
- [Argo Events v1.9.11 EventSource publishing implementation](https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/eventsources/eventing.go)
- [Argo Events v1.9.11 Sensor logging and action metrics implementation](https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/sensors/listener.go)
- [Argo Events v1.9.11 Argo Workflow trigger implementation](https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/sensors/triggers/argo-workflow/argo-workflow.go)
- [Argo Workflows CLI: `argo get`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_get/)
- [Argo Workflows CLI: `argo logs`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_logs/)
- [Argo Workflows metrics](https://argo-workflows.readthedocs.io/en/latest/metrics/)
- [Argo Workflows tracing](https://argo-workflows.readthedocs.io/en/latest/tracing/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [CloudEvents specification](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md)
- [Prometheus metric and label naming](https://prometheus.io/docs/practices/naming/)
- [NATS monitoring JetStream](https://docs.nats.io/running-a-nats-service/nats_admin/monitoring/monitoring_jetstream)
- [Apache Kafka monitoring](https://kafka.apache.org/documentation/#monitoring)
- [Alpine Linux release branches](https://www.alpinelinux.org/releases/)

## Issues Found
- The post described the CloudEvent `id` as the source event identifier without stating its scope. Clarified that it must be interpreted together with the CloudEvent `source`, because CloudEvents defines uniqueness for the `(source, id)` pair.
- The multi-dependency statement also covered conditions that merely combine dependencies, which could include `A || B` and therefore need only one event. Narrowed it to conditions that require multiple dependencies.
- The quoted EventSource success message did not match the current implementation's capitalization and punctuation. Changed it to the exact current message, `Succeeded to publish an event`.
- The description of `argo_events_action_retries_failed_total` omitted that it also increments when no `retryStrategy` is configured. Corrected the metric description and changed the related dashboard and alert wording from retry exhaustion to final action failure.
- The send-failure alert could be read as testing a monotonically increasing counter directly against zero, which would remain firing after the first failure. Changed it to alert on a nonzero increase or rate over a sustained interval.
- The `alpine:3.20` example used a branch whose standard support ended on 2026-04-01. Updated it to the supported and available `alpine:3.24` image tag.
- The webhook documentation link was labeled as if it covered all EventSource structures. Corrected the link text to identify it as the webhook event structure.

## Review Notes
- The complete Sensor manifest passed the Argo Events linter from the current upstream source as of 2026-08-01. The embedded Workflow passed the current Argo Workflows offline linter, and the `alpine:3.24` image manifest was confirmed available.
- Automatic Workflow labels and structured-log field names are implementation details verified against Argo Events v1.9.11 and current upstream source. They should be rechecked when upgrading Argo Events.
- Argo Workflows tracing remains beta and may change incompatibly in a future minor release.
- All external links in the post returned HTTP 200 during validation.
