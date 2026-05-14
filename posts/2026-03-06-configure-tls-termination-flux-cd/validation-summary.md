# Validation Summary: How to Configure TLS Termination with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes Ingress
- ingress-nginx
- cert-manager
- Kubernetes Secrets
- Gateway API
- TLS, HTTPS, SSL passthrough, and mTLS
- OpenSSL, curl, and kubectl

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- ingress-nginx TLS/HTTPS documentation: https://kubernetes.github.io/ingress-nginx/user-guide/tls/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx command-line arguments documentation: https://kubernetes.github.io/ingress-nginx/user-guide/cli-arguments/
- ingress-nginx retirement notice: https://kubernetes.io/blog/2026/01/29/ingress-nginx-statement/
- ingress-nginx release and chart information: https://github.com/kubernetes/ingress-nginx/releases
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Gateway API TLS guide: https://gateway-api.sigs.k8s.io/guides/tls/
- Gateway API TLSRoute documentation: https://gateway-api.sigs.k8s.io/api-types/tlsroute/

## Issues Found
- The prerequisites listed Kubernetes v1.24 or later while the ingress-nginx chart line was updated to the final 4.15.x chart family, whose published support matrix targets Kubernetes v1.31 and later. Updated the prerequisite to state v1.31 or later for the chart shown.
- The post did not mention that community ingress-nginx was retired in March 2026. Added a short prerequisite caveat recommending an actively maintained controller for new production deployments.
- The edge TLS example described `nginx.ingress.kubernetes.io/ssl-prefer-server-ciphers` as setting the minimum TLS version. That annotation controls server cipher preference, not protocol minimums. Updated the comment.
- The SSL passthrough example included `nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"`, but ingress-nginx SSL passthrough bypasses NGINX and invalidates other Ingress annotations. Removed the misleading annotation from the passthrough example.
- The re-encryption example described `proxy-ssl-verify` as optional for mTLS. That setting verifies the proxied HTTPS backend certificate; backend client certificate authentication depends on the referenced `proxy-ssl-secret` contents. Updated the comments to distinguish backend certificate verification from backend client certificate authentication.

## Review Notes
The Gateway API Gateway listener snippet is valid for listener-level TLS configuration, but complete traffic routing also requires matching Route resources such as HTTPRoute for HTTPS termination or TLSRoute for TLS passthrough. The post keeps that section focused on listener configuration.
