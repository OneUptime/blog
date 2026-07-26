# Validation Summary: Why Dead Letter Handling Fails Inside Knative Sequences—and How to Fix Each Step

## Status

validated

## Post Type

Technical guide and operational troubleshooting reference

## Technologies Covered

- Knative Eventing Sequences
- Knative Brokers, Triggers, Channels, and Subscriptions
- Knative KafkaChannel and Apache Kafka
- Knative Serving Services
- CloudEvents over HTTP
- Kubernetes and `kubectl`
- `jq`

## Sources Consulted

- [Knative Sequence concepts and generated resources](https://knative.dev/docs/eventing/flows/sequence/)
- [Knative Eventing API reference](https://knative.dev/docs/eventing/reference/eventing-api/)
- [Knative handling delivery failure](https://knative.dev/docs/eventing/event-delivery/)
- [Knative Subscriptions](https://knative.dev/docs/eventing/channels/subscriptions/)
- [Knative Channel types and defaults](https://knative.dev/docs/eventing/channels/channel-types-defaults/)
- [Knative Kafka Channel configuration](https://knative.dev/docs/eventing/configuration/kafka-channel-configuration/)
- [Knative sinks and Callable reply behavior](https://knative.dev/docs/eventing/sinks/)
- [Knative Sequence with Broker and Trigger example](https://knative.dev/docs/eventing/flows/sequence/sequence-with-broker-trigger/)
- [Knative Eventing v1.22.2 Sequence API source](https://github.com/knative/eventing/blob/knative-v1.22.2/pkg/apis/flows/v1/sequence_types.go)
- [Knative Eventing v1.22.2 generated Subscription source](https://github.com/knative/eventing/blob/knative-v1.22.2/pkg/reconciler/sequence/resources/subscription.go)
- [Knative Eventing v1.22.2 event dispatcher source](https://github.com/knative/eventing/blob/knative-v1.22.2/pkg/kncloudevents/event_dispatcher.go)
- [Knative Kafka Broker v1.22.0 KafkaChannel CRD](https://github.com/knative-extensions/eventing-kafka-broker/blob/knative-v1.22.0/control-plane/config/eventing-kafka-broker/100-channel/100-kafka-channel.yaml)
- [Knative Kafka Broker v1.22.0 response handling source](https://github.com/knative-extensions/eventing-kafka-broker/blob/knative-v1.22.0/data-plane/dispatcher/src/main/java/dev/knative/eventing/kafka/broker/dispatcher/impl/BaseResponseHandler.java)
- [CloudEvents HTTP protocol binding](https://github.com/cloudevents/spec/blob/main/cloudevents/bindings/http-protocol-binding.md)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes `kubectl describe` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/)
- [`jq` 1.7 manual](https://jqlang.org/manual/v1.7/)

## Issues Found

- The response-handling explanation treated every `2xx` response without a CloudEvent as successful empty output. This was too broad for a non-empty malformed response, which KafkaChannel can treat as a delivery failure. The text now specifically describes an empty response with no CloudEvent headers and notes the implementation-dependent malformed-response case.
- The dead-letter explanation implied that every failure exhausts the configured retry count. Knative retries only applicable failure classes, so the text now says delivery fails after any applicable retries.
- The dead-letter explanation did not distinguish subscriber-delivery failures from failures while forwarding a successful subscriber reply. Current Knative dispatchers send the Subscription's input event to the dead letter sink in both cases, not the failed reply CloudEvent. The text now states this explicitly.
- The suggested replay metadata named only the subscriber URI. Because a failure can occur on the reply edge, this was changed to the failed subscriber or reply destination URI.
- The KafkaChannel manifest omitted operational prerequisites needed for the example to become ready. The text now states that the referenced Services and Broker must exist and that `replicationFactor: 3` requires at least three Kafka brokers.

## Review Notes

- Reviewed against Knative Eventing v1.22.2 and Knative Kafka Broker v1.22.0, the current release line on the validation date.
- `KafkaChannel` remains a beta CRD with `messaging.knative.dev/v1beta1` in the reviewed Kafka release. Keeping the post's instruction to match the installed CRD version is appropriate.
- The YAML field names, retry/backoff values, Sequence status fields, `kubectl` commands, and `jq` filter were verified. The `jq` expression was also executed against representative Subscription JSON.
- Dead-letter CloudEvent enhancement remains Channel-implementation-dependent, so the post correctly advises against depending on the `knativeerror*` extensions.
