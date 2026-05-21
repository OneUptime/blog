# Validation Summary: How to Define Istio Configuration Ownership Model

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio traffic management APIs
- Istio security APIs
- Kubernetes labels, annotations, and RBAC
- Kyverno admission policies
- Kubernetes YAML configuration

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio traffic management best practices: https://istio.io/latest/docs/ops/best-practices/traffic-management/
- Istio configuration scoping: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Kyverno policy type overview: https://kyverno.io/docs/policy-types/overview/
- Kyverno ClusterPolicy validate rules: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno external data sources: https://kyverno.io/docs/policy-types/cluster-policy/external-data-sources/

## Issues Found
- Istio networking snippets used `networking.istio.io/v1beta1`. Updated them to `networking.istio.io/v1`, matching current Istio stable examples for VirtualService, DestinationRule, Gateway, and ServiceEntry.
- Kyverno examples used deprecated top-level `spec.validationFailureAction`. Moved enforcement settings to rule-level `validate.failureAction`, as documented by Kyverno.
- The Kyverno ownership-tier pattern used a spaced logical-or expression. Changed it to `mesh|namespace|service` to match Kyverno pattern operator syntax more clearly.
- The single-host Kyverno example referenced an undefined `existing_hosts` variable and checked only the first host. Added a rule `context` using an API call to list existing VirtualServices and changed the deny check to compare all requested hosts.
- The DestinationRule section stated that multiple DestinationRules for the same host do not merge. Updated the explanation to reflect Istio's documented limited merge behavior: duplicate subsets are not merged and only one top-level `trafficPolicy` is used.
- Clarified DestinationRule lookup order as client namespace, service namespace, then the configured root namespace.

## Review Notes
Kyverno v1.18 marks `ClusterPolicy` as a legacy/deprecated policy type and recommends CEL-based `ValidatingPolicy` for new policy work. The post's examples remain in the traditional ClusterPolicy style but use corrected fields that are still documented and supported during the deprecation window.
