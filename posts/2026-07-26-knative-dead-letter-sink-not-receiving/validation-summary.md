# Validation Summary: Knative Dead Letter Sink Is Not Receiving Failed Events: What to Check

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Knative Eventing
- Knative Brokers and Triggers
- Knative dead letter sinks and delivery policies
- MTChannelBasedBroker
- Knative Apache Kafka Broker and Kafka Channel
- InMemoryChannel
- Knative Serving
- Kubernetes and kubectl
- CloudEvents 1.0 over HTTP
- curl

## Sources Consulted
- [Knative: Handling delivery failure](https://knative.dev/docs/eventing/event-delivery/)
- [Knative: Eventing API reference](https://knative.dev/docs/eventing/reference/eventing-api/)
- [Knative: About Brokers](https://knative.dev/docs/eventing/brokers/)
- [Knative: Apache Kafka Broker](https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/)
- [Knative: Sinks and Destination fields](https://knative.dev/docs/eventing/sinks/)
- [Knative: Cross Namespace Event Links](https://knative.dev/docs/eventing/features/cross-namespace-event-links/)
- [Knative: Eventing metrics reference](https://knative.dev/docs/eventing/observability/metrics/eventing-metrics/)
- [Knative Eventing data-plane specification](https://github.com/knative/specs/blob/main/specs/eventing/data-plane.md)
- [Knative Eventing shared retry implementation](https://github.com/knative/eventing/blob/main/pkg/kncloudevents/retries.go)
- [Knative Eventing shared dispatcher and dead-letter handling](https://github.com/knative/eventing/blob/main/pkg/kncloudevents/event_dispatcher.go)
- [Knative Trigger reconciliation and Broker delivery fallback](https://github.com/knative/eventing/blob/main/pkg/reconciler/broker/trigger/trigger.go)
- [Knative Destination reference namespace validation](https://github.com/knative/pkg/blob/main/apis/duck/v1/knative_reference.go)
- [Knative Apache Kafka Broker HTTP retry implementation](https://github.com/knative-extensions/eventing-kafka-broker/blob/main/data-plane/dispatcher/src/main/java/dev/knative/eventing/kafka/broker/dispatcher/impl/http/WebClientCloudEventSender.java)
- [CloudEvents 1.0.2 core specification](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/spec.md)
- [CloudEvents 1.0.2 HTTP protocol binding](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/bindings/http-protocol-binding.md)
- [Kubernetes: kubectl logs](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes: JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [curl command-line manual](https://curl.se/docs/manpage.html)

## Issues Found
- The routing checklist required the effective policy to appear in the Trigger's `spec.delivery`, but a Trigger with no delivery override inherits the Broker's `spec.delivery`. Updated the checklist and inspection commands to cover both resources. Also noted `spec.brokerRef`, which is used when the alpha cross-namespace event-links feature is enabled.
- The subscriber-response explanation treated every `2xx` response as an unconditional acknowledgement. Current data planes can reject a malformed non-empty response while processing the reply path. Restricted the acknowledgement claim to empty `2xx` responses and clarified that a valid reply CloudEvent is returned with `200 OK` on a reply-capable path.
- The label-selector form of `kubectl logs` defaults to the last 10 lines. Added `--tail=-1` so the command actually returns all available matching logs from the requested 15-minute interval.
- The destination-resolution guidance implied that the cross-namespace event-links feature could authorize a Trigger's dead letter sink in another namespace. That feature applies to the Trigger-to-Broker link; ordinary Trigger subscriber and dead-letter `Destination.ref` values are same-namespace. Corrected the cause and explanation.
- A not-ready Knative Service is an endpoint-readiness problem but does not necessarily prevent its Addressable URI from resolving. Changed the diagnostic wording to distinguish a missing resolved URI from an unready destination.
- The metrics guidance implied that retry metrics are universally exposed. The Eventing specification does not mandate a telemetry interface, and the documented metrics vary by component and implementation. Qualified the advice and retained application-side attempt and dead-letter counts.

## Review Notes
- The `eventing.knative.dev/v1` Trigger delivery fields, `serving.knative.dev/v1` Service reference, ISO 8601 `PT2S` backoff delay, and `retry: 5` attempt count are current and valid.
- The retryable status list (`5xx`, `404`, `408`, `409`, and `429`) matches both Knative's shared Go sender and the current Apache Kafka Broker sender. Other ordinary `4xx` failures are not retried but can still proceed to the dead letter sink.
- The direct curl example is a valid binary-mode CloudEvent 1.0 request. `--fail-with-body`, `--include`, `--request`, and `--data-binary` are current curl options.
- Dead-letter diagnostic extensions are implementation-dependent. The names and empty/truncated-data caveat in the post match current Knative documentation and implementations.
- InMemoryChannel supports the listed delivery fields, but Knative documentation says it should not be used in production.
