# Validation Summary: How to Diagnose LoadBalancer Service Not Getting External IP

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes Services
- Kubernetes cloud-controller-manager
- AWS Elastic Load Balancing and AWS Load Balancer Controller
- Google Kubernetes Engine load balancers
- Azure Kubernetes Service load balancers
- MetalLB
- Cloud firewall, quota, audit log, and subnet configuration

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes external LoadBalancer task: https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/
- Kubernetes cloud-controller-manager administration: https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/
- Amazon EKS AWS Load Balancer Controller documentation: https://docs.aws.amazon.com/eks/latest/userguide/aws-load-balancer-controller.html
- Amazon EKS Network Load Balancer documentation: https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html
- GKE LoadBalancer Service documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer
- GKE internal LoadBalancer documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/internal-load-balancing
- Azure AKS load balancer documentation: https://learn.microsoft.com/en-us/azure/aks/configure-load-balancer-standard
- MetalLB installation documentation: https://metallb.io/installation/

## Issues Found
- The post said Kubernetes shows no errors. Changed this to `kubectl get svc` often showing no errors, because detailed Service events and controller logs can expose provisioning errors.
- The provider-controller checks implied all managed platforms expose provider cloud-controller-manager pods. Clarified that GKE manages this in the control plane and added AWS Load Balancer Controller as a common EKS controller to check.
- The cluster configuration section listed `--cloud-provider=aws` as expected. Updated it to focus on `--cloud-provider=external` for self-managed clusters using external cloud-controller-manager, matching current Kubernetes guidance.
- The AWS permissions list only covered older Classic Load Balancer operations. Added representative ELBv2 and EC2 describe permissions needed by modern NLB-backed implementations.
- The AWS quota and existing-resource commands only covered Classic Load Balancers. Added Service Quotas and `elbv2 describe-load-balancers` examples for current NLB/ALB usage.
- The NodePort and firewall sections stated that LoadBalancer always depends on NodePort. Updated the wording because Kubernetes supports `spec.allocateLoadBalancerNodePorts: false` for implementations that route directly to pods.
- The AWS subnet guidance only mentioned public subnet tags. Added the internal subnet role tag used for internal load balancers.
- The CloudTrail lookup filtered only Classic Load Balancer resource type. Changed it to search the Elastic Load Balancing event source, which also covers ELBv2 API events.
- The MetalLB manifest URL used v0.13.7. Updated it to v0.16.1, the current version shown in MetalLB installation documentation at review time.
- The service-controller logging section suggested editing a running pod with `kubectl edit pod`. Replaced it with guidance to edit the static pod manifest on self-managed control-plane nodes.
- The AWS and GKE annotation examples were outdated. Updated AWS examples for AWS Load Balancer Controller-managed NLBs and changed the GKE internal load balancer annotation to `networking.gke.io/load-balancer-type: "Internal"`.
- The stale-resource section said Kubernetes cannot create a new load balancer if the same name exists. Softened this to "may fail to create or reconcile" because exact behavior depends on provider-generated names and controller implementation.

## Review Notes
The post is technically valid after edits. Some cloud-specific troubleshooting commands remain examples rather than complete procedures because exact controller names, IAM policies, quota names, and logging locations differ by provider, Kubernetes distribution, and controller version.
