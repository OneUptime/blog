# Validation Summary: How to Configure Kong KongPlugin CRD for Rate Limiting

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kong Ingress Controller
- Kong Gateway plugins
- KongPlugin and KongClusterPlugin CRDs
- Kubernetes Ingress and Services
- Helm
- Redis-backed rate limiting
- Request Transformer, Response Transformer, CORS, and Prometheus plugins

## Sources Consulted
- Kong Ingress Controller Helm install documentation: https://developer.konghq.com/kubernetes-ingress-controller/install/
- Kong Ingress Controller custom resource reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/custom-resources/
- Kong Ingress Controller class annotation documentation: https://developer.konghq.com/kubernetes-ingress-controller/class-annotations/
- Kong plugin secret configuration documentation: https://developer.konghq.com/kubernetes-ingress-controller/reference/secrets-in-plugins/
- Kong Rate Limiting plugin reference: https://developer.konghq.com/plugins/rate-limiting/reference/
- Kong Request Transformer plugin documentation: https://developer.konghq.com/plugins/request-transformer/
- Kong Response Transformer plugin examples and reference: https://developer.konghq.com/plugins/response-transformer/examples/add-header/
- Kong Prometheus plugin documentation: https://developer.konghq.com/plugins/prometheus/
- Kong Ingress Controller Prometheus and Grafana guide: https://developer.konghq.com/kubernetes-ingress-controller/observability/prometheus-grafana/

## Issues Found
- The installation command used the older `kong/kong` chart and chart values. Updated it to Kong's current `kong/ingress` chart install command.
- The introductory resource list incorrectly described `KongCredential` as a CRD. Updated it to use Kubernetes `Secret` resources referenced by `KongConsumer`.
- One Ingress example repeated `pathType` under the same path item. Removed the duplicate field.
- Request and response transformer examples used unsupported placeholder-style values such as `$(uuid)` and `$(latency)`, and used a hyphenated header template with unsafe dot notation. Replaced them with documented transformer syntax and static valid header values.
- The custom plugin priority example used an unsupported top-level `priority` field. Replaced it with KongPlugin `ordering`, which is the documented Enterprise ordering override.
- The global KongClusterPlugin section used an invalid KongIngress-based global plugin example. Added the required ingress class annotation to the KongClusterPlugin and explained that the `global` label applies it globally.
- The header-based rate limiting section described conditional execution incorrectly. Updated the language to say that the configured header value is used as the rate limiting key.
- The secret-backed plugin example used Kubernetes `valueFrom` directly inside plugin `config`, which KongPlugin does not support. Replaced it with `configPatches` and a `secretKeyRef`.
- The Prometheus example omitted the global KongClusterPlugin metadata and used an outdated service/port-forward target. Updated the plugin config and metrics query to align with Kong's documented Admin API `/metrics` endpoint.

## Review Notes
All YAML snippets parse successfully after the fixes. Kong's documentation now recommends Gateway API as the preferred routing API, but the Kubernetes Ingress examples remain supported and technically valid.
