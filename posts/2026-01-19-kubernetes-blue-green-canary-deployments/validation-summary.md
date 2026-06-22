# Validation Summary: How to Implement Blue-Green and Canary Deployments in Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Deployments, Services, Ingress, and readiness probes
- kubectl
- ingress-nginx canary annotations
- Argo Rollouts and kubectl argo rollouts plugin
- Flagger with NGINX ingress
- Prometheus / PromQL rollout analysis metrics

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes ingress-nginx canary documentation: https://kubernetes.github.io/ingress-nginx/examples/canary/
- Kubernetes ingress-nginx retirement announcement: https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/
- Argo Rollouts NGINX traffic routing documentation: https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/nginx/
- Argo Rollouts kubectl plugin documentation: https://argo-rollouts.readthedocs.io/en/stable/features/kubectl-plugin/
- Argo Rollouts retry command documentation: https://argo-rollouts.readthedocs.io/en/latest/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_retry/
- Flagger deployment strategies documentation: https://docs.flagger.app/usage/deployment-strategies
- Flagger NGINX canary deployments tutorial: https://fluxcd.io/flagger/tutorials/nginx-progressive-delivery/

## Issues Found
- The blue-green Ingress example routed to `myapp-blue` and `myapp-green` Services that were not defined in the snippet. Added the two Service manifests with selectors for the blue and green Deployments so the Ingress backends resolve to actual Kubernetes Services.
- The manual canary replica-ratio example described 9 replicas as exactly 90% traffic and 1 replica as exactly 10% traffic. Updated the comments and service note to say this is approximate, because Kubernetes Services route across matching endpoints rather than enforcing precise traffic weights.
- The Flagger Canary comments had `threshold` and `maxWeight` meanings reversed. Corrected `threshold` to mean failed metric checks before rollback and `maxWeight` to mean maximum canary traffic percentage.
- The post used ingress-nginx annotations without noting that the community ingress-nginx controller was retired in March 2026. Added a concise caveat that these examples are appropriate for existing clusters or migration testing, while new production deployments should prefer Gateway API or another maintained ingress controller.

## Review Notes
The Kubernetes API versions and manifest shapes are current for the snippets reviewed. Argo Rollouts and Flagger examples remain valid, but any ingress-nginx-based deployment should now be treated as legacy because upstream ingress-nginx no longer receives fixes after March 2026.
