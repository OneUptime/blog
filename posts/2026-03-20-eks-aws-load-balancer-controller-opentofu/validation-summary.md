# Validation Summary: How to Deploy AWS Load Balancer Controller on EKS with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS EKS
- AWS Load Balancer Controller
- AWS IAM and IRSA
- Helm
- Kubernetes Ingress
- ALB and NLB

## Sources Consulted
- AWS Load Balancer Controller releases: https://github.com/kubernetes-sigs/aws-load-balancer-controller/releases
- AWS EKS Helm chart repository and chart index: https://aws.github.io/eks-charts/
- AWS Load Balancer Controller installation guide: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/installation/
- AWS Load Balancer Controller subnet discovery guide: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/subnet_discovery/
- AWS Load Balancer Controller ingress annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/
- AWS Load Balancer Controller ingress class guide: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/ingress_class/
- AWS Load Balancer Controller how-it-works guide: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/how-it-works/
- Amazon EKS guide for the AWS Load Balancer Controller: https://docs.aws.amazon.com/eks/latest/userguide/aws-load-balancer-controller.html
- Amazon EKS ALB ingress guide: https://docs.aws.amazon.com/eks/latest/userguide/alb-ingress.html
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- HashiCorp Kubernetes provider `kubernetes_ingress_v1` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/ingress_v1.md
- HashiCorp HTTP provider `http` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-http/main/docs/data-sources/http.md
- HashiCorp AWS provider `aws_eks_cluster` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/eks_cluster.html.markdown
- HashiCorp AWS provider `aws_iam_openid_connect_provider` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/iam_openid_connect_provider.html.markdown

## Issues Found
- The post pinned an outdated Helm chart version (`1.8.1`) and fetched the IAM policy from the moving `main` branch. I updated both to the current controller/chart release `3.2.2` so the policy and chart stay aligned.
- The IRSA example referenced an undeclared `local.oidc_provider` value and an undefined OIDC provider resource. I added `aws_eks_cluster` and `aws_iam_openid_connect_provider` data sources plus a derived `local.oidc_provider` so the trust policy example is complete.
- The Helm snippet relied on the chart-generated service account name implicitly matching the IRSA trust policy subject. I set `serviceAccount.name = "aws-load-balancer-controller"` explicitly to remove that ambiguity.
- The Ingress example used the deprecated `kubernetes.io/ingress.class` annotation. I replaced it with `spec.ingress_class_name = "alb"` to match current Kubernetes and provider guidance.
- The prerequisites were outdated and imprecise. I added the current Kubernetes requirement (`1.22+`) for the pinned chart release and corrected the subnet tagging guidance to the current role-tag requirements, noting that cluster tags are optional on newer controller releases.
- The introduction overstated the controller's role by saying it "replaces" the in-tree cloud provider. I narrowed that wording to the accurate load-balancing behavior it supersedes.

## Review Notes
- As of 2026-05-01, the current release shown in the AWS Load Balancer Controller releases page and the EKS chart index is `3.2.2`. Some AWS EKS documentation pages still show older version examples, so version checks were cross-validated against the release page and chart index.
- The tutorial remains valid for self-managed AWS Load Balancer Controller installs on standard EKS clusters. On EKS Auto Mode clusters, AWS documents that you may not need to install this controller separately.
- For future upgrades, note that Helm installs the controller CRDs on first install, but CRD updates still need manual handling during later chart upgrades.
