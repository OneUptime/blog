# Validation Summary: How to Set Up HelmRepository for Ingress-NGINX Charts in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm
- Flux HelmRepository
- Flux HelmRelease
- Ingress-NGINX Controller
- Kubernetes LoadBalancer Services
- Cloud provider service annotations

## Sources Consulted
- Flux Source API reference for HelmRepository: https://fluxcd.io/flux/components/source/api/v1/
- Flux Helm API reference for HelmRelease: https://fluxcd.io/flux/components/helm/api/v2/
- ingress-nginx Helm chart values: https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx CLI arguments documentation: https://kubernetes.github.io/ingress-nginx/user-guide/cli-arguments/
- AWS Load Balancer Controller service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- Amazon EKS NLB service annotation documentation: https://docs.aws.amazon.com/eks/latest/userguide/auto-configure-nlb.html
- GKE LoadBalancer Service concepts and parameters: https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer and https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer-parameters
- AKS Standard Load Balancer documentation: https://learn.microsoft.com/en-us/azure/aks/configure-load-balancer-standard

## Issues Found
- Removed `client-max-body-size` from the ingress-nginx `controller.config` example because it is not a documented ConfigMap key for the community ingress-nginx controller. `proxy-body-size` is the documented ingress-nginx setting for the client request body size.
- Changed the GKE external LoadBalancer annotation example from `cloud.google.com/neg: '{"ingress": true}'` to `cloud.google.com/l4-rbs: "enabled"` because the original annotation is for standalone/container-native NEGs, not the current recommended annotation for backend service-based external passthrough LoadBalancer Services.
- Corrected the health check verification command to port-forward the controller deployment on port `10254` and curl `http://localhost:10254/healthz`. The ingress-nginx health endpoint is exposed on the controller healthz port, not on the HTTP ingress service port `80`.

## Review Notes
- The Flux `HelmRepository` and `HelmRelease` API versions used in the examples are current.
- The ingress-nginx Helm chart values used for replicas, metrics, ServiceMonitor, autoscaling, topology spread constraints, PodDisruptionBudget, default backend, and ingress class configuration match the current chart values.
- ServiceMonitor examples require Prometheus Operator CRDs to be installed in the cluster.
- AWS LoadBalancer annotations vary depending on whether the cluster uses the in-tree/cloud-provider integration, EKS Auto Mode, or AWS Load Balancer Controller. The examples are plausible, but users should confirm the annotation set for their cluster's load balancer implementation.
