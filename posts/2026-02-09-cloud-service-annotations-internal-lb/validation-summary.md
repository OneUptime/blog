# Validation Summary: How to Configure Cloud Provider Service Annotations for Internal Load Balancers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services of type LoadBalancer
- Amazon EKS and AWS Load Balancer Controller Network Load Balancers
- Google Kubernetes Engine internal passthrough Network Load Balancers
- Azure Kubernetes Service internal Azure Load Balancer
- kubectl, AWS CLI, gcloud CLI, and Azure CLI

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- AWS Load Balancer Controller Service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v3.2/guide/service/annotations/
- AWS Load Balancer Controller Network Load Balancer guide: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/nlb/
- GKE internal LoadBalancer Service guide: https://cloud.google.com/kubernetes-engine/docs/how-to/internal-load-balancing
- GKE LoadBalancer Service parameters: https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer-parameters
- GKE LoadBalancer Service concepts and health checks: https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer
- AKS internal load balancer documentation: https://learn.microsoft.com/azure/aks/internal-lb
- Cloud Provider Azure LoadBalancer annotations: https://cloud-provider-azure.sigs.k8s.io/topics/loadbalancer/

## Issues Found
- The post stated that Kubernetes LoadBalancer Services create public load balancers by default. This is true for many managed-provider defaults, but not universal for every controller mode. Changed the wording to "On many managed Kubernetes providers" to avoid overgeneralizing.
- The GKE examples used the older `cloud.google.com/load-balancer-type: "Internal"` annotation. Updated the examples and conclusion to use the current `networking.gke.io/load-balancer-type: "Internal"` annotation from GKE documentation.
- The primary GKE example used `spec.loadBalancerIP`. Removed it from the basic example and changed the reserved-IP example to use `networking.gke.io/load-balancer-ip-addresses`, which is the current GKE annotation for static load balancer IP resources.
- The AKS internal load balancer example used `spec.loadBalancerIP`, which AKS documentation says is being deprecated upstream. Replaced it with `service.beta.kubernetes.io/azure-load-balancer-ipv4`.
- The AWS static IP example used `aws-load-balancer-eip-allocations` for an internal NLB. AWS documents EIP allocations as internet-facing only, so this was changed to `aws-load-balancer-private-ipv4-addresses`.
- The GKE health check example used `BackendConfig`, which applies to GKE Ingress/Application Load Balancer backends, not Service LoadBalancer health checks. Replaced it with `externalTrafficPolicy: Local` and `healthCheckNodePort`, the supported Service-level custom health check port mechanism.
- The AKS health probe example used global annotations in a way that could ignore the HTTP request path depending on Service port configuration. Changed it to supported per-port health probe annotations for port 80.
- The GKE session affinity example used `BackendConfig`, which is not the right mechanism for a Service LoadBalancer. Replaced it with Kubernetes Service `sessionAffinity: ClientIP`.
- The AKS session persistence example used `azure-load-balancer-disable-tcp-reset`, which controls TCP reset behavior rather than session persistence. Replaced it with Kubernetes Service `sessionAffinity: ClientIP`.

## Review Notes
The reviewed examples are provider-specific and some annotations remain under the historical `service.beta.kubernetes.io` prefix because that is still the documented prefix for AWS Load Balancer Controller and AKS Service annotations. GKE also supports `spec.loadBalancerClass: networking.gke.io/l4-regional-internal` on newer clusters with the documented requirements; the post keeps the annotation-based approach to match its scope.
