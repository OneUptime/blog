# Validation Summary: How to Configure Egress TLS Origination in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio traffic management
- Egress TLS origination
- ServiceEntry
- DestinationRule
- Kubernetes Deployments and Secrets
- istioctl proxy-config

## Sources Consulted
- Istio Egress TLS Origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio common traffic management problems, double TLS section: https://istio.io/latest/docs/ops/common-problems/network-issues/
- Istio sidecar resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The original basic setup used a VirtualService to route HTTP port 80 traffic to destination port 443. Current Istio documentation uses `ServiceEntry.spec.ports[].targetPort: 443` and applies the DestinationRule TLS settings to service port 80. Updated the setup, traffic-flow explanation, verification command, and summary to match the current documented pattern.
- The ServiceEntry examples used `protocol: TLS` for port 443. For HTTPS external services in this pattern, Istio's documentation uses `protocol: HTTPS`. Updated both ServiceEntry examples.
- The DestinationRule examples applied TLS settings to port 443. With the current ServiceEntry `targetPort` pattern, the TLS policy is attached to service port 80. Updated the basic, custom CA, mTLS, and multiple-service DestinationRule snippets.
- The multiple-service example included a VirtualService that only routed one host while listing multiple hosts. Removed that VirtualService from the example and clarified that each external host needs its own DestinationRule.

## Review Notes
The sidecar volume annotations used for certificate mounts are valid Istio annotations, but they are documented as alpha. Istio also supports `credentialName` for sidecar TLS credentials when the DestinationRule has a `workloadSelector`, which may be preferable for production examples in a future revision.
