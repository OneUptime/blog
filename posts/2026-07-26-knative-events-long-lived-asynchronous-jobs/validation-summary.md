# Validation Summary: How to Run Long-Lived or Asynchronous Jobs from Knative Events

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Knative Eventing
- Knative JobSink
- Knative Brokers and Triggers
- CloudEvents 1.0
- Kubernetes Jobs
- Kubernetes batch job controls and TTL cleanup
- Durable queues, inboxes, and transactional outboxes
- Kueue and workflow or batch scheduling

## Sources Consulted

- [Knative JobSink documentation](https://knative.dev/docs/eventing/sinks/job-sink/)
- [Knative Eventing API reference](https://knative.dev/docs/eventing/reference/eventing-api/)
- [Knative handling delivery failure documentation](https://knative.dev/docs/eventing/event-delivery/)
- [Knative sinks and destinations documentation](https://knative.dev/docs/eventing/sinks/)
- [Knative Eventing overview](https://knative.dev/docs/eventing/)
- [Knative Serving autoscaling documentation](https://knative.dev/docs/serving/autoscaling/)
- [Knative Eventing JobSink dispatcher source](https://github.com/knative/eventing/blob/defbb5343203f2275e2d8fe259e7df0c639024be/cmd/jobsink/main.go)
- [Knative Eventing JobSink CRD source](https://github.com/knative/eventing/blob/defbb5343203f2275e2d8fe259e7df0c639024be/config/core/resources/jobsink.yaml)
- [Kubernetes Jobs documentation](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Kueue documentation for Kubernetes Jobs](https://kueue.sigs.k8s.io/docs/tasks/run/jobs/)
- [CloudEvents 1.0.2 core specification](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/spec.md)

## Issues Found

- The discussion of Trigger delivery settings implied uniform support across Broker implementations. Knative exposes `spec.delivery` on Trigger resources, but the supported retry and dead-letter behavior depends on the configured Broker class and, for an `MTChannelBasedBroker`, the backing Channel. The post now states this dependency and qualifies the Trigger retry behavior accordingly.

## Review Notes

- `JobSink` remains a `sinks.knative.dev/v1alpha1` API. Operators should verify the API served by their installed Knative Eventing release before deploying the examples.
- The container image digest is intentionally a placeholder and must be replaced with a valid `sha256` digest.
- `kubectl logs job/<job-name>` is valid, but a retried or parallel Job can have multiple Pods; inspect each Pod when investigating attempt-specific failures.
