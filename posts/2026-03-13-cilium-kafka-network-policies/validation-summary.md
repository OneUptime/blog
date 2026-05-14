# Validation Summary: Kafka Policies with Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- CiliumNetworkPolicy
- Cilium L7 Kafka policy
- Kubernetes
- Apache Kafka
- Hubble CLI
- eBPF and Envoy-based L7 policy enforcement

## Sources Consulted
- Cilium Layer 7 Kafka policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7/#kafka-beta
- Cilium Kafka security tutorial: https://docs.cilium.io/en/stable/security/kafka/
- Cilium v1.19 upgrade guide: https://docs.cilium.io/en/stable/operations/upgrade/
- Cilium v1.20 upgrade guide: https://docs.cilium.io/en/latest/operations/upgrade/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium `PortRuleKafka` API reference: https://pkg.go.dev/github.com/cilium/cilium/pkg/policy/api#PortRuleKafka
- Apache Kafka protocol API keys reference: https://kafka.apache.org/protocol#protocol_api_keys

## Issues Found
- The post described Kafka policies as current for `Cilium v1.10+`. Current Cilium documentation marks Kafka network policy support as deprecated in Cilium v1.18/v1.19 and removed in Cilium v1.20. I changed the prerequisite and wording to limit the guide to Cilium versions that still include Kafka-aware policy support.
- The admin policy used numeric Kafka protocol IDs for `apiKey` (`3`, `19`, `20`). Cilium's `PortRuleKafka.apiKey` field is a string matched against request names such as `metadata`, `createtopics`, and `deletetopics`. I changed the snippet to use string API key names and added `apiversions`, which Kafka clients commonly request.
- The validation section said a denied produce request should result in a generic network error or connection reset. Cilium's Kafka tutorial shows denied Kafka operations returning Kafka authorization failures such as `TopicAuthorizationException` / `TOPIC_AUTHORIZATION_FAILED`. I updated the expected result and diagram accordingly.
- The article referred to topic-level "allow and deny rules." Cilium Kafka rules in these examples are allowlist rules; non-matching Kafka requests are denied by policy. I changed the wording to "allowlist rules."
- The conclusion implied Kafka authentication setup is unnecessary in general. I narrowed the statement to avoiding Kafka ACL configuration for Cilium versions that still support Kafka-aware policies.

## Review Notes
- The Hubble examples use documented `hubble observe` filters such as `--namespace`, `--protocol`, `--verdict`, `--follow`, and `--type`; the local environment did not have the `hubble` binary installed, so CLI syntax was verified against official documentation rather than local `--help` output.
- Kafka-aware Cilium policies are deprecated and should not be used for new long-lived designs that need to upgrade to Cilium v1.20 or later.
