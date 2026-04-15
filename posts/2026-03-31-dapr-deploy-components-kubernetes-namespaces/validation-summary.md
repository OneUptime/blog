# Validation Summary: How to Deploy Dapr Components in Specific Kubernetes Namespaces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (namespaces, CRDs, kubectl)
- Dapr Component CRD (state stores, pub/sub)
- Dapr component scoping (namespace and app-level)
- Redis (state store)
- Apache Kafka (pub/sub)
- Helm (Dapr installation/configuration)

## Sources Consulted
- Dapr Component spec documentation: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr component scoping documentation: https://docs.dapr.io/operations/components/component-scopes/
- Dapr pub/sub namespaces documentation: https://docs.dapr.io/operations/components/setup-pubsub/pubsub-namespaces/
- Dapr Helm chart values (dapr_operator subchart): https://github.com/dapr/dapr/tree/master/charts/dapr
- Dapr operator source code (component filtering by namespace): https://github.com/dapr/dapr/blob/master/pkg/operator/api/components.go

## Issues Found

### Issue 1: `scopes` field incorrectly nested under `spec`
- **What was wrong:** The component scoping YAML example had the `scopes` field indented under `spec` (i.e., `spec.scopes`). In the Dapr Component CRD, `scopes` is a top-level field that sits alongside `spec`, not inside it.
- **What was changed:** Moved `scopes` and its list items to the top level of the Component resource, making it a sibling of `spec`.
- **Why:** The Dapr Component CRD schema defines `scopes` at the root level of the resource. Placing it under `spec` would cause it to be ignored, meaning the component would be accessible to all apps in the namespace instead of being restricted to the specified app IDs.

### Issue 2: Incorrect Helm command for cross-namespace component sharing
- **What was wrong:** The post claimed that setting `dapr_operator.watchInterval=30s` via Helm makes a component available cluster-wide. This is incorrect on two counts: (1) `watchInterval` controls the Dapr Watchdog's pod health-check polling interval, not namespace visibility; (2) Dapr sidecars enforce namespace isolation at the sidecar level — they only load components from their own namespace, regardless of operator configuration.
- **What was changed:** Replaced the incorrect Helm command and explanation with the correct approach: deploying the same Component definition in each namespace that needs access, with all copies pointing to the same backing service (Kafka cluster).
- **Why:** The Dapr operator source code confirms that `ListComponents` filters by the sidecar's namespace, and the informer filter silently drops component events from other namespaces. The official Dapr docs on multi-namespace pub/sub confirm the correct pattern is deploying Component manifests in each namespace.

## Review Notes
- The `sed -i` command in the "Migrating Components Across Namespaces" section uses GNU sed syntax. On macOS, `sed -i` requires an empty string argument (`sed -i ''`). This is a minor portability note, not an error, since Kubernetes environments typically run Linux.
- The post uses `apiVersion: dapr.io/v1alpha1` which is still current as of April 2026.
- The Redis state store metadata fields (`redisHost`, `redisPassword` with `secretKeyRef`) and Kafka pub/sub metadata fields (`brokers`, `consumerGroup`) are all correct and current.
- The `kubectl` commands for interacting with Dapr Component CRDs (using both `components.dapr.io` and shorthand `component`) are correct.
