# Validation Summary: How to Implement Canary Deployments in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Ingress NGINX Controller (`ingress-nginx`)
- Prometheus
- Argo Rollouts
- Bash

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes service proxy documentation: https://kubernetes.io/docs/tasks/access-application-cluster/access-cluster-services/
- Ingress-NGINX canary annotation documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Ingress-NGINX canary deployment example: https://kubernetes.github.io/ingress-nginx/examples/canary/
- Ingress-NGINX monitoring guide: https://kubernetes.github.io/ingress-nginx/user-guide/monitoring/
- Official Ingress-NGINX Grafana dashboard queries: https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/grafana/dashboards/nginx.json
- Rancher monitoring documentation: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Rancher Prometheus configuration documentation: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/advanced-user-guides/monitoring-v2-configuration-guides/advanced-configuration/prometheus
- Argo Rollouts installation guide: https://argoproj.github.io/argo-rollouts/installation/
- Argo Rollouts canary strategy documentation: https://argo-rollouts.readthedocs.io/en/stable/features/canary/
- Argo Rollouts NGINX traffic-routing documentation: https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/nginx/
- Argo Rollouts analysis documentation: https://argo-rollouts.readthedocs.io/en/stable/features/analysis/

## Issues Found
- The Step 3 Prometheus example used a non-standard Rancher Monitoring endpoint and assumed direct access to a cluster DNS service from a local shell. I changed it to query Prometheus through the Kubernetes API service proxy using the documented Rancher Monitoring service name, and I updated the PromQL example to use `ingress-nginx` request metrics that are used in the official dashboard.
- The Step 4 header/cookie example was not a valid Kubernetes `Ingress` because it omitted the `spec`, host/path rules, and backend service. I added the required fields and corrected the cookie explanation to match the controller's documented `canary=always` behavior.
- The Step 5 Argo Rollouts example omitted the required `trafficRouting.nginx.stableIngress` configuration and reused the earlier Service pattern that does not match Rollout-managed stable/canary Services. I replaced it with a documented Rollout-managed Service pair plus NGINX traffic-routing configuration and clarified that this section replaces the manual canary setup above.
- The post referred to `nginx-ingress` generically in places where the documented controller is `ingress-nginx` / Ingress NGINX Controller. I corrected that wording for technical precision.

## Review Notes
- As of April 24, 2026, the Ingress NGINX Controller documentation states the project is in retirement after March 2026. Existing deployments still work, but future posts should consider whether a supported ingress or Gateway API-based approach is a better recommendation for new long-term deployments.
- The Step 3 promotion script depends on Rancher Monitoring being installed and on `ingress-nginx` metrics being enabled and scraped.
- The updated Argo Rollouts section now accurately shows automated traffic shifting with NGINX. If the post later wants to show fully automated metric-based promotion inside Argo Rollouts itself, it should add a concrete `AnalysisTemplate` that matches the metrics available in the target environment.
