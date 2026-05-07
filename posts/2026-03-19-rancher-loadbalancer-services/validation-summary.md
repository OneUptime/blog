# Validation Summary: How to Configure LoadBalancer Services in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes Services
- Kubernetes LoadBalancer Services
- Amazon EKS
- Azure Kubernetes Service (AKS)
- Google Kubernetes Engine (GKE)
- MetalLB
- kubectl

## Sources Consulted
- Rancher Services documentation: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/kubernetes-resources-setup/create-services
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Create an External Load Balancer task: https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/
- Amazon EKS Network Load Balancers documentation: https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html
- Amazon EKS Auto Mode NLB annotations documentation: https://docs.aws.amazon.com/eks/latest/userguide/auto-configure-nlb.html
- AKS Standard Load Balancer annotations documentation: https://learn.microsoft.com/en-us/azure/aks/configure-load-balancer-standard
- AKS static IP with load balancer documentation: https://learn.microsoft.com/en-us/azure/aks/static-ip
- GKE LoadBalancer Services overview: https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer
- GKE LoadBalancer Service parameters: https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer-parameters
- GKE internal load balancer documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/internal-load-balancing

## Issues Found
- The Rancher UI steps were too vague for current Rancher documentation. I updated them to the documented navigation path: `Cluster Management` -> cluster `Explore` -> `Service Discovery` -> `Services`.
- The AWS example used outdated or legacy annotations for NLB creation and attributes. I replaced them with a current example for clusters using the AWS Load Balancer Controller: `aws-load-balancer-type: "external"`, `aws-load-balancer-nlb-target-type: "instance"`, and `aws-load-balancer-scheme`.
- The GKE example mixed an Ingress-related NEG annotation with an internal load balancer annotation on the same `Service`. I replaced it with a correct external LoadBalancer example using `cloud.google.com/l4-rbs: "enabled"` and added the correct internal-only annotation separately.
- The static IP example used `spec.loadBalancerIP`, which is deprecated upstream in Kubernetes v1.24. I replaced it with a current AKS example that uses provider-supported annotations for a pre-created Public IP.
- The `kubectl get events` example did not specify the namespace. I added `-n default` to make the command match the rest of the post's examples.

## Review Notes
- `spec.loadBalancerIP` is still recognized by some providers, but it is deprecated in upstream Kubernetes and its behavior varies by implementation.
- AWS, Azure, and GKE all support provider-specific LoadBalancer annotations, but the exact supported set depends on the cluster's cloud integration or controller version.
