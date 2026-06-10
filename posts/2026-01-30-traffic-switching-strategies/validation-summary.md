# Validation Summary: How to Build Traffic Switching Strategies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Route 53 (DNS-based weighted routing)
- NGINX (`split_clients`, upstream pools)
- HAProxy (ACLs, weighted backends)
- Istio (VirtualService, DestinationRule, traffic policies)
- Kubernetes (Deployments, Services, probes, `kubectl patch`)
- Argo Rollouts (Rollout, AnalysisTemplate, Istio trafficRouting)
- Prometheus / Prometheus Operator (PrometheusRule, PromQL)
- Node.js / Express (feature flag implementation, middleware)
- Bash (deployment switch automation script)

## Sources Consulted
- AWS Route 53 documentation — `change-resource-record-sets` CLI and weighted routing semantics (https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-weighted.html)
- NGINX `split_clients` module reference (https://nginx.org/en/docs/http/ngx_http_split_clients_module.html)
- HAProxy configuration manual — ACLs, `hdr()` fetch, server weights (https://docs.haproxy.org/)
- Istio networking API reference — VirtualService and DestinationRule for `networking.istio.io/v1beta1` and `v1` (https://istio.io/latest/docs/reference/config/networking/)
- Argo Rollouts documentation — Rollout spec, canary strategy, analysis, Istio traffic routing (https://argo-rollouts.readthedocs.io/)
- Prometheus Operator API reference — `PrometheusRule` CRD (https://prometheus-operator.dev/docs/api-reference/api/)
- Kubernetes API reference for Deployments, Services, probes (https://kubernetes.io/docs/reference/)

## Issues Found
No technical issues found. All commands, configuration snippets, CRD fields, and code examples were verified against official documentation and are syntactically and semantically correct:

- Route 53 CLI invocation, `Weight` (0-255), `SetIdentifier`, relative-weight semantics — accurate.
- NGINX `split_clients` syntax with percentages summing to 100% — valid.
- HAProxy `hdr(X-Canary) -i true` ACL and weighted `server ... weight N check` — valid.
- Istio VirtualService/DestinationRule fields (`h2UpgradePolicy: UPGRADE`, `http1MaxPendingRequests`, `http2MaxRequests`, `consecutive5xxErrors`, `baseEjectionTime`, `maxEjectionPercent`) — all valid; weights `90 + 10 = 100` satisfies the sum-to-100 rule.
- Argo Rollouts `argoproj.io/v1alpha1` for `Rollout` and `AnalysisTemplate`, `trafficRouting.istio` block, `analysis.templates[].templateName` — all correct (Argo Rollouts is still on `v1alpha1`).
- Prometheus Operator `monitoring.coreos.com/v1` `PrometheusRule` group/rules/alert/expr/for/labels/annotations structure — correct.
- Node.js feature-flag hash function (`((hash << 5) - hash) + char` ≡ `hash * 31 + char` with 32-bit forcing via `hash & hash`) — produces a stable, consistent hash as claimed.
- `kubectl patch service` JSON patch for switching selectors and the jsonpath expressions used in the blue-green script — correct.

## Review Notes
- **Istio API version**: The post uses `apiVersion: networking.istio.io/v1beta1` for VirtualService and DestinationRule. This still works and is still served for backward compatibility, but `networking.istio.io/v1` was promoted to GA in Istio 1.22 and is now the preferred version. Readers on newer Istio versions may wish to use `v1`. Not a correctness issue.
- **NGINX `split_clients` convention**: The post sums percentages to exactly 100% (`90% + 10%`). The more idiomatic NGINX style uses `*` for the catch-all last entry (`90% production; * canary;`). The shown syntax is still valid.
- **Blue-green smoke test assumes `curl` in pod**: The script runs `kubectl exec ... -- curl -sf ...`, which requires `curl` to be present in the container image. Many minimal images (distroless, scratch) do not include it. Worth noting but not a technical error in the example.
- **Argo Rollouts `maxSurge`/`maxUnavailable` placement**: These appear under `strategy.canary` in the example, which is the correct location for the canary strategy. No issue.
- **Route 53 `Weight` range**: The post does not call out the 0-255 limit, but the values used (`90`, `10`) are well within range.
