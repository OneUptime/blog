# Validation Summary: How to Set Up Istio on AWS EKS with Best Practices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Amazon EKS
- Kubernetes
- eksctl
- AWS Load Balancer Controller / Network Load Balancer
- IAM Roles for Service Accounts (IRSA)
- Kubernetes PodDisruptionBudget
- Istio Gateway, VirtualService, DestinationRule, and PeerAuthentication

## Sources Consulted
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS Network Load Balancing: https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html
- AWS Load Balancer Controller service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- Amazon EKS IAM and IRSA best practices: https://docs.aws.amazon.com/eks/latest/best-practices/identity-and-access-management.html
- Amazon EKS service accounts / IRSA: https://docs.aws.amazon.com/eks/latest/userguide/service-accounts.html
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio DNS proxying: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio sidecar injection and proxy resource annotations: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio resource annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio locality load balancing: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/
- Kubernetes node autoscaling concepts: https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/

## Issues Found
- The `eksctl create cluster` example used Kubernetes `1.28`, which is no longer listed as a current EKS standard or extended support version as of this review date. Updated it to `1.35`, the latest standard-support version shown in the Amazon EKS version lifecycle documentation.
- The IstioOperator DNS proxy configuration included `ISTIO_META_DNS_AUTO_ALLOCATE`. Current Istio DNS proxy documentation enables basic sidecar DNS proxying with `ISTIO_META_DNS_CAPTURE`; address auto-allocation is handled through current Istio behavior and ServiceEntry controls. Removed the stale proxy metadata setting and narrowed the explanation.
- The Network Load Balancer annotations used `aws-load-balancer-type: "nlb"` and the deprecated per-attribute cross-zone annotation. Updated the example to current AWS Load Balancer Controller guidance: `aws-load-balancer-type: "external"`, `aws-load-balancer-nlb-target-type: "instance"`, and `aws-load-balancer-attributes: "load_balancing.cross_zone.enabled=true"`.
- The NLB explanation implied AWS would create an NLB from the annotation alone. Clarified that these annotations apply to the AWS Load Balancer Controller and that non-EKS Auto Mode clusters need the controller installed.
- The IRSA explanation incorrectly said AWS SDKs use the EC2 metadata service for IRSA. Updated it to explain that IRSA uses the projected web identity token and AWS STS `AssumeRoleWithWebIdentity`.
- The Istio `Gateway` example used Kubernetes-style `selector.matchLabels`, but Istio Gateway `selector` is a direct label map. Updated it to `selector: { istio: ingressgateway }` in YAML form.

## Review Notes
- The monitoring add-ons referenced from `samples/addons` are useful for demos and basic visibility, but production environments usually install and manage observability components with their own lifecycle and persistence choices.
- Strict mesh-wide mTLS is technically valid when applied in the Istio root namespace, but production migrations should verify all workloads and clients are mesh-compatible before enforcing it globally.
