# Validation Summary: How to Fix Dapr Host Address Unreachable Errors

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (service invocation, name resolution, sidecar architecture)
- Kubernetes (pods, annotations, DNS, NetworkPolicy)
- mDNS (self-hosted Dapr name resolution)
- Dapr CLI

## Sources Consulted
- Dapr Name Resolution overview: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-overview/
- Dapr Kubernetes name resolution component: https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-kubernetes/
- Dapr Placement Service: https://docs.dapr.io/concepts/dapr-services/placement/
- Dapr cross-namespace service invocation: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-namespaces/
- Dapr CLI reference (dapr list): https://docs.dapr.io/reference/cli/dapr-list/
- Dapr Kubernetes annotations: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-annotations/
- Kubernetes NetworkPolicy API: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
1. **Incorrect reference to Dapr placement service for name resolution**: The intro paragraph stated that host address unreachable errors can be caused by "name resolution issues in the Dapr placement service." The placement service is exclusively for actor placement and distribution, not for general service name resolution. Name resolution is handled by dedicated name resolution components (e.g., `kubernetes`, `mdns`, `consul`). Changed "name resolution issues in the Dapr placement service" to "name resolution component issues."

## Review Notes
- The NetworkPolicy example uses `podSelector: {}` which applies to all pods in the namespace and only allows port 50001 traffic. In a real deployment this would be overly restrictive — it would block all other traffic. This is acceptable as a minimal illustration but readers should be aware they need to combine it with rules for their application traffic.
- The `nslookup` debugging step is useful for general network troubleshooting, though the Dapr Kubernetes name resolver uses the Kubernetes API directly rather than DNS queries. DNS resolution success doesn't guarantee Dapr can resolve the service, but it's still a reasonable diagnostic step.
- All kubectl commands, Dapr CLI commands, annotation names, and cross-namespace invocation formats are correct.
