# Validation Summary: How to Set Up DAPR Sidecar Injection on AKS for Microservice Communication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes
- Dapr
- Dapr sidecar injection
- Helm
- Service invocation
- Pub/sub
- Azure Service Bus
- Node.js

## Sources Consulted
- Dapr Kubernetes deployment docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr Kubernetes overview: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/
- Dapr sidecar overview: https://docs.dapr.io/concepts/dapr-services/sidecar/
- Dapr arguments and Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr service invocation overview: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-overview/
- Dapr retry resiliency docs: https://docs.dapr.io/operations/resiliency/policies/retries/override-default-retries/
- Dapr pub/sub component setup docs: https://docs.dapr.io/operations/components/setup-pubsub/
- Dapr Azure Service Bus Topics component docs: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-topics/
- Dapr Subscription resource spec: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr Configuration resource spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr sidecar health docs: https://docs.dapr.io/operations/resiliency/health-checks/sidecar-health/
- Dapr supported runtime and SDK releases: https://docs.dapr.io/operations/support/support-release-policy/

## Issues Found
- The prerequisites specified Kubernetes 1.24 or later. Dapr now documents Kubernetes support as aligned with the Kubernetes Version Skew Policy, so this was changed to "a supported Kubernetes version".
- The Helm install command created the namespace separately but did not use `--create-namespace`, while current official Helm examples include `--create-namespace`. The flag was added to keep the command robust.
- The verification text said the `dapr-dashboard` pod appears after installing the main `dapr/dapr` chart. Current Dapr docs install the dashboard with the separate optional `dapr/dapr-dashboard` chart, so the text was corrected.
- The Dapr `Configuration` example placed the `daprsystem` control plane configuration in the `default` namespace. For the install path in this post, the control plane is in `dapr-system`, so the namespace was corrected.
- The Dapr `Configuration` example used `metric`, but the current Configuration schema uses `metrics`. The field name was corrected.

## Review Notes
The examples use placeholder container images and assume the referenced backend and frontend applications implement the shown ports and routes. The Azure Service Bus component uses a Kubernetes secret reference, which is valid with Dapr's Kubernetes secret support, but the post does not show creation of the `servicebus-secret` secret.
