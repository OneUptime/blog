# Validation Summary: How to Expose Kiali Through Istio Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway and VirtualService
- Istio AuthorizationPolicy
- Kiali Operator custom resource
- Kiali authentication strategies, including OpenID Connect and token authentication
- Kubernetes TLS secrets and service account tokens
- cert-manager Certificate resources
- Prometheus, Grafana, and Jaeger/Tracing integration in Kiali

## Sources Consulted
- Kiali Accessing Kiali documentation: https://kiali.io/docs/installation/installation-guide/accessing-kiali/
- Kiali CR Reference: https://kiali.io/docs/configuration/kialis.kiali.io/
- Kiali OpenID Connect authentication documentation: https://kiali.io/docs/configuration/authentication/openid/
- Kiali Authentication Strategies documentation: https://kiali.io/docs/configuration/authentication/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Secure Gateways task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Ingress Access Control task: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Kubernetes kubectl create token reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/

## Issues Found
- The post described "proxy-based" authentication, while Kiali's documented strategy is the header strategy for reverse-proxy-injected authentication. Updated the planning bullet to "header/proxy-based" to match Kiali terminology.
- The OIDC client secret command created a secret named `kiali-oidc-secret`, but the documented default Kiali secret name is `kiali` unless `spec.deployment.secret_name` is set. Updated the command to create the `kiali` secret.
- The Kiali Grafana and tracing examples used deprecated `in_cluster_url` and `url` fields. Updated them to current `internal_url` and `external_url` fields.
- The tracing internal URL included the old `/jaeger` path while also enabling gRPC. Updated the gRPC example to use the Jaeger gRPC port URL without the HTTP path.
- The OIDC mismatch troubleshooting wording implied a single exact redirect URI format. Adjusted it to say the allowed callback URL should include Kiali's root path.

## Review Notes
The Istio Gateway, VirtualService redirect, TLS credential, AuthorizationPolicy, Kiali `web_root`, Kiali service port, and `kubectl create token` examples are consistent with the official documentation reviewed. The AuthorizationPolicy IP example uses `remoteIpBlocks`, which is correct when the client IP comes from `X-Forwarded-For` or PROXY protocol; deployments preserving source IP with `externalTrafficPolicy: Local` should use `ipBlocks` instead.
