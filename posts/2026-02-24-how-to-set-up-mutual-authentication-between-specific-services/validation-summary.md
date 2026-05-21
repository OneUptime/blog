# Validation Summary: How to Set Up Mutual Authentication Between Specific Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Mutual TLS (mTLS)
- PeerAuthentication
- AuthorizationPolicy
- DestinationRule
- istioctl
- Kiali

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The post said Istio has three mTLS modes. PeerAuthentication also supports `UNSET` for inheritance, so the text now describes the three common enforcement modes and notes `UNSET`.
- The post said the default installation sets mesh-wide PERMISSIVE and implied services can simply communicate with or without mTLS. Current Istio documentation distinguishes inbound PERMISSIVE acceptance from Auto mTLS, which sends mTLS between workloads with sidecars when no DestinationRule TLS settings override it. The wording was updated.
- The mesh-wide PeerAuthentication example assumed `istio-system` without explaining that it must be the root namespace. Added a short caveat.
- The verification section used `istioctl authn tls-check`, which is not present in the current Istio command reference. Replaced it with the supported `istioctl proxy-config cluster` inspection command.
- The AuthorizationPolicy examples referenced service-account principals without stating that the workloads must actually use those Kubernetes service accounts. Added that assumption.
- The port-level mTLS explanation did not clarify that `portLevelMtls` keys are workload/container ports, not Kubernetes Service ports. Added that clarification.
- The DestinationRule section overstated `ISTIO_MUTUAL` as the default whenever mTLS is enabled. Updated it to match Istio Auto mTLS behavior when no DestinationRule TLS settings are configured.

## Review Notes
The examples are valid for current Istio sidecar mode. Ambient mode has different mTLS mechanics, and `DISABLE` is not supported for ambient PeerAuthentication, so this post should continue to be treated as a sidecar-mode guide unless it is expanded later.
