# Validation Summary: How to Configure Kong Ingress Rate Limiting and Authentication Plugins

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kong Ingress Controller
- Kong Gateway
- KongPlugin and KongConsumer CRDs
- Kong Rate Limiting plugin
- Kong Key Auth plugin
- Kong JWT plugin
- Kong OAuth2 plugin
- Helm
- kubectl
- Redis

## Sources Consulted
- Kong Ingress Controller Helm installation documentation: https://developer.konghq.com/kubernetes-ingress-controller/install/
- Kong Ingress Controller rate limiting documentation: https://developer.konghq.com/kubernetes-ingress-controller/rate-limiting/
- Kong Ingress Controller key authentication documentation: https://developer.konghq.com/kubernetes-ingress-controller/get-started/key-authentication/
- Kong Ingress Controller ingress/class behavior documentation: https://developer.konghq.com/kubernetes-ingress-controller/ingress/
- Kong Rate Limiting plugin documentation and configuration reference: https://developer.konghq.com/plugins/rate-limiting/ and https://docs.konghq.com/hub/kong-inc/rate-limiting/configuration/
- Kong Key Auth plugin configuration reference: https://developer.konghq.com/plugins/key-auth/reference/
- Kong JWT plugin documentation and configuration reference: https://developer.konghq.com/plugins/jwt/ and https://developer.konghq.com/plugins/jwt/reference/
- Kong OAuth2 plugin documentation and configuration reference: https://developer.konghq.com/plugins/oauth2/ and https://developer.konghq.com/plugins/oauth2/reference/
- Kong credential Secret migration documentation: https://developer.konghq.com/kubernetes-ingress-controller/migrate/credential-kongcredtype-label/
- Kong Helm chart source values: https://github.com/Kong/charts

## Issues Found
- The Helm install command used old or misplaced chart values (`ingressController.installCRDs=true` and `proxy.type=LoadBalancer`) for the current `kong/ingress` chart. Updated the command to match the official current install command.
- Redis rate limiting examples used deprecated flat fields (`redis_host`, `redis_port`). Updated them to the current nested `redis.host` and `redis.port` configuration and added `sync_rate: 0` where the post claims strongest multi-node accuracy.
- The Redis accuracy explanation was too absolute. Updated it to clarify that Redis provides shared counters and synchronous updates provide the strongest accuracy.
- Credential Secrets included deprecated `kongCredType` fields. Removed them because KIC 3.x uses the `konghq.com/credential` label.
- The JWT credential example did not tell readers to attach the Secret to a KongConsumer. Added a short note to associate it through the `credentials` list.
- The OAuth2 example omitted the current topology caveat. Added a note that the OAuth2 plugin is for traditional Kong Gateway deployments and is not compatible with Konnect or the default DB-less KIC deployment.
- The per-consumer rate limiting KongConsumer was missing the ingress class annotation used by KIC examples for directly translated resources. Added `kubernetes.io/ingress.class: kong`.
- The Admin API troubleshooting commands used stale service name, protocol, and port (`svc/kong-admin` on HTTP 8001). Updated them to the current `kong/ingress` service name and TLS port (`svc/kong-gateway-admin` on HTTPS 8444).
- The log command used a stale label selector. Updated it to follow the current controller deployment directly with `kubectl logs -n kong deploy/kong-controller --follow`.

## Review Notes
The service snippets assume routes or ingresses already exist for those Services. That is reasonable for a plugin-focused post, but a future expansion could include a minimal Ingress or HTTPRoute so readers can run the examples end to end.
