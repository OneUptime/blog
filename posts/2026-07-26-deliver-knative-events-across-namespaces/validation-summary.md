# Validation Summary: How to Deliver Knative Events Across Kubernetes Namespaces

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Knative Eventing
- Knative Serving
- Kubernetes namespaces
- Knative Brokers and Triggers
- Knative Broker for Apache Kafka
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- CloudEvents

## Sources Consulted

- [Knative sinks and Destination namespace behavior](https://knative.dev/docs/eventing/sinks/)
- [Knative cross-namespace event links](https://knative.dev/docs/eventing/features/cross-namespace-event-links/)
- [Knative Eventing feature configuration](https://knative.dev/docs/eventing/features/)
- [Knative Eventing API reference](https://knative.dev/docs/eventing/reference/eventing-api/)
- [Knative event-delivery configuration](https://knative.dev/docs/eventing/event-delivery/)
- [Knative Kafka Broker data-plane modes](https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/)
- [Knative Eventing Trigger reconciler source](https://github.com/knative/eventing/blob/defbb5343203f2275e2d8fe259e7df0c639024be/pkg/reconciler/broker/trigger/trigger.go)
- [Knative Kafka Broker Trigger reconciler source](https://github.com/knative-extensions/eventing-kafka-broker/blob/be8757253c2e467de3e8acc04f2876274e1b2208/control-plane/pkg/reconciler/trigger/trigger.go)
- [Knative Serving architecture](https://knative.dev/docs/serving/architecture/)
- [Knative Serving request flow](https://knative.dev/docs/serving/request-flow/)
- [Knative Serving route Service source](https://github.com/knative/serving/blob/cef8d7e092bfe16c7095c030a3372de8b7e8f588/pkg/reconciler/route/resources/service.go)
- [Kubernetes RBAC authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [kubectl auth can-i reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [Kubernetes NetworkPolicy](https://kubernetes.io/docs/concepts/services-networking/network-policies/)

## Issues Found

- The subscriber verification command read the Knative Service's `.status.url`, but Knative resolves a `Destination.ref` through the Addressable contract at `.status.address.url`. Changed the JSONPath to `.status.address.url` so it can be compared meaningfully with the Trigger's resolved `status.subscriberUri`.
- The NetworkPolicy guidance treated the Eventing dispatcher as the component that directly enters the Knative Service workload Pods. Knative Serving routes requests through its ingress or HTTP router and may also use the Activator before queue-proxy. Updated the guidance and discovery commands so policies on the workload account for the Serving data plane as well as the Eventing-side sender.
- The remote `brokerRef` example did not state the current implementation limitation. Upstream `MTChannelBasedBroker` supports this path, while the Knative Kafka Broker controllers continue to look up `spec.broker` in the Trigger's namespace and do not reconcile remote `brokerRef` Triggers. Added the limitation and strengthened the release-specific compatibility warning.
- The troubleshooting command assumed the Knative Service's route Service would have a directly useful EndpointSlice named for `ledger`. That Service can point at the Serving ingress, including through an `ExternalName`, so such an EndpointSlice may not exist. Replaced the command with inspection of the route's Kubernetes Service and Knative Revisions.

## Review Notes

The alpha `cross-namespace-event-links` API and its implementation coverage can change between Knative releases. The stable cross-namespace `Destination.ref.namespace` pattern remains preferable when the Trigger can stay with its Broker. YAML snippets were parsed successfully, and the documented `kubectl` command forms and flags match the current Kubernetes CLI reference.
