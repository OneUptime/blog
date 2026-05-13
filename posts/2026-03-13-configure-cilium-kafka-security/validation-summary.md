# Validation Summary: How to Secure a Kafka Cluster with Cilium

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- Kafka
- Hubble
- eBPF

## Sources Consulted
- Cilium documentation: Securing a Kafka Cluster: https://docs.cilium.io/en/stable/security/kafka/
- Cilium documentation: Layer 7 Policies, Kafka rules: https://docs.cilium.io/en/stable/security/policy/layer7/#kafka-beta
- Cilium documentation: Hubble setup and CLI access: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium documentation: Inspecting Network Flows with the CLI: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Kubernetes documentation: kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Cilium GitHub example manifests: https://raw.githubusercontent.com/cilium/cilium/1.19.4/examples/kubernetes-kafka/kafka-sw-app.yaml and https://raw.githubusercontent.com/cilium/cilium/1.19.4/examples/kubernetes-kafka/kafka-sw-security-policy.yaml

## Issues Found
- The Kafka deployment URL pointed to `examples/kubernetes-kafka/kafka.yaml` on the `main` branch, which returned 404. Updated it to the versioned Cilium `kafka-sw-app.yaml` example used by the official tutorial.
- The post referred to a `kafka-client` pod and `kafka:9092` service, but the official Cilium Kafka example deploys named client deployments and a `kafka-service` service. Updated the commands to select the correct demo pods and use the bundled `kafka-produce.sh` and `kafka-consume.sh` scripts.
- The policy used low-level `apiKey` values for produce/fetch without the supporting Kafka metadata/API-version requests. Updated the sample to use the documented `role: "produce"` and `role: "consume"` fields.
- The expected denial behavior said "Connection refused" or a Cilium error/drop. Cilium L7 policy violations return protocol-specific denied responses when possible, and the Kafka tutorial shows Kafka topic authorization errors. Updated the expected result and architecture diagram.
- The Hubble command filtered only `DROPPED` flows, but Cilium's L7 denial behavior is not necessarily a packet drop. Updated the command to observe flows to the Kafka workload without the dropped-verdict filter.
- The prerequisites listed a fixed `Cilium 1.6+` requirement and did not mention the current deprecation status. Updated the prerequisite to state that Kafka L7 policy support is required and is deprecated in current Cilium releases.
- The introduction implied that any pod can access any topic whenever network-level access control is absent. Clarified that this applies when Kafka ACLs or network-level controls are not in place.

## Review Notes
Kafka L7 policy is still documented by Cilium but marked deprecated and may be removed in a future release. This tutorial should be revisited before publication if it targets a later Cilium release.
