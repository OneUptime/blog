# Validation Summary: How to Configure Trust Domain Migration for Authorization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio AuthorizationPolicy
- Istio MeshConfig
- Trust domains and trustDomainAliases
- SPIFFE workload identities
- Kubernetes kubectl rollout commands
- istioctl proxy-config commands
- Multi-cluster service mesh trust configuration

## Sources Consulted
- Istio Trust Domain Migration task: https://istio.io/latest/docs/tasks/security/authorization/authz-td-migration/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio multicluster setup prerequisites: https://istio.io/latest/docs/setup/install/multicluster/before-you-begin/
- Istio glossary for trust domains: https://istio.io/latest/docs/reference/glossary/
- Istio Security FAQ for workload certificate lifetime: https://istio.io/latest/about/faq/security/

## Issues Found
- The post said policies referencing `cluster.local` break after migrating to a new trust domain. Istio treats `cluster.local` in authorization policies as a pointer to the current trust domain and its aliases, so I corrected the explanation to distinguish `cluster.local` from other explicit old trust domains.
- The step for updating authorization policies showed `cluster.local` as the old value to replace. I changed the example to use an explicit old trust domain and added the Istio recommendation to use `cluster.local/ns/.../sa/...` for long-term policies.
- The multi-cluster section said each cluster typically has its own trust domain. Istio supports one or more trust domains in a multicluster mesh as long as clusters share a root of trust, so I updated the wording.
- The common mistakes section said only `principals`-based policies are affected. Istio AuthorizationPolicy also has `trustDomains` and `notTrustDomains` source fields, so I expanded the note.

## Review Notes
The IstioOperator `meshConfig.trustDomain` and `trustDomainAliases` fields, AuthorizationPolicy API version and field names, `kubectl rollout restart`, and `istioctl proxy-config secret` examples match current Istio and Kubernetes command references. The certificate lifetime note is accurate for the default 24-hour Istio workload certificate TTL, though rotation is typically requested before expiry.
