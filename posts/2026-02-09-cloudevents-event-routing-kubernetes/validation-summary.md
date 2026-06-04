# Validation Summary: How to Build CloudEvents-Based Event Routing Pipelines on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- CloudEvents
- Knative Eventing
- Knative Serving
- Knative Broker for Apache Kafka
- Apache Kafka
- Python
- Flask
- Prometheus client for Python
- Docker

## Sources Consulted
- CloudEvents specification: https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md
- CloudEvents Python SDK on PyPI: https://pypi.org/project/cloudevents/2.1.0/
- Knative Eventing YAML installation docs: https://knative.dev/docs/install/yaml-install/eventing/install-eventing-with-yaml/
- Knative Kafka Broker installation docs: https://knative.dev/docs/install/eventing/kafka-install/
- Knative Kafka Broker configuration docs: https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/
- Knative Trigger filtering docs: https://knative.dev/v1.20-docs/eventing/triggers/
- Knative Sequence docs: https://knative.dev/docs/eventing/flows/sequence/
- Knative Broker address documentation: https://knative.github.io/docs/docs/eventing/broker/
- Knative Serving installation file reference: https://knative.dev/docs/install/yaml-install/serving/serving-installation-files/

## Issues Found
- The Knative Eventing and Kafka install commands used older `knative-v1.12.0` release URLs. Updated them to `knative-v1.22.0`, matching the current Knative documentation reviewed on 2026-06-04.
- The Kafka Broker install commands referenced the old `knative-sandbox/eventing-kafka-broker` repository. Updated them to `knative-extensions/eventing-kafka-broker`, which is the repository used by current official Knative docs.
- The tutorial used Knative Serving services but did not state the Serving prerequisite. Added a concise note that Knative Serving, including a networking layer, must already be installed.
- The YAML examples place resources in the `events` namespace but did not create it. Added an idempotent namespace creation command.
- The Sequence example uses `InMemoryChannel`, but the setup commands did not install the in-memory channel implementation. Added the official `in-memory-channel.yaml` install command.
- The Python examples imported `CloudEvent`, `from_http`, and `to_structured` from `cloudevents.http`, which is not available in the current `cloudevents` 2.1.0 package. Updated imports to `cloudevents.v1.http` and verified the examples compile and their imports/definitions execute.
- The high-value order trigger comment said advanced filtering requires custom implementation. Updated it to say payload-based amount filtering requires custom implementation, because Knative supports advanced attribute filters, but the example does not promote the order amount into a CloudEvents attribute.

## Review Notes
- The post still uses Knative's legacy `filter.attributes` syntax for Triggers. This remains supported for backward compatibility, though current Knative docs recommend the newer `filters` field where possible.
- The broker URL format `/events/kafka-broker` matches Knative Kafka Broker addresses for a broker named `kafka-broker` in the `events` namespace.
- The CloudEvents source values in the examples are valid URI references, though absolute URIs are recommended by the CloudEvents specification for broader interoperability.
