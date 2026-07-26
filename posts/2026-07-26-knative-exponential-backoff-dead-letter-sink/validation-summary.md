# Validation Summary: How to Configure Exponential Backoff and a Dead Letter Sink in Knative Eventing

## Status

validated

## Post Type

Technical tutorial and production reliability guide

## Technologies Covered

- Knative Eventing
- Knative Serving
- Kubernetes
- CloudEvents 1.0
- HTTP retry and dead letter delivery
- `kubectl`

## Sources Consulted

- [Knative handling delivery failure](https://knative.dev/docs/eventing/event-delivery/)
- [Knative Eventing API reference](https://knative.dev/docs/eventing/reference/eventing-api/)
- [Knative `DeliverySpec.RetryAfterMax` feature](https://knative.dev/docs/eventing/features/delivery-retryafter/)
- [Knative sinks and Destination resolution](https://knative.dev/docs/eventing/sinks/)
- [Knative Trigger documentation](https://knative.dev/docs/eventing/triggers/)
- [Knative Eventing shared HTTP retry implementation](https://github.com/knative/eventing/blob/defbb5343203f2275e2d8fe259e7df0c639024be/pkg/kncloudevents/retries.go)
- [Knative Eventing dispatcher and dead letter implementation](https://github.com/knative/eventing/blob/defbb5343203f2275e2d8fe259e7df0c639024be/pkg/kncloudevents/event_dispatcher.go)
- [CloudEvents 1.0.2 core specification](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/spec.md)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes `kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)

## Issues Found

- The opening and `retry` explanation implied that every failed request receives five retries. Knative's shared HTTP sender retries only selected failures, while non-retryable responses can be sent to the dead letter sink immediately. The wording now says that the policy requests up to five retries for failures the transport considers retryable.
- The Broker-default discussion did not state the defined override behavior. A Trigger-level delivery spec overrides the Broker-level delivery spec for that Trigger rather than merging individual omitted fields from the Broker spec. The post now states this explicitly.
- The failure-path test referred broadly to a non-retryable `4xx`, even though Knative's shared sender retries `404`, `408`, `409`, and `429`. The examples now use `400 Bad Request` for the non-retryable branch and `503 Service Unavailable` for the retryable branch, with a caveat for transports that do not use the shared sender.
- The verification section described `kubectl logs` output as Eventing metrics. The heading sentence now correctly identifies those commands as resource-status and application-log inspection.
- The alpha `Retry-After` section implied that enabling the feature gate alone was sufficient and did not distinguish the header cap from the normal backoff. It now explains that retries and a positive `retryAfterMax` value are required to opt in while the feature is alpha, and that the next delay is the larger of normal backoff and the capped header-derived duration.

## Review Notes

The `eventing.knative.dev/v1` Trigger, `spec.delivery` fields, ISO 8601 duration values, Destination reference, legacy `filter.attributes` syntax, and `kubectl` commands are valid. The legacy attributes filter remains supported across Broker implementations, although current Knative documentation recommends richer `filters` where the selected Broker supports them. Delivery-policy and `Retry-After` support still vary by Broker or Channel implementation, as the post notes.
