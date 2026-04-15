# Validation Summary: How to Implement API Rate Limiting with Dapr and API Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (middleware HTTP pipeline, rate limit component)
- Kong Gateway (rate-limiting plugin, KongPlugin CRD, KongConsumer CRD)
- NGINX Ingress Controller (rate limiting annotations)
- Redis (distributed rate limiting backend)
- Kubernetes (Ingress, ConfigMap, CRDs)

## Sources Consulted
- Dapr rate limit middleware docs: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-rate-limit/
- Dapr configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Kong rate-limiting plugin docs: https://docs.konghq.com/hub/kong-inc/rate-limiting/
- Kong Kubernetes Ingress Controller plugin guide: https://docs.konghq.com/kubernetes-ingress-controller/latest/guides/using-kongplugin-resource/
- NGINX Ingress Controller annotations (rate limiting): https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/#rate-limiting

## Issues Found

### Issue 1: Kong `redis_host` and `redis_port` config fields are deprecated
- **What was wrong:** The Kong rate-limiting plugin config used flat fields `redis_host` and `redis_port`. These are deprecated and scheduled for removal in Kong 4.0.
- **What was changed:** Replaced with the current nested format under `redis.host` and `redis.port`.
- **Why:** The modern Kong rate-limiting plugin configuration nests Redis connection settings under a `redis:` key.

### Issue 2: NGINX `limit-req-status-code` is not a per-Ingress annotation
- **What was wrong:** The annotation `nginx.ingress.kubernetes.io/limit-req-status-code: "429"` was included as an Ingress annotation. This setting is only available as a global ConfigMap parameter, not as a per-Ingress annotation.
- **What was changed:** Removed the invalid annotation from the Ingress resource. Added a separate section showing how to configure the 429 status code via the NGINX Ingress Controller ConfigMap.
- **Why:** The NGINX Ingress Controller only supports `limit-req-status-code` as a global ConfigMap setting, not as a per-resource annotation. The default rate-limit response code is 503 without this ConfigMap override.

## Review Notes
- The NGINX `limit-burst-multiplier` is set to "5", which is already the default value. This is redundant but not incorrect.
- The Dapr rate limit middleware (`middleware.http.ratelimit`) applies per-sidecar, not globally across replicas. The post correctly positions it as an "application-level fallback" but users should be aware it does not provide distributed rate limiting across multiple replicas without an external store.
- The curl test script is a reasonable demonstration but results will vary depending on the rate limit window and how quickly the requests are sent.
