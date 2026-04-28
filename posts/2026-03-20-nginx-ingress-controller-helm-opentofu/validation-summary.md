# Validation Summary: How to Deploy NGINX Ingress Controller with Helm and OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NGINX Ingress Controller (ingress-nginx Helm chart 4.9.1)
- Helm (HashiCorp helm Terraform provider ~> 2.12)
- OpenTofu / Terraform
- Kubernetes (kubernetes_ingress_v1 resource via hashicorp/kubernetes ~> 2.25)
- AWS NLB load balancer integration
- Horizontal Pod Autoscaler (HPA) and pod anti-affinity
- cert-manager (referenced for TLS issuance)
- Prometheus ServiceMonitor (metrics)

## Sources Consulted
- ingress-nginx Helm chart values: https://github.com/kubernetes/ingress-nginx/tree/main/charts/ingress-nginx
- ingress-nginx ConfigMap reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- Kubernetes Ingress documentation (deprecation of `kubernetes.io/ingress.class`): https://kubernetes.io/docs/concepts/services-networking/ingress/
- Terraform `kubernetes_ingress_v1` resource source: https://github.com/hashicorp/terraform-provider-kubernetes (verified `ingress_class_name` field exists in `resource_kubernetes_ingress_v1.go`)
- HashiCorp helm provider v2.x docs: https://registry.terraform.io/providers/hashicorp/helm/2.12.1
- AWS in-tree cloud provider load balancer annotations: https://kubernetes.io/docs/concepts/services-networking/service/#aws-nlb-support

## Issues Found
1. **Deprecated `kubernetes.io/ingress.class` annotation** — The example Ingress used the legacy annotation `kubernetes.io/ingress.class = "nginx"`, which has been deprecated since Kubernetes 1.18 in favor of the `spec.ingressClassName` field. Replaced the annotation with `ingress_class_name = "nginx"` inside the `spec` block of `kubernetes_ingress_v1`, which is the supported field in the hashicorp/kubernetes provider.

## Review Notes
- The chart values structure (controller.replicaCount, controller.affinity, controller.autoscaling, controller.config, controller.service, controller.resources, controller.metrics.serviceMonitor) all match the ingress-nginx chart schema.
- All NGINX ConfigMap keys (`use-gzip`, `gzip-level`, `proxy-body-size`, `proxy-connect-timeout`, `proxy-read-timeout`, `proxy-send-timeout`, `ssl-protocols`, `ssl-ciphers`) are valid entries documented in the ingress-nginx ConfigMap reference.
- The AWS LB annotation `service.beta.kubernetes.io/aws-load-balancer-type: nlb` targets the in-tree AWS cloud provider, which still works but has been deprecated in favor of the AWS Load Balancer Controller (using `service.beta.kubernetes.io/aws-load-balancer-type: external` with `aws-load-balancer-nlb-target-type: ip`, or `spec.loadBalancerClass: service.k8s.aws/nlb`). This is a stylistic/architectural choice rather than an error, so it was not modified.
- The `requiredDuringSchedulingIgnoredDuringExecution` hard anti-affinity rule with `topologyKey: kubernetes.io/hostname` will block scheduling if the cluster has fewer schedulable nodes than the desired replica count. With `replicaCount = 2` and `maxReplicas = 10`, single-node clusters (or clusters under node pressure) may see pending pods. Worth noting for readers but not technically incorrect.
- The post's description mentions "rate limiting" but no rate limiting configuration is shown in the body. Minor inconsistency, not a technical error.
- Helm provider `~> 2.12` constraint allows up to (but excluding) 3.0; the nested `kubernetes { config_path = ... }` block syntax shown is correct for that v2.x line. Helm provider v3.x changed this syntax, so readers using `~> 3.x` would need to adapt.
