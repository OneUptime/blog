# Validation Summary: How to Create Custom Helm Charts for Istio Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Kubernetes
- Istio
- Istio VirtualService
- Istio DestinationRule
- Istio AuthorizationPolicy
- Istio PeerAuthentication
- Istio sidecar injection

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Helm create command reference: https://helm.sh/docs/helm/helm_create/
- Helm template command reference: https://helm.sh/docs/helm/helm_template/
- Helm chart tests documentation: https://helm.sh/docs/topics/chart_tests/

## Issues Found
- The sidecar injection example used `sidecar.istio.io/inject` as a pod annotation. Istio now documents that annotation as deprecated in favor of the `sidecar.istio.io/inject` label, so the Deployment snippet was updated to put injection control under `spec.template.metadata.labels` while keeping `proxy.istio.io/config` under annotations.
- The AuthorizationPolicy example used `principals: ["cluster.local/ns/*/sa/<service-account>"]`. Istio string matching supports exact, prefix, suffix, and presence matches, but not a wildcard in the middle of a principal string. The template was changed to use `source.serviceAccounts`, which is the documented simpler field for Kubernetes service account identity.

## Review Notes
- The Istio API versions shown for VirtualService, DestinationRule, AuthorizationPolicy, and PeerAuthentication are current in Istio 1.30 documentation.
- The Helm commands and Helm test hook annotation are valid. In RBAC-restricted clusters, the sample Helm test job may need a Role and RoleBinding that allow its service account to read Istio custom resources.
