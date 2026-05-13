# Validation Summary: How to Configure Flagger with NGINX Ingress Canary Annotations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flagger
- ingress-nginx
- Kubernetes Ingress
- Kubernetes Deployments and Services
- Helm
- Prometheus

## Sources Consulted
- Flagger NGINX Canary Deployments: https://docs.flagger.app/main/tutorials/nginx-progressive-delivery
- Flagger Metrics Analysis: https://docs.flagger.app/main/usage/metrics
- Flagger Introduction: https://docs.flagger.app/main
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes labels and annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes Ingress NGINX retirement statement: https://kubernetes.io/blog/2026/01/29/ingress-nginx-statement/
- Kubernetes ingress-nginx GitHub repository: https://github.com/kubernetes/ingress-nginx
- Flagger loadtester Helm chart: https://artifacthub.io/packages/helm/flagger/loadtester

## Issues Found
- The post referred generally to "NGINX Ingress Controller" while using the community `kubernetes/ingress-nginx` Helm chart and annotations. I clarified that the guide is for the community ingress-nginx controller, not the separate F5 NGINX Ingress Controller.
- The post did not mention that the community ingress-nginx project was retired in March 2026. I added a concise caveat and adjusted the conclusion so the guide is framed for existing clusters or migration testing rather than new production adoption.
- The ingress-nginx Helm install enabled `controller.metrics.serviceMonitor.enabled=true`, which requires Prometheus Operator ServiceMonitor CRDs that were not listed as a prerequisite. I changed the metrics configuration to the official Flagger NGINX tutorial pattern using Prometheus scrape pod annotations.
- The Ingress example used the deprecated `kubernetes.io/ingress.class` annotation. I replaced it with `spec.ingressClassName: nginx`, which Kubernetes documents as the replacement starting in v1.18.
- The post said to create a namespace but did not include a command or manifest to create the `test` namespace before applying namespaced resources. I added `kubectl create namespace test` before the `kubectl apply` commands.

## Review Notes
The Flagger Canary fields, built-in metric names, NGINX canary annotations, loadtester chart name, and `kubectl set image` example were consistent with the consulted documentation. The tutorial remains technically usable for environments that still run ingress-nginx, but the retired status of the upstream project is an important operational caveat.
