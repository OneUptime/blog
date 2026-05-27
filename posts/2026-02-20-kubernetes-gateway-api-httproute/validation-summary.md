# Validation Summary: How to Configure Kubernetes Gateway API with HTTPRoute

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Gateway API
- Gateway
- HTTPRoute
- ReferenceGrant
- NGINX Gateway Fabric
- kubectl
- HTTP routing, redirects, rewrites, header modification, and traffic splitting

## Sources Consulted
- Kubernetes Gateway API API reference: https://gateway-api.sigs.k8s.io/reference/spec/
- Kubernetes Gateway API getting started and install guidance: https://gateway-api.sigs.k8s.io/guides/getting-started/
- Kubernetes Gateway API Ingress migration guide: https://gateway-api.sigs.k8s.io/guides/getting-started/migrating-from-ingress/
- Kubernetes Ingress controllers documentation: https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/
- Kubernetes Gateway API v1.2 release post: https://kubernetes.io/blog/2024/11/21/gateway-api-v1-2/
- NGINX Gateway Fabric manifest installation documentation: https://docs.nginx.com/nginx-gateway-fabric/install/manifests/open-source/
- NGINX Gateway Fabric Gateway API compatibility documentation: https://docs.nginx.com/nginx-gateway-fabric/overview/gateway-api-compatibility/
- NGINX Gateway Fabric basic routing documentation: https://docs.nginx.com/nginx-gateway-fabric/traffic-management/basic-routing/
- NGINX Gateway Fabric v1.5.0 deployment manifests: https://raw.githubusercontent.com/nginx/nginx-gateway-fabric/v1.5.0/deploy/default/deploy.yaml
- NGINX Gateway Fabric v1.5.0 CRD manifests: https://raw.githubusercontent.com/nginx/nginx-gateway-fabric/v1.5.0/deploy/crds.yaml

## Issues Found
- The post said Gateway API "replaces Ingress." Updated this to "successor to Ingress" because the Kubernetes project recommends Gateway API for new work, but the GA Ingress API is frozen and not planned for removal.
- The NGINX Gateway Fabric install URL returned 404. Replaced it with the official v1.5.0 raw manifest commands for `deploy/crds.yaml` and `deploy/default/deploy.yaml`.
- The sample `kubectl get gatewayclass` output used the wrong NGINX Gateway Fabric v1.5.0 controller name. Updated it from `gateway.nginx.org/nginx-gateway` to `gateway.nginx.org/nginx-gateway-controller`.
- The HTTPS Gateway example referenced `wildcard-tls-secret` without noting that the TLS Secret must exist in the Gateway namespace. Added a short prerequisite sentence before the YAML.

## Review Notes
The Gateway API examples use valid `gateway.networking.k8s.io/v1` Gateway and HTTPRoute fields for the installed Gateway API v1.2.0 CRDs. The `ReferenceGrant` example correctly uses `gateway.networking.k8s.io/v1beta1` for Gateway API v1.2.0. As of this review, Gateway API v1.5.1 and newer NGINX Gateway Fabric releases are available, so the version pins are not the latest, but the corrected v1.5.0 NGINX Gateway Fabric commands and v1.2.0 Gateway API examples remain version-consistent.
