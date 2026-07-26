# Validation Summary: How to Expose a Knative Kafka Broker Outside the Cluster Without Breaking CloudEvents

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Knative Eventing
- Knative Broker for Apache Kafka
- CloudEvents 1.0.2 HTTP and JSON formats
- Kubernetes Gateway API
- Kubernetes Services and EndpointSlices
- TLS and BackendTLSPolicy
- OIDC/JWT and mTLS authentication
- kubectl
- curl

## Sources Consulted
- [Knative Broker for Apache Kafka](https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/)
- [Knative Apache Kafka Broker with Isolated Data Plane](https://knative.dev/blog/articles/kafka-broker-with-isolated-data-plane/)
- [Knative Broker configuration and Istio JWT protection](https://knative.dev/docs/eventing/configuration/broker-configuration/)
- [Knative Eventing transport encryption](https://knative.dev/docs/eventing/features/transport-encryption/)
- [Knative Eventing YAML installation](https://knative.dev/docs/install/yaml-install/eventing/install-eventing-with-yaml/)
- [Knative Kafka Broker 1.22.2 release manifest](https://github.com/knative-extensions/eventing-kafka-broker/releases/download/knative-v1.22.2/eventing-kafka-broker.yaml)
- [Knative Kafka TLS networking 1.22.2 release manifest](https://github.com/knative-extensions/eventing-kafka-broker/releases/download/knative-v1.22.2/eventing-kafka-tls-networking.yaml)
- [Gateway API HTTPRoute](https://gateway-api.sigs.k8s.io/reference/api-types/httproute/)
- [Gateway API HTTP path redirects and rewrites](https://gateway-api.sigs.k8s.io/guides/user-guides/http-redirect-rewrite/)
- [Gateway API TLS configuration](https://gateway-api.sigs.k8s.io/guides/user-guides/tls/)
- [Gateway API ReferenceGrant](https://gateway-api.sigs.k8s.io/reference/api-types/referencegrant/)
- [Kubernetes Gateway API documentation](https://kubernetes.io/docs/concepts/services-networking/gateway/)
- [CloudEvents HTTP Protocol Binding 1.0.2](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/bindings/http-protocol-binding.md)
- [CloudEvents JSON Event Format 1.0.2](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/formats/json-format.md)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [curl command-line reference](https://curl.se/docs/manpage.html)

## Issues Found
- The Gateway API example did not state that HTTP path rewriting is an Extended conformance feature and is not supported by every Gateway implementation. The deployment note now requires confirming support for `HTTPRoutePathRewrite`, which provides the `URLRewrite` behavior used by the route.
- The strict transport-encryption note did not explicitly say that the backend reference must use the Service's HTTPS port. It now directs operators to change `backendRefs[].port` to `443` and configure `BackendTLSPolicy` with the Broker ingress hostname and advertised CA, preventing an unusable or insecure HTTP backend hop.
- The cross-namespace guidance omitted the namespace fields required on the references and did not name the authorization resource. It now specifies `parentRefs[].namespace` for a cross-namespace Gateway and `backendRefs[].namespace` plus a `ReferenceGrant` in the backend namespace for a cross-namespace Service.

## Review Notes
- The Kafka Broker ingress service and `/<namespace>/<broker>` routing behavior are correct for both shared `Kafka` and per-namespace `KafkaNamespaced` data planes.
- The Gateway and HTTPRoute use the current `gateway.networking.k8s.io/v1` API, and the `Exact` match with `ReplaceFullPath` preserves the Broker routing path.
- The binary and structured CloudEvent examples contain all required attributes and use the correct content types. HTTP header names are case-insensitive, so the examples' `Ce-*` capitalization is valid.
- The `kubectl` commands and JSONPath expression are valid. `curl --fail-with-body` requires curl 7.76.0 or newer.
- Authentication, rate limiting, request-size controls, and frontend mTLS details remain Gateway-implementation-specific, as the post correctly states.
