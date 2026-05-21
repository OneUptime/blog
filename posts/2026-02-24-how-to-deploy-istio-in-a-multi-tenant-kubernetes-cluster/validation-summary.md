# Validation Summary: How to Deploy Istio in a Multi-Tenant Kubernetes Cluster

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Istio networking APIs: VirtualService, DestinationRule, Sidecar, Gateway
- Istio security APIs: AuthorizationPolicy, PeerAuthentication
- Kubernetes RBAC
- Prometheus metrics and PromQL

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio MeshConfig global mesh options: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio AuthorizationPolicy reference and authorization tasks: https://istio.io/latest/docs/reference/config/security/authorization-policy/ and https://istio.io/latest/docs/tasks/security/authorization/authz-http/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio secure ingress gateway task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio multiple control planes installation guide: https://istio.io/latest/docs/setup/install/multiple-controlplanes/
- Istio canary upgrade and revision guide: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- Namespace-based AuthorizationPolicy examples used `source.namespaces` without requiring mTLS. Added tenant-scoped PeerAuthentication resources in STRICT mode so source namespace matching is based on authenticated Istio identity.
- RBAC permissions did not include PeerAuthentication even though tenants now need to manage that security policy. Added `peerauthentications` to the `security.istio.io` resource list.
- The resource limits section showed a Sidecar resource as if it set CPU and memory limits. Replaced that with text explaining that Sidecar controls configuration visibility, while proxy CPU and memory are set through sidecar resource annotations on workloads.
- The ingress examples referenced `credentialName` without explaining that secrets for a shared `istio-ingressgateway` are read from the gateway workload namespace. Added `kubectl create secret tls` examples for `istio-system`.
- The hard multi-tenancy section used revisions alone and custom discovery addresses, which does not scope what each control plane watches. Replaced it with the official pattern using separate system namespaces, revisions, and `meshConfig.discoverySelectors`.
- The hard multi-tenancy namespace labeling commands did not remove the old `istio-injection` label. Updated them to remove `istio-injection` when adding `istio.io/rev`, matching Istio revision guidance.
- The summary overstated control plane isolation from revisions alone. Updated it to say stronger isolation requires revisions with discovery selectors.

## Review Notes
The post is now technically valid for current Istio sidecar-mode guidance. Gateway API is increasingly emphasized by Istio documentation, but the Istio `networking.istio.io/v1` APIs used in this post are still current and valid.
