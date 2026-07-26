# Validation Summary: How to Connect Knative Eventing to Strimzi or Redpanda Kafka

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Knative Eventing
- Knative KafkaSource
- Knative native Kafka Broker and KafkaNamespaced Broker
- Apache Kafka protocol, listeners, metadata, and ACLs
- Strimzi Operator, Kafka listeners, and KafkaUser credentials
- Redpanda Kafka API and Kafka compatibility
- Kubernetes ConfigMaps, Secrets, NetworkPolicies, and kubectl JSONPath
- TLS, mutual TLS, SASL/PLAIN, and SASL/SCRAM
- kcat and librdkafka client configuration

## Sources Consulted
- Knative Apache Kafka Source documentation: https://knative.dev/docs/eventing/sources/kafka-source/
- Knative Broker for Apache Kafka documentation: https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/
- Knative Eventing API reference: https://knative.dev/docs/eventing/reference/eventing-api/
- Strimzi Deploying and Managing documentation: https://strimzi.io/docs/operators/latest/deploying.html
- Strimzi Custom Resource API reference: https://strimzi.io/docs/operators/latest/full/configuring
- Redpanda Kafka compatibility documentation: https://docs.redpanda.com/streaming/current/develop/kafka-clients/
- Redpanda authentication documentation: https://docs.redpanda.com/streaming/current/manage/security/authentication/
- Redpanda authentication on Kubernetes documentation: https://docs.redpanda.com/streaming/current/manage/kubernetes/security/authentication/k-authentication/
- Redpanda TLS with cert-manager on Kubernetes documentation: https://docs.redpanda.com/streaming/current/manage/kubernetes/security/tls/k-cert-manager/
- Apache Kafka 4.3 broker listener configuration: https://kafka.apache.org/43/configuration/broker-configs/#advertised.listeners
- Apache Kafka 4.3 authorization and ACL documentation: https://kafka.apache.org/43/security/authorization-and-acls/
- Apache Kafka 4.3 SSL hostname verification documentation: https://kafka.apache.org/43/security/encryption-and-authentication-using-ssl/
- Kubernetes kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- kcat project documentation: https://github.com/edenhill/kcat

## Issues Found
- The kcat example referred generically to a Kafka client configuration even though `kcat -F` reads librdkafka properties. Clarified that the mounted file must be a kcat/librdkafka client configuration.
- The metadata validation guidance assumed every advertised broker address was a hostname. Updated it to handle both DNS names and IP addresses and to require the corresponding DNS or IP subject alternative name in the TLS certificate.
- The post said post-bootstrap timeouts almost always indicate bad advertised listeners or blocked broker addresses. Changed this to "often" because those symptoms can also have other network or broker causes.
- The post said `SASL_PLAINTEXT` exposes credentials on the network without distinguishing SASL mechanisms. Clarified that it leaves Kafka traffic unencrypted and that SASL/PLAIN exposes the password, while SCRAM uses challenge-response and does not send the password in cleartext.

## Review Notes
- The `KafkaSource` uses the current `sources.knative.dev/v1` API and the documented `spec.net.sasl` and `spec.net.tls` Secret reference fields.
- The native Kafka Broker ConfigMap keys, Secret keys, supported SASL mechanisms, cross-namespace ConfigMap reference, and same-namespace Secret requirement match current Knative documentation.
- The `KafkaNamespaced` Broker class and its same-namespace ConfigMap constraint remain current, with one data plane shared by the namespaced Kafka Brokers in that namespace.
- The Strimzi listener-status JSONPath expressions, bootstrap service convention, cluster CA Secret key, SCRAM password key, and TLS KafkaUser certificate keys match current Strimzi documentation.
- The Redpanda guidance correctly distinguishes the Kafka API from the Admin API, HTTP Proxy, and Schema Registry and accounts for Redpanda's documented Kafka compatibility exceptions.
- The YAML snippets are syntactically valid. Placeholder credentials and certificate data must be replaced by the deployment's secret-management process before applying them.
