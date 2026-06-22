# Validation Summary: Deploying NGINX Ingress Controller with Helm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Kubernetes Ingress and Services
- ingress-nginx Helm chart
- NGINX Ingress Controller annotations and ConfigMap settings
- Prometheus ServiceMonitor
- AWS, GKE, AKS, and MetalLB LoadBalancer Service configuration

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress Controllers documentation: https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/
- Kubernetes ingress-nginx retirement announcement: https://kubernetes.io/blog/2026/01/29/ingress-nginx-statement/
- ingress-nginx GitHub repository and retirement notice: https://github.com/kubernetes/ingress-nginx
- ingress-nginx Helm chart values: https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml
- ingress-nginx controller PodDisruptionBudget template: https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/templates/controller-poddisruptionbudget.yaml
- ingress-nginx ConfigMap options: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx custom headers example: https://kubernetes.github.io/ingress-nginx/examples/customization/custom-headers/
- Helm install documentation: https://helm.sh/docs/helm/helm_install/
- AWS EKS Network Load Balancer annotations: https://docs.aws.amazon.com/eks/latest/userguide/auto-configure-nlb.html
- GKE LoadBalancer Service documentation: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer
- Azure AKS LoadBalancer annotations: https://learn.microsoft.com/en-us/azure/aks/configure-load-balancer-standard
- MetalLB usage documentation: https://metallb.universe.tf/usage/

## Issues Found
- The post presented ingress-nginx as a current general-purpose production recommendation. Updated the introduction and wrap-up to note that Kubernetes retired ingress-nginx on March 24, 2026, and that new production deployments should evaluate Gateway API implementations or another maintained ingress controller.
- The production Helm values used `controller.podDisruptionBudget.enabled/minAvailable`, which is not a current ingress-nginx chart value. Replaced it with `controller.minAvailable`, matching the chart's PDB template behavior.
- The ConfigMap used `proxy-buffers`, which is not an ingress-nginx ConfigMap key. Replaced it with `proxy-buffers-number`.
- The ConfigMap used `client-max-body-size`, which is not the ingress-nginx key for request body limits. Replaced it with `proxy-body-size`.
- The AWS examples used older individual NLB annotations for load balancer type and cross-zone balancing. Updated them to use `loadBalancerClass: eks.amazonaws.com/nlb`, `aws-load-balancer-scheme`, and the consolidated `aws-load-balancer-attributes` annotation.
- The GKE examples used `cloud.google.com/load-balancer-type: "External"`, which is not the current documented external LoadBalancer configuration. Updated the example to use `loadBalancerClass: "networking.gke.io/l4-regional-external"` and the `cloud.google.com/l4-rbs: "enabled"` annotation; updated the internal LoadBalancer comment to the current `networking.gke.io/load-balancer-type` annotation.
- The MetalLB example used the older `metallb.universe.tf/address-pool` annotation and Kubernetes `loadBalancerIP`. Updated it to `metallb.io/address-pool` and `metallb.io/loadBalancerIPs`.

## Review Notes
The Kubernetes Ingress API is still stable, but it is frozen and Kubernetes recommends Gateway API for future development. The examples remain useful for existing ingress-nginx environments, but future revisions should consider a migration-focused post or a Gateway API equivalent.
