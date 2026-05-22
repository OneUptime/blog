# Validation Summary: How to Configure DestinationRule for External Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ServiceEntry
- Istio DestinationRule
- Istio egress traffic management
- TLS origination and mutual TLS origination
- Kubernetes kubectl
- istioctl proxy configuration commands

## Sources Consulted
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio ServiceEntry API reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio Egress TLS Origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The basic external HTTPS example used `protocol: HTTPS` with `tls.mode: SIMPLE`, which describes TLS origination even though the text presented it as normal HTTPS access from the application. Changed the ServiceEntry port protocol to `TLS`, removed the DestinationRule TLS origination block, and updated the explanation to clarify that the application already uses HTTPS.
- The CDN example also combined normal HTTPS/SNI routing with `tls.mode: SIMPLE`. Changed the ServiceEntry port protocol to `TLS` and removed the TLS origination block so Envoy routes the application-originated TLS traffic correctly.
- The conclusion said to always pair ServiceEntries with DestinationRules. Changed this to say to pair them when custom traffic policies are needed, since a ServiceEntry alone is valid when no DestinationRule policy is required.

## Review Notes
The dedicated TLS origination example matches the current Istio task pattern: HTTP service port 80, `targetPort: 443`, and a DestinationRule `portLevelSettings` entry with `tls.mode: SIMPLE`. The `istioctl proxy-config cluster --fqdn` and `istioctl proxy-config endpoint --cluster` commands are current according to the Istio command reference.
