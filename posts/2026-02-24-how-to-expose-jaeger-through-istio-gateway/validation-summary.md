# Validation Summary: How to Expose Jaeger Through Istio Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway and VirtualService
- Istio AuthorizationPolicy
- Jaeger Query UI and APIs
- Kubernetes Services and Secrets
- cert-manager Certificates
- OAuth2 Proxy
- Kiali tracing integration

## Sources Consulted
- Istio Remotely Accessing Telemetry Addons: https://istio.io/latest/docs/tasks/observability/gateways/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio ingress authorization policy documentation: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Istio secure ingress gateway documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio sample Jaeger addon manifest: https://raw.githubusercontent.com/istio/istio/master/samples/addons/jaeger.yaml
- Jaeger API documentation: https://www.jaegertracing.io/docs/latest/architecture/apis/
- Jaeger deployment documentation: https://www.jaegertracing.io/docs/1.76/deployment/
- Jaeger UI base path documentation: https://www.jaegertracing.io/docs/next-release/deployment/
- Kiali Jaeger tracing configuration: https://kiali.io/docs/configuration/p8s-jaeger-grafana/tracing/jaeger/
- Kiali CR reference: https://kiali.io/docs/configuration/kialis.kiali.io/
- OAuth2 Proxy configuration overview: https://oauth2-proxy.github.io/oauth2-proxy/7.8.x/configuration/overview/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/

## Issues Found
- The VirtualService examples routed to port 16686 on the `tracing` Service. Current Istio sample Jaeger addon manifests expose the Query UI as service port 80 with targetPort 16686, so the examples that target `tracing` were changed to port 80 and the note now distinguishes service port 80 from standalone Jaeger Query service port 16686.
- The OAuth2 Proxy upstream used `http://tracing.istio-system:16686`, which does not match the default Istio addon Service port. It was changed to `http://tracing.istio-system`.
- The IP allow-list example used `remoteIpBlocks` without explaining the required source-IP mode. A note was added explaining when to use `remoteIpBlocks` versus `ipBlocks`, matching Istio ingress authorization guidance.
- The Kiali example used deprecated `in_cluster_url` and `url` fields. These were updated to the current `internal_url` and `external_url` fields.
- The API section described Jaeger's UI HTTP JSON endpoints as the general programmatic API. It now notes that stable programmatic integrations should prefer Jaeger's gRPC query API on 16685 or stable HTTP `/api/v3/*` endpoints where supported, while `/api/*` endpoints are internal UI endpoints.
- The base-path section only documented the Jaeger v1 `--query.base-path` flag. It now also includes the Jaeger v2 `extensions.jaeger_query.base_path` configuration used by current Istio sample addon manifests.

## Review Notes
- The OAuth2 Proxy example uses v7.5.1. The flags shown are still consistent with OAuth2 Proxy configuration, but future maintenance could update the image tag to the latest approved version after compatibility testing.
- The Istio addon Jaeger manifests are sample manifests and may change across Istio releases. The post now calls out where values are specific to the default `tracing` Service.
