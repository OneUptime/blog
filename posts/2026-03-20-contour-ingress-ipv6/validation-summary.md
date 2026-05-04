# Validation Summary: How to Configure Contour Ingress Controller for IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Contour ingress controller (Project Contour)
- Envoy proxy (data plane)
- Kubernetes Ingress API (`networking.k8s.io/v1`)
- Contour HTTPProxy CRD (`projectcontour.io/v1`)
- Contour ContourConfiguration CRD (`projectcontour.io/v1alpha1`)
- IPv6 / dual-stack networking in Kubernetes
- Helm (chart installation)
- AWS Load Balancer Controller annotations
- cert-manager (TLS issuance)

## Sources Consulted
- Contour API reference: https://projectcontour.io/docs/main/config/api/
- Contour `apis/projectcontour/v1alpha1/contourconfig.go` source (Go struct + JSON tags) on GitHub
- Contour Rate Limiting docs: https://projectcontour.io/docs/main/config/rate-limiting/
- Contour Envoy Admin Interface docs: https://projectcontour.io/docs/1.30/troubleshooting/envoy-admin-interface/
- Contour Ingress Annotations docs: https://projectcontour.io/docs/main/config/annotations/
- Project Contour Helm charts: https://projectcontour.github.io/helm-charts/
- AWS Load Balancer Controller annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- Kubernetes Service docs (dual-stack, ipFamilies, ipFamilyPolicy, loadBalancer status): https://kubernetes.io/docs/concepts/services-networking/service/
- Envoy admin interface docs: https://www.envoyproxy.io/docs/envoy/latest/operations/admin

## Issues Found

1. **Wrong path for `numTrustedHops` in ContourConfiguration.** The post placed it under `spec.network`, but `ContourConfigurationSpec` has no top-level `network` field. The correct path is `spec.envoy.network.numTrustedHops` (Go field `XffNumTrustedHops` with JSON tag `numTrustedHops`). Consolidated the two stanzas so `numTrustedHops` and `adminPort` both appear under `spec.envoy.network`, where they actually live per the v1alpha1 CRD.

2. **Outdated Helm install command (Bitnami chart).** The post recommended `bitnami/contour`. Bitnami's free public chart catalog has been moved to legacy and is no longer the recommended source for Contour. Replaced with the official Project Contour Helm repo at `https://projectcontour.github.io/helm-charts` (`projectcontour/contour`).

3. **Envoy `/listeners` admin endpoint default format.** The post piped `curl http://localhost:9001/listeners` into `python3 -m json.tool`, but the default response format of the `/listeners` admin endpoint is plain text, which would crash the JSON parser. Changed the URL to `http://localhost:9001/listeners?format=json` so the JSON pipeline works as written.

4. **Missing prerequisite for global rate limiting.** The `rateLimitPolicy.global` example will not enforce limits without an external Rate Limit Service (RLS) configured via an extension service plus `spec.rateLimitService` in `ContourConfiguration`. Added a one-line note above the example calling out the prerequisite (the `local` policy needs no external service).

## Review Notes
- The `kubernetes.io/ingress.class` annotation is deprecated in favor of `spec.ingressClassName` (deprecated since Kubernetes 1.18). Contour still honors it for backward compatibility, so the example using both is valid but redundant. Left as-is to preserve the author's intent and to illustrate both forms readers may encounter.
- `.status.loadBalancer.ingress[0].ip` correctly returns the IPv6 address on dual-stack LoadBalancer services; some cloud providers populate `.hostname` instead. Kubernetes 1.32 also added a GA `ipMode` field, but it's not relevant to the post's claims.
- AWS Load Balancer Controller annotation `service.beta.kubernetes.io/aws-load-balancer-ip-address-type: "dualstack"` is current and correct (other valid values: `ipv4`, `dualstack-without-public-ipv4` for ALBs).
- HTTPProxy `loadBalancerPolicy`, `healthCheckPolicy`, `requestHeadersPolicy`, `responseHeadersPolicy`, and `rateLimitPolicy` route fields, plus the `local` rate limit `requests`/`unit` (`second`/`minute`/`hour`) values, all match the current API reference.
