# Validation Summary: How to Deploy Istio in a Mesh of Meshes Architecture

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Istio multicluster and multi-mesh deployment models
- Istio Gateway, ServiceEntry, DestinationRule, and AuthorizationPolicy resources
- Istio mTLS, trust domains, and CA/trust-bundle management

## Sources Consulted
- Istio deployment models: https://istio.io/latest/docs/ops/deployment/deployment-models/
- Istio multicluster installation: https://istio.io/latest/docs/setup/install/multicluster/
- Istio multi-primary on different networks: https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Istio multicluster prerequisites and CA setup: https://istio.io/latest/docs/setup/install/multicluster/before-you-begin/
- Istio plug in CA certificates: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio DNS proxying: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/

## Issues Found
- Updated Istio networking resources from `networking.istio.io/v1beta1` to the current documented `networking.istio.io/v1` API version.
- Corrected the trust explanation. Istio multi-mesh with different CAs requires trust-bundle exchange or TLS termination/re-origination; separate roots do not automatically work with direct mTLS.
- Corrected the sample CA generation commands to use valid `*-cacerts` target names aligned with Istio's documented Makefile pattern.
- Corrected the east-west gateway host example for `AUTO_PASSTHROUGH` to allow Istio service SNI hosts instead of an unrelated peer mesh domain.
- Corrected the ServiceEntry example to use `resolution: STATIC` for a static gateway IP endpoint.
- Corrected the remote service host and DestinationRule host so the route target, TLS policy, and providing-mesh service registry are consistent.
- Removed the explicit `sni` override from the DestinationRule because it can conflict with Istio's `AUTO_PASSTHROUGH` SNI routing.
- Replaced the HTTP VirtualService example for passthrough mTLS with the correct `AUTO_PASSTHROUGH` gateway behavior, since passthrough gateways do not terminate TLS and cannot use HTTP routing.
- Added the DNS caveat for ServiceEntry hosts because Kubernetes DNS will not automatically resolve a manually declared remote mesh service.
- Corrected the AuthorizationPolicy example to match the gateway port rather than HTTP hosts, because host matching is HTTP-only and the gateway example uses TLS passthrough.

## Review Notes
The post is conceptually valid, but Istio does not provide a complete built-in federation workflow or trust-bundle exchange tool for independent meshes. Production deployments should automate ServiceEntry/DestinationRule generation, DNS publication or Istio DNS capture, trust-bundle distribution, and gateway certificate management.
