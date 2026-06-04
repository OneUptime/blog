# Validation Summary: How to Implement Multi-Ingress Controller Deployment with Class-Based Routing

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes Ingress
- Kubernetes IngressClass
- ingress-nginx
- Traefik Proxy Helm chart
- Kong Ingress Controller
- Prometheus Operator ServiceMonitor
- Helm
- kubectl

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes IngressClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/service-resources/ingress-class-v1/
- ingress-nginx multiple controller FAQ: https://kubernetes.github.io/ingress-nginx/faq/#multiple-controller-in-one-cluster
- ingress-nginx Helm chart values: https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml
- Traefik Helm chart documentation: https://github.com/traefik/traefik-helm-chart
- Traefik Helm chart values and templates: https://github.com/traefik/traefik-helm-chart/tree/master/traefik
- Kong IngressClass documentation: https://developer.konghq.com/kubernetes-ingress-controller/class-annotations/
- Kong custom IngressClass documentation: https://docs.konghq.com/kubernetes-ingress-controller/latest/guides/custom-class/internal-external/
- Prometheus Operator ServiceMonitor API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Traefik Helm command used `--set service.type=ClusterIP`, but current Traefik chart values configure the Service type under `service.spec.type`. Changed it to `--set service.spec.type=ClusterIP`.
- The Traefik chart currently creates a default IngressClass by default. In a multi-controller guide that later demonstrates a separate default IngressClass, this can lead to multiple default classes. Added `--set ingressClass.isDefaultClass=false`.
- The monitoring examples selected metrics services, but the install commands did not enable the required metrics services. Added `--set controller.metrics.enabled=true` for ingress-nginx and `--set metrics.prometheus.service.enabled=true` for Traefik.
- The post showed IngressClass resources immediately after Helm commands without clarifying that the Helm charts create them. Updated the wording to avoid implying users should apply duplicate cluster-scoped IngressClass objects.
- The tenant example claimed a dedicated controller but only defined an IngressClass and Ingress. Changed the wording to "Dedicated IngressClass" and removed the non-existent `IngressNGINXControllerParameters` reference.

## Review Notes
The examples use stable Kubernetes `networking.k8s.io/v1` Ingress and IngressClass APIs. The Kubernetes Ingress API is stable, but Kubernetes documentation notes that Gateway API is the newer successor for many advanced ingress use cases.
