# Validation Summary: How to Configure IPv6 LoadBalancer Services in Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes Services
- Kubernetes dual-stack networking
- IPv6
- AWS EKS
- AWS Load Balancer Controller
- Google Kubernetes Engine (GKE)
- Azure Kubernetes Service (AKS)
- DNS
- `kubectl`
- `curl`

## Sources Consulted
- Kubernetes dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Amazon EKS IPv6 user guide: https://docs.aws.amazon.com/eks/latest/userguide/cni-ipv6.html
- Amazon EKS Network Load Balancer guide: https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html
- AWS Load Balancer Controller Service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- GKE VPC-native and dual-stack networking documentation: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/alias-ips
- GKE LoadBalancer Service parameters: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer-parameters
- AKS dual-stack networking documentation: https://learn.microsoft.com/en-us/azure/aks/configure-dual-stack

## Issues Found
- The post treated `.status.loadBalancer.ingress` as if it always returned IP addresses. I corrected the explanation and commands to account for providers such as AWS that usually publish a hostname there instead of raw IPs.
- The EKS example incorrectly configured a Kubernetes dual-stack Service. I changed it to a single-stack IPv6 Service behind a dual-stack AWS Network Load Balancer because Amazon EKS IPv6 clusters do not support dual-stacked Pods or Services.
- The generic Service example implied provider-specific annotations were unnecessary everywhere. I added a note directing readers to apply the cloud-specific settings from the provider sections when required.
- The GKE guidance was missing the current platform caveats. I corrected it to note the `cloud.google.com/l4-rbs: "enabled"` requirement and that dual-stack `LoadBalancer` Services are supported on new GKE clusters running version 1.29 or later.
- The AKS guidance implied dual-stack public IPv4 and IPv6 allocation was unconditional. I corrected it to state that one Service receives both public IP families starting in AKS 1.27.
- The troubleshooting section used a `cloud-controller-manager` DaemonSet log command that is not generally valid on managed cloud Kubernetes platforms. I replaced it with a Service status inspection command that matches the documented provider behavior.

## Review Notes
- Provider behavior here is highly platform-specific. AWS EKS, GKE, and AKS all differ in how dual-stack Services are implemented and surfaced, so this post should be revalidated if those providers change their networking integrations or minimum supported versions.
