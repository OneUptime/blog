# Validation Summary: How to Send a Valid CloudEvent to a Knative Broker with curl

## Status
validated

## Post Type
Technical tutorial and troubleshooting guide

## Technologies Covered
- Knative Eventing Brokers and Triggers
- Knative Broker for Apache Kafka
- CloudEvents 1.0
- Kubernetes and `kubectl`
- HTTP and `curl`
- JSON and YAML

## Sources Consulted
- [Knative Eventing overview](https://knative.dev/docs/eventing/)
- [Knative Brokers](https://knative.dev/docs/eventing/brokers/)
- [Knative Broker configuration and curl example](https://knative.dev/docs/eventing/configuration/broker-configuration/)
- [Knative Trigger filtering](https://knative.dev/docs/eventing/triggers/)
- [Knative Eventing API reference](https://knative.dev/docs/eventing/reference/eventing-api/)
- [Knative Broker for Apache Kafka](https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/)
- [Knative Kafka Broker data-plane documentation](https://github.com/knative-extensions/eventing-kafka-broker/blob/main/data-plane/README.md)
- [Knative Apache Kafka Source log-verification example](https://knative.dev/docs/eventing/sources/kafka-source/)
- [CloudEvents 1.0.2 core specification](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/spec.md)
- [CloudEvents 1.0.2 HTTP protocol binding](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/bindings/http-protocol-binding.md)
- [CloudEvents 1.0.2 JSON event format](https://github.com/cloudevents/spec/blob/ce%40v1.0.2/cloudevents/formats/json-format.md)
- [Kubernetes `kubectl run` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/)
- [Kubernetes `kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [curl command-line reference](https://curl.se/docs/manpage.html)
- [Official curl container 8.12.1 release](https://github.com/curl/curl-container/releases/tag/8.12.1)

## Issues Found
- The routing-verification step told readers to compare the received "content type." For structured input, the outer HTTP `Content-Type` is `application/cloudevents+json`, while the CloudEvent data's media type is carried by `datacontenttype`; a Broker can also re-encode the event for downstream delivery. Changed the check to name `datacontenttype` explicitly so readers compare the CloudEvent attribute whose value should remain `application/json`.

## Review Notes
- The Trigger uses the legacy `spec.filter.attributes` exact-match form. Current Knative documentation recommends `spec.filters[].exact` where supported, but states that the legacy form remains supported for all users. The newer filter dialects are currently limited to the Apache Kafka and MTChannelBased Broker implementations, so the existing form was retained for broader Broker compatibility.
- The `curlimages/curl:8.12.1` image tag exists and includes the options used by the examples. It is intentionally pinned rather than current-latest.
- In current curl documentation, `--include` remains a functional alias even though the option's preferred long name became `--show-headers` in curl 8.10.0.
