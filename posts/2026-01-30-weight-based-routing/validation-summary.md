# Validation Summary: How to Implement Weight-Based Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- JavaScript (Node.js) — weighted routing algorithms (random selection, smooth weighted round robin, consistent hashing)
- NGINX Ingress Controller (Kubernetes) — canary annotations
- Istio — VirtualService, DestinationRule, EnvoyFilter
- AWS Application Load Balancer (CloudFormation) — weighted target groups
- Express.js — header-based A/B testing
- Envoy Lua filter
- Prometheus / PromQL — verification queries
- Grafana — dashboard panel JSON
- Argo Rollouts — progressive delivery on Kubernetes
- Mermaid diagrams

## Sources Consulted
- NGINX Ingress annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio v1 APIs blog: https://istio.io/latest/blog/2024/v1-apis/
- AWS ALB ForwardConfig: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-elasticloadbalancingv2-listener-forwardconfig.html
- AWS TargetGroupTuple: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-elasticloadbalancingv2-listener-targetgrouptuple.html
- Argo Rollouts spec: https://argoproj.github.io/argo-rollouts/features/specification/
- Istio application requirements (ports): https://istio.io/latest/docs/ops/deployment/application-requirements/
- NGINX smooth WRR algorithm commit: https://github.com/nginx/nginx/commit/52327e0627f49dbda1e8db695e63a4b0af4448b1
- Prometheus query language reference: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found

1. **Incorrect smooth weighted round robin sequence in comment** (Algorithm 2). The code comment claimed weights 5:3:2 produce the repeating pattern `A, A, B, A, C, A, B, A, C, B`. Traced through the algorithm manually starting from zero current weights, the actual repeating pattern is `A, B, C, A, A, B, A, C, B, A`. Both have the correct 5:3:2 distribution over 10 picks, but the example sequence shown was not the one the algorithm actually produces. Updated the comment to reflect the real algorithm output.

## Review Notes

- **Istio API version**: The post uses `networking.istio.io/v1beta1` for `VirtualService` and `DestinationRule`. Since Istio 1.22 (May 2024), `networking.istio.io/v1` is the recommended stable version. `v1beta1` is still functional and supported, so this is not a current-day error, but readers building new manifests should prefer `v1`. Left as-is since v1beta1 still works.
- **Istio EnvoyFilter** correctly uses `networking.istio.io/v1alpha3` — this is the official current API version (EnvoyFilter has remained on v1alpha3).
- **Istiod port 15010** in the example env var is the plaintext gRPC XDS port. Production deployments typically use 15012 (mTLS). The code shows an example config and the value is technically valid, so this is left as-is — but readers should be aware 15012 is preferred for in-cluster mTLS-secured XDS access.
- **Express middleware** uses `req.cookies.userId` without importing/registering `cookie-parser`. Real-world use of the snippet would require adding `cookie-parser` middleware; left as-is since the post focuses on routing logic, not request parsing.
- **NGINX Ingress canary annotations**, **AWS ALB CloudFormation properties**, **Argo Rollouts spec fields**, and **PromQL queries** are all currently accurate. The weighted round robin, random selection, and consistent hashing algorithm implementations are correct.
- The Mermaid diagrams render correctly and accurately reflect the surrounding code.
