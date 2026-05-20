# Validation Summary: How to Scale the ArgoCD API Server

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD API server
- Argo CD Helm chart
- Kubernetes Deployments, Services, probes, and PodDisruptionBudgets
- Kubernetes Horizontal Pod Autoscaler
- NGINX Ingress Controller
- AWS Load Balancer Controller / ALB Ingress
- Prometheus metrics and alerting rules

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD API server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD command parameters ConfigMap reference: https://raw.githubusercontent.com/argoproj/argo-cd/master/docs/operator-manual/argocd-cmd-params-cm.yaml
- Argo CD ingress documentation: https://argo-cd.readthedocs.io/en/release-2.10/operator-manual/ingress/
- Argo CD Helm chart values and templates: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd
- Ingress-NGINX annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- AWS Load Balancer Controller ingress annotations documentation: https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/main/docs/guide/ingress/annotations.md
- Kubernetes Service session affinity documentation: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Referenced OneUptime monitoring guide: https://oneuptime.com/blog/post/2026-02-26-argocd-monitor-component-health/view

## Issues Found
- The NGINX Ingress example defined `nginx.ingress.kubernetes.io/backend-protocol` twice and mixed SSL passthrough with Layer 7 rate-limit and timeout annotations. Updated the example to use the Argo CD documented SSL passthrough pattern and added a note that Layer 7 rate limiting requires TLS termination at NGINX.
- The Helm health check snippet used raw Kubernetes `httpGet` probe fields under `server.livenessProbe` and `server.readinessProbe`, but the current Argo CD Helm chart exposes enabled/timing fields and renders the HTTP probe path itself. Updated the snippet to match the chart values.
- The Argo CD ConfigMap example for rate limiting used `server.x.frame.options`, which only sets an HTTP header, and `server.grpc.max.send.msg.size`, which is not a current documented `argocd-cmd-params-cm` key. Replaced these with documented server webhook concurrency and Kubernetes API client QPS/burst parameters.
- The NGINX ConfigMap example used `limit-rate` and `limit-rate-after`, which limit response transmission bandwidth rather than request count. Replaced it with Ingress-NGINX request rate limiting annotations.
- The performance claim that insecure mode reduces API server CPU by 20-30% was not supported by official documentation. Reworded it to the accurate, narrower claim that terminating TLS at ingress can reduce TLS work on API server pods.
- Added `ARGOCD_API_SERVER_REPLICAS` to the Helm scaling example because the Argo CD HA documentation says this value should be set when scaling `argocd-server` replicas.

## Review Notes
The team-size replica table is reasonable as operational guidance, but it is heuristic rather than an Argo CD documented sizing rule. Actual replica and resource settings should be validated with workload-specific metrics.
