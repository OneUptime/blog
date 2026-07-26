# Validation Summary: Knative Broker Is Not Ready: How to Diagnose Configuration, Channel, and Data-Plane Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Knative Eventing
- Kubernetes
- Knative Broker and Trigger APIs
- MTChannelBasedBroker
- InMemoryChannel and KafkaChannel
- Knative Broker for Apache Kafka
- Knative RabbitMQ Broker
- CloudEvents HTTP binary content mode
- Kubernetes Services and EndpointSlices
- TLS, SASL, OIDC sender identity, and service-mesh policy

## Sources Consulted
- [Knative: Creating a Broker](https://knative.dev/docs/eventing/brokers/create-broker/)
- [Knative: Eventing API](https://knative.dev/docs/eventing/reference/eventing-api/)
- [Knative: Configure Broker defaults](https://knative.dev/docs/eventing/configuration/broker-configuration/)
- [Knative: Broker developer configuration options](https://knative.dev/docs/eventing/brokers/broker-developer-config-options/)
- [Knative: Channel based Broker](https://knative.dev/docs/eventing/brokers/broker-types/channel-based-broker/)
- [Knative: Knative Broker for Apache Kafka](https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/)
- [Knative: RabbitMQ Broker](https://knative.dev/docs/eventing/brokers/broker-types/rabbitmq-broker/)
- [Knative: Debugging Knative Eventing](https://knative.dev/docs/eventing/troubleshooting/)
- [Knative: Collecting Eventing logs](https://knative.dev/docs/eventing/observability/logging/collecting-logs/)
- [Knative: Transport Encryption](https://knative.dev/docs/eventing/features/transport-encryption/)
- [Knative: Sender Identity](https://knative.dev/docs/eventing/features/sender-identity/)
- [Knative Eventing source repository](https://github.com/knative/eventing)
- [Knative Kafka Broker source repository](https://github.com/knative-extensions/eventing-kafka-broker)
- [Knative RabbitMQ Eventing source repository](https://github.com/knative-extensions/eventing-rabbitmq)
- [Kubernetes: kubectl events](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/)
- [Kubernetes: kubectl auth can-i](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [Kubernetes: kubectl logs](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes: kubectl run](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes: CustomResourceDefinition categories](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/#categories)
- [CloudEvents HTTP protocol binding](https://github.com/cloudevents/spec/blob/main/cloudevents/bindings/http-protocol-binding.md)
- [Official curl container image tags](https://hub.docker.com/r/curlimages/curl/tags)

## Issues Found
- The post characterized every non-Ready Broker as primarily a control-plane failure. Readiness conditions can also depend on backing Channels, ingress or receiver workloads, dispatchers, EndpointSlices, and backing messaging systems. The text now describes an unresolved implementation-specific readiness dependency.
- The Kafka and RabbitMQ implementation names were not the exact Broker class strings. The text now names `Kafka`, `KafkaNamespaced`, and `RabbitMQBroker`.
- The configuration checks assumed that every `spec.config` reference points to a ConfigMap. The RabbitMQ implementation instead references a `RabbitmqBrokerConfig` custom resource. The checks and warning now apply to the referenced configuration object and explain the implementation-specific kind difference.
- The MTChannelBasedBroker discovery command queried several optional Channel resource types at once, so it could fail when an unrelated CRD was not installed. It also looked for Services only in the Broker namespace even though shared Broker Services can run in `knative-eventing`. The command now queries the exact Channel resource discovered from `channel-template-spec` and searches Services and EndpointSlices across namespaces.
- The native-Broker inventory used `kubectl get all`, which only expands resource types assigned to the `all` category and is not a complete custom-resource inventory. The post now queries Brokers and Triggers directly and tells readers to query discovered implementation resources explicitly.
- The post read the deprecated Kubernetes Endpoints API and sorted legacy Event fields. It now uses `discovery.k8s.io/v1` EndpointSlices and the current `kubectl events` command.
- The controller RBAC check tested only `get` access to Brokers, which does not prove that an informer can list and watch Brokers or that a controller can write Broker status. The checks now cover `list`, `watch`, and `update` access to the `status` subresource.
- `kubectl logs` defaults to only 10 lines per pod when a label selector is used. The controller log command now sets `--tail=-1` so that `--since=30m` actually returns all available lines from that interval.
- The data-plane probe used only `status.address.url`. Current Knative addresses can also advertise a private CA in `status.address.CACerts` and an OIDC audience in `status.address.audience`; ignoring those fields can make a healthy secured Broker appear broken. The post now records the complete address, explains the CA and token requirements, makes curl fail on HTTP errors, and defines success as a 2xx response.
- `kubectl run` treats arguments after `--` as image arguments unless `--command` is set. Because the curl image already has a curl entrypoint, passing `curl` as the first argument could make it an unintended URL. The probe now uses `--command` to run the intended command explicitly.
- The recovery checklist always expected a new `observedGeneration`. Repairing a referenced configuration object or another dependency does not necessarily increment the Broker's generation. It now waits for reconciliation and checks `observedGeneration` only when the Broker specification changed.
- Knative documentation says InMemoryChannel "should not" be used in production, not "must not." The wording was corrected to preserve the documented requirement level.
- RabbitMQ calls its receiving component an ingress, while Kafka uses receiver terminology. The implementation-neutral diagnostics now say ingress or receiver.

## Review Notes
- The post does not pin a Knative release. It was validated against the current Knative documentation and current upstream source on 2026-07-26; implementation-specific names and labels can still vary by installed release, which the post already tells readers to discover.
- `messaging.knative.dev/v1beta1` remains the served and storage API version for `KafkaChannel` in the current upstream Kafka Broker CRD and matches the current Knative channel-based Broker documentation.
- Knative transport encryption and sender identity are feature-gated. The basic curl probe is intentionally retained for unsecured/default installations, with explicit instructions for secured addresses.
- The `curlimages/curl:8.12.1` tag exists. The post appropriately advises using an organization-approved mirrored image.
- All six links in the post's Official Documentation section returned successful HTTP responses during validation.
