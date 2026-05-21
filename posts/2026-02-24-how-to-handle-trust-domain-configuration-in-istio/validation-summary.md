# Validation Summary: How to Handle Trust Domain Configuration in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- IstioOperator
- Istio AuthorizationPolicy
- Istio RequestAuthentication/JWT request principals
- SPIFFE workload identities
- Kubernetes
- Multi-cluster and multi-mesh trust configuration

## Sources Consulted
- Istio Trust Domain Migration: https://istio.io/latest/docs/tasks/security/authorization/authz-td-migration/
- Istio Authorization Policy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Global Mesh Options / MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Deployment Models, identity and trust models: https://istio.io/latest/docs/ops/deployment/deployment-models/
- Istio Troubleshooting Multicluster, trust configuration: https://istio.io/latest/docs/ops/diagnostic-tools/multicluster/
- Istio Security Problems, inspecting workload certificates with istioctl: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio FAQ, workload certificate lifetime: https://istio.io/latest/about/faq/security/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The post said different trust domains with different root CAs are not natively supported by Istio. Istio documentation describes trust between meshes with different CAs by exchanging trust bundles, while noting Istio does not provide tooling to perform that exchange. Updated the text to reflect that distinction.
- The post said workload principals and JWT request principals are evaluated independently. In an AuthorizationPolicy `source` block, source fields are ANDed together, so using both `principals` and `requestPrincipals` requires both to match. Updated the wording to say they are matched against different attributes and both conditions must match when used in the same `source`.

## Review Notes
The IstioOperator `meshConfig.trustDomain` and `trustDomainAliases` fields, AuthorizationPolicy API version and principal formats, wildcard matching behavior, default `cluster.local` trust domain, default 24-hour workload certificate lifetime, and `istioctl proxy-config secret` verification command were checked against current Istio documentation and are valid.
