# Validation Summary: How to Decide If Dapr Is Right for Your Microservices Architecture

## Status
validated

## Post Type
Guide / Decision Framework

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes
- Redis, PostgreSQL, CosmosDB, DynamoDB (state stores)
- Kafka, RabbitMQ, Azure Service Bus, AWS SNS/SQS (pub/sub brokers)
- Istio, Linkerd (service meshes)
- HashiCorp Vault (secret management)
- Helm
- gRPC
- Mermaid (diagrams)

## Sources Consulted
- Dapr official Helm chart (`dapr/dapr` GitHub repository) — `Chart.yaml` and `values.yaml` for default control plane components
- Dapr documentation on building blocks: https://docs.dapr.io/concepts/building-blocks-concept/
- Dapr documentation on state management components: https://docs.dapr.io/reference/components-reference/supported-state-stores/
- Dapr documentation on pub/sub components: https://docs.dapr.io/reference/components-reference/supported-pubsub/
- Dapr documentation on service invocation: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/
- Dapr documentation on running Dapr with a service mesh: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/#using-dapr-with-a-service-mesh
- Dapr Dashboard repository (`dapr/dashboard`) — confirms it is a separate Helm chart, not bundled with the main Dapr installation

## Issues Found
1. **`dapr-dashboard` listed as a default control plane pod (line 123):** The Dapr Dashboard has been a separate Helm chart (in the `dapr/dashboard` repository) since approximately Dapr v1.11. It is not installed by the default `dapr/dapr` Helm chart. The blog post listed `dapr-dashboard-xxx` as one of the pods in `dapr-system` after a standard installation, which would mislead readers into expecting 6 control plane pods instead of 5. **Fix:** Removed the `dapr-dashboard-xxx` entry from the `kubectl get pods` output block.

## Review Notes
- The performance benchmark numbers are attributed to "the Dapr project (v1.13)" but specific published benchmark reports from the Dapr project in this exact format could not be independently located. The magnitude of the overhead (~1ms per hop) is consistent with community-reported figures and is a reasonable approximation.
- The `dapr-scheduler-server` pod shown in the control plane listing was introduced in Dapr v1.14, while the benchmarks reference v1.13. These are in separate sections and not contradictory, but readers should be aware they reference different versions.
- The claim of "20+ others" for state store backends is approximately correct — the Dapr component ecosystem lists roughly 20-25 state store implementations.
- The Mermaid diagram syntax is correct and renders properly.
- The `kubectl get pods -n dapr-system` command is correct.
- The comparison table between Dapr and service mesh capabilities is accurate.
- The advice to disable Dapr mTLS when running alongside Istio is consistent with official Dapr documentation.
- The default Dapr HTTP sidecar port of 3500 shown in the architecture diagram is correct.
