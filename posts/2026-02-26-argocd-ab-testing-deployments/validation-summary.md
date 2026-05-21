# Validation Summary: How to Implement A/B Testing Deployments with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Argo Rollouts
- Kubernetes
- Istio VirtualService
- NGINX Ingress
- Prometheus AnalysisTemplates
- kubectl Argo Rollouts plugin

## Sources Consulted
- Argo Rollouts Rollout specification: https://argoproj.github.io/argo-rollouts/features/specification/
- Argo Rollouts Istio traffic management: https://argoproj.github.io/argo-rollouts/features/traffic-management/istio/
- Argo Rollouts NGINX traffic management: https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/nginx/
- Argo Rollouts analysis documentation: https://argoproj.github.io/argo-rollouts/features/analysis/
- Argo Rollouts kubectl plugin command docs: https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Ingress-NGINX canary annotation documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/#canary

## Issues Found
- The Istio `setHeaderRoute` example omitted `trafficRouting.managedRoutes`. Argo Rollouts requires managed route names for `setHeaderRoute`, so I added `managedRoutes` with the matching route name.
- The route examples could send matched traffic before an explicit canary scale was configured. I added `setCanaryScale` before header-based routing steps so the canary ReplicaSet has capacity for matched requests.
- The NGINX example used `setHeaderRoute`, but Argo Rollouts documents `setHeaderRoute` as Istio-only at the moment. I replaced it with supported NGINX canary ingress annotations via `additionalIngressAnnotations`.
- The cookie-routing snippet used a route name that did not match the main Istio managed route example. I aligned the name with the configured managed route.
- The Prometheus analysis template referenced `{{args.canary-hash}}` without declaring args and compared `result[0]` to `result[1]` even though the query returned one scalar. I added `stable-hash` and `canary-hash` args and changed the error-rate query to return a canary-to-stable ratio checked against `1.1`.
- The summary implied the same `setHeaderRoute` mechanism applied to NGINX. I clarified that Istio uses `setHeaderRoute`, while NGINX uses canary annotations.

## Review Notes
The Argo CD Application example is syntactically valid. In production, Argo Rollouts-managed Services and traffic resources can appear out of sync while Rollouts updates selectors, weights, or managed routes; Argo Rollouts' Istio documentation recommends using Argo CD `ignoreDifferences` and related sync options to reduce reconciliation churn.
