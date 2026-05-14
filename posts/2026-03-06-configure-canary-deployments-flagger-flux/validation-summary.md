# Validation Summary: How to Configure Canary Deployments with Flagger and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Flux CD
- Kubernetes Deployments, HPAs, Ingress, Secrets, and Namespaces
- NGINX Ingress traffic shifting
- Prometheus metrics and PromQL
- podinfo
- kubectl
- Kustomize

## Sources Consulted
- Flagger NGINX Canary Deployments: https://docs.flagger.app/main/tutorials/nginx-progressive-delivery
- Flagger Metrics Analysis: https://docs.flagger.app/main/usage/metrics
- Flagger Webhooks: https://docs.flagger.app/main/usage/webhooks
- Flagger Alerting: https://docs.flagger.app/main/usage/alerting
- Flagger How It Works: https://docs.flagger.app/usage/how-it-works
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes Ingress NGINX retirement statement: https://kubernetes.io/blog/2026/01/29/ingress-nginx-statement/
- podinfo project documentation: https://github.com/stefanprodan/podinfo
- podinfo Helm chart parameters: https://artifacthub.io/packages/helm/podinfo/podinfo
- Ingress-NGINX annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/

## Issues Found
- The prerequisites presented NGINX Ingress Controller as a current default option. The community Ingress NGINX project was retired in March 2026, so the prerequisite now says the example uses NGINX Ingress but recommends Gateway API or another actively maintained ingress controller for new production installs.
- The overview diagram said Flagger creates a canary pod. Flagger creates/manages canary deployment resources and services, so the diagram now says "Create Canary Deployment."
- The NGINX Canary resource did not explicitly set `spec.provider: nginx`. Official Flagger NGINX examples include this field, so it was added to make the traffic provider unambiguous.
- The Canary service example added `nginx.ingress.kubernetes.io/canary-by-header` under `service.apex.annotations`. That annotation is for NGINX canary routing and can conflict with Flagger-managed weighted routing in the generated canary Ingress. The custom annotation block was removed.
- The rollback test claimed `--random-error` injects 50% errors. podinfo documents random error fault injection as random HTTP errors rather than a fixed 50% rate, so the wording was changed to "random errors."

## Review Notes
- The Kubernetes API versions used in the post are current for the stated Kubernetes baseline.
- The Flux `kustomize.toolkit.fluxcd.io/v1` Kustomization example matches the current stable Flux API.
- The custom Flagger `MetricTemplate`, webhook, and alert examples align with Flagger documentation, but the Prometheus service address and metric labels may need adjustment for a reader's Prometheus installation and scrape relabeling.
