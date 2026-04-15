# Validation Summary: How to Implement Data Residency Requirements with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Component YAML spec, state stores, scopes, sidecar annotations)
- Azure Cosmos DB (state.azure.cosmosdb Dapr component)
- AWS DynamoDB (state.aws.dynamodb Dapr component)
- Kubernetes (Deployments, Namespaces, NodeSelector, NetworkPolicy)
- Express.js (application-level middleware)
- jq / kubectl (auditing CLI)

## Sources Consulted
- Dapr Component spec and scopes documentation: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Azure Cosmos DB state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Dapr AWS DynamoDB state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-dynamodb/
- Dapr sidecar annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/#networkpolicy-v1-networking-k8s-io
- Kubernetes well-known labels (topology.kubernetes.io/region): https://kubernetes.io/docs/reference/labels-annotations-taints/

## Issues Found
1. **Misleading description of middleware type (line 110)**: The text described the Express.js code as a "Dapr middleware component," which is incorrect. Dapr middleware components are YAML-defined resources (e.g., `middleware.http.ratelimit`, `middleware.http.oauth2`). The code shown is standard Express.js application-level middleware. Changed "Add a Dapr middleware component to validate" to "Add application-level middleware to validate."

## Review Notes
- The Kubernetes Deployment YAML omits the required `spec.selector` field. This is acceptable for a blog post focused on showing Dapr-specific annotations and configuration, but readers should know they'll need to add a `selector` to create a valid Deployment manifest.
- The EU state store uses Azure Cosmos DB but the node selector references `eu-west-1` (an AWS region name). Azure region names differ (e.g., `westeurope`). This is not technically wrong (the `topology.kubernetes.io/region` label value depends on the cloud provider), but could confuse readers running on Azure AKS. A multi-cloud setup is a valid use case.
- The Express middleware intercepts incoming requests matching `/v1.0/state/:storeName/*`, which would only work if the service acts as a proxy for Dapr state operations. In a typical Dapr architecture, the application makes outbound calls to the sidecar. The pattern is valid but readers should understand this is for wrapping/proxying Dapr calls, not intercepting the app's own outbound requests to the sidecar.
- All Dapr component YAML structures (apiVersion, kind, metadata fields, spec fields, scopes placement) are correct per current Dapr documentation.
- The `kubectl get components` command correctly references the Dapr CRD resource type and the `jq` query is syntactically valid.
