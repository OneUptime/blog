# Validation Summary: How to Deploy Ingress Controllers with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Kubernetes provider
- HashiCorp Helm provider
- Kubernetes Ingress and Services
- ingress-nginx Helm chart
- Traefik Helm chart
- AWS Load Balancer Controller / Network Load Balancer annotations
- Google Kubernetes Engine LoadBalancer Services
- cert-manager annotations

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Terraform Kubernetes provider `kubernetes_ingress_v1` resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/ingress_v1
- ingress-nginx Helm chart values for chart 4.9.0: https://raw.githubusercontent.com/kubernetes/ingress-nginx/helm-chart-4.9.0/charts/ingress-nginx/values.yaml
- ingress-nginx multiple ingress controllers documentation: https://kubernetes.github.io/ingress-nginx/user-guide/multiple-ingress/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Traefik Helm chart values for chart 26.0.0: https://raw.githubusercontent.com/traefik/traefik-helm-chart/v26.0.0/traefik/values.yaml
- AWS Load Balancer Controller Service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- AWS Elastic Load Balancing target group attributes documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/edit-target-group-attributes.html
- GKE LoadBalancer Service concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer
- GKE LoadBalancer Service parameters: https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer-parameters

## Issues Found
- Updated the AWS NLB example to use AWS Load Balancer Controller-compatible annotations: `aws-load-balancer-type = "external"`, explicit `aws-load-balancer-nlb-target-type = "instance"`, and the current `aws-load-balancer-attributes` key for cross-zone load balancing. The previous `nlb` type and cross-zone annotation are legacy/deprecated patterns for current controller-managed NLBs.
- Updated the GKE static IP example to use `networking.gke.io/load-balancer-ip-addresses` with the reserved address resource name and `cloud.google.com/l4-rbs = "enabled"`. The previous example used `loadBalancerIP` and `cloud.google.com/load-balancer-type = "External"`, which is not the current recommended external LoadBalancer Service configuration.
- Added unique `controller.electionID` and `controller.ingressClass` values to the multiple ingress-nginx controller examples. The ingress-nginx documentation requires unique controller class, ingress class, and election ID values when running multiple controllers in the same cluster.
- Replaced the community ingress-nginx ConfigMap key `client-max-body-size` with `proxy-body-size`. `client-max-body-size` applies to the F5 NGINX Ingress Controller, while the post uses the community `kubernetes/ingress-nginx` controller.

## Review Notes
The examples pin older chart versions (`ingress-nginx` 4.9.0 and Traefik 26.0.0). The shown values are valid for those versions, but production users should check the latest chart release notes and values before upgrading because newer chart versions can change defaults and value schemas.
