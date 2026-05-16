# Validation Summary: How to Set Up AWS ALB Ingress on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- AWS Application Load Balancer (ALB)
- AWS Network Load Balancer (NLB)
- AWS Load Balancer Controller (kubernetes-sigs/aws-load-balancer-controller)
- Kubernetes Ingress (networking.k8s.io/v1)
- Helm
- AWS IAM (policies, roles, IRSA)
- AWS ACM, WAFv2, S3 (access logging)
- kubectl, talosctl

## Sources Consulted
- AWS Load Balancer Controller official docs: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/
- IngressClass guide: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/ingress_class/
- Installation guide: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/installation/
- Ingress annotations reference: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/
- aws/eks-charts repository: https://github.com/aws/eks-charts/tree/master/stable/aws-load-balancer-controller
- AWS EKS Subnet auto-discovery tags documentation (kubernetes.io/role/elb and internal-elb)

## Issues Found
1. **Deprecated `kubernetes.io/ingress.class: alb` annotation.** The annotation was deprecated in Kubernetes 1.18 in favor of the `IngressClass` resource and `spec.ingressClassName` field. The AWS Load Balancer Controller's Helm chart creates an `alb` IngressClass by default (`createIngressClassResource=true`). Changed the example to set `spec.ingressClassName: alb` and removed the deprecated annotation.

2. **Malformed kustomize URL for CRD install.** The post had `github.com/aws/eks-charts/stable/aws-load-balancer-controller//crds?ref=master` with the `//` separator placed between `aws-load-balancer-controller` and `crds`. In kustomize URL syntax, `//` separates the repo from the in-repo path, so this form is ambiguous and does not match the official AWS / kubernetes-sigs documentation. Fixed to `github.com/aws/eks-charts/stable/aws-load-balancer-controller/crds?ref=master` to match the official docs.

## Review Notes
- The Helm install command shown creates a service account but does not annotate it with an IAM role ARN, which is consistent with the post's "attach IAM policy to the worker node role" simple-path approach. For IRSA, readers would also need `--set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=<role-arn>` (and typically `serviceAccount.create=false` if pre-creating the SA). The post already notes IRSA as the production recommendation, so this is fine as an introductory tutorial.
- Modern Helm chart versions (v1.4.0+) auto-install CRDs on `helm install` (but not on `helm upgrade`), so the explicit CRD step is belt-and-braces but harmless and matches AWS's own documented procedure.
- The "at least 8 free IP addresses per subnet" guidance for ALB matches AWS's published ALB subnet requirements.
- The `kubernetes.io/role/elb=1` (public) and `kubernetes.io/role/internal-elb=1` (private) subnet tags are correct.
- `alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS": 443}]'` and `ssl-redirect: "443"` annotation values are correct per the controller's annotation reference.
- The post does not pin a controller / chart version. Future readers may want to install a specific version (e.g., `--version` flag) to avoid drift, but this is a stylistic concern rather than a technical error.
