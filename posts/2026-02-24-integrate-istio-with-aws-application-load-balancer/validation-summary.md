# Validation Summary: How to Integrate Istio with AWS Application Load Balancer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- AWS Application Load Balancer
- AWS Load Balancer Controller
- Amazon EKS
- Kubernetes Ingress and Service resources
- AWS Certificate Manager
- AWS WAF
- Route 53
- ExternalDNS
- Helm
- eksctl

## Sources Consulted
- Amazon EKS documentation: Install AWS Load Balancer Controller with Helm - https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html
- Amazon EKS documentation: Route application and HTTP traffic with Application Load Balancers - https://docs.aws.amazon.com/eks/latest/userguide/alb-ingress.html
- AWS Load Balancer Controller documentation: Ingress annotations - https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/
- AWS Load Balancer Controller documentation: IngressClass - https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/ingress_class/
- Istio documentation: Configuring Gateway Network Topology - https://istio.io/latest/docs/ops/configuration/traffic-management/network-topologies/
- Istio documentation: IstioOperator Options - https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- AWS Certificate Manager pricing - https://aws.amazon.com/certificate-manager/pricing/
- AWS Certificate Manager public certificates - https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html
- AWS WAF documentation: Migrating AWS WAF Classic resources - https://docs.aws.amazon.com/waf/latest/developerguide/waf-migrating-from-classic.html
- ExternalDNS AWS tutorial - https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/

## Issues Found
- The AWS Load Balancer Controller install used the old v2.7.0 IAM policy URL. Updated it to v2.14.1 and aligned the Helm chart install with AWS's current documented chart version.
- The `eksctl create iamserviceaccount` command omitted current documented flags for region and overriding an existing service account. Added `--region us-east-1` and `--override-existing-serviceaccounts`.
- The Ingress example used the deprecated `kubernetes.io/ingress.class` annotation. Replaced it with `spec.ingressClassName: alb`.
- The ACM section said ACM certificates are free without qualification. Updated the wording to specify non-exportable public certificates for integrated AWS services, because exportable public certificates and private CA usage can incur charges.
- The WAF section included the WAF Classic `waf-acl-id` annotation. Removed the Classic example and kept the WAFv2 annotation because AWS WAF Classic support ended on September 30, 2025.
- The ExternalDNS Helm command used an outdated Bitnami chart reference and old value shape. Updated it to the official ExternalDNS chart repository and `provider.name=aws`.
- The AWS Load Balancer Controller description implied both Ingress and Service resources provision ALBs. Adjusted it to say they provision load balancers, since Services are generally used for NLBs while Ingress resources configure ALBs.

## Review Notes
The remaining examples are technically plausible, but production deployments should also account for subnet tags, security group policy, IAM permissions for ExternalDNS, and whether the ALB should terminate TLS or pass traffic through to Istio.
