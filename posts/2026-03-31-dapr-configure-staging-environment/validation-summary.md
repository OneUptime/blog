# Validation Summary: How to Configure Dapr for Staging Environment

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar-based distributed application runtime)
- Kubernetes (Deployments, Namespaces, Secrets)
- Helm (Dapr Helm chart installation)
- Azure Cosmos DB (Dapr state store component)
- Azure Service Bus Topics (Dapr pub/sub component)
- External Secrets Operator (ESO)
- Zipkin (distributed tracing)

## Sources Consulted
- Dapr Helm chart repository and Chart.yaml dependencies for subchart naming (`dapr_placement`, `dapr_sentry`, `dapr_operator`)
- Dapr documentation for `state.azure.cosmosdb` component metadata fields (`url`, `masterKey`, `database`, `collection`)
- Dapr documentation for `pubsub.azure.servicebus.topics` component metadata fields (`connectionString`, `consumerID`, `maxDeliveryCount`)
- Dapr annotations reference for sidecar resource annotations (`dapr.io/sidecar-cpu-request`, `dapr.io/sidecar-cpu-limit`, `dapr.io/sidecar-memory-request`, `dapr.io/sidecar-memory-limit`)
- Dapr Configuration CRD documentation for `spec.accessControl.defaultAction`, `spec.mtls`, and `spec.tracing` fields
- External Secrets Operator API version documentation (v1beta1 deprecation, v1 GA)

## Issues Found
1. **External Secrets Operator API version was deprecated**: The ExternalSecret resource used `apiVersion: external-secrets.io/v1beta1`, which is deprecated (marked with `+kubebuilder:deprecatedversion` in the ESO codebase). Updated to `apiVersion: external-secrets.io/v1`, which is the current GA version.

## Review Notes
- The Dapr Helm chart subchart `dapr_placement` is a StatefulSet. While `dapr_placement.replicaCount=1` is a valid Helm value path, in HA configurations the placement replica count may also be influenced by `global.ha.replicaCount`. For a staging environment with reduced replicas (as described in the post), explicitly setting it to 1 is appropriate.
- The `accessControl.defaultAction: allow` setting is noted in the post as more permissive than production for debugging purposes. This is technically valid but readers should be aware that even in staging, a more restrictive default with explicit allow policies is generally recommended.
- The `samplingRate: "0.1"` tracing configuration is correctly specified as a string, which is the expected type in the Dapr Configuration CRD despite some documentation pages listing it as an integer.
- All Dapr component types, metadata field names, annotation names, and Configuration CRD fields verified as correct and current.
