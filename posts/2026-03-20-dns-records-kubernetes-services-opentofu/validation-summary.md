# Validation Summary: How to Create DNS Records for Kubernetes Services with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / HCL
- Kubernetes Services and Ingress
- ExternalDNS
- Helm
- AWS EKS
- AWS IAM / IRSA
- Amazon Route 53

## Sources Consulted
- ExternalDNS Helm chart `1.14.3` README: https://github.com/kubernetes-sigs/external-dns/blob/external-dns-helm-chart-1.14.3/charts/external-dns/README.md
- ExternalDNS Helm chart `1.14.3` values: https://github.com/kubernetes-sigs/external-dns/blob/external-dns-helm-chart-1.14.3/charts/external-dns/values.yaml
- ExternalDNS Helm chart `1.14.3` deployment template: https://github.com/kubernetes-sigs/external-dns/blob/external-dns-helm-chart-1.14.3/charts/external-dns/templates/deployment.yaml
- ExternalDNS AWS tutorial for `v0.14.0`: https://github.com/kubernetes-sigs/external-dns/blob/v0.14.0/docs/tutorials/aws.md
- ExternalDNS AWS provider source for `v0.14.0`: https://github.com/kubernetes-sigs/external-dns/blob/v0.14.0/provider/aws/aws.go
- Amazon EKS IAM best practices for IRSA trust policy examples: https://docs.aws.amazon.com/eks/latest/best-practices/identity-and-access-management.html
- Amazon Route 53 service authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonroute53.html
- Terraform Kubernetes provider `ingress_v1` docs: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/ingress_v1.md
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes well-known annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/

## Issues Found
- The IRSA trust policy used `${var.oidc_provider_url}:sub` and `${var.oidc_provider_url}:aud` directly. AWS trust policy condition keys for EKS IRSA use the issuer host/path without the `https://` prefix, so I changed both keys to `replace(var.oidc_provider_url, "https://", "")`.
- The Helm values block used unsupported chart values for chart `1.14.3`: `aws.region`, `aws.zoneType`, `aws.preferCNAME`, and `annotationFilter` are not rendered by that chart version. I replaced them with supported settings by using `provider.name`, adding `env` for `AWS_DEFAULT_REGION`, and moving Route 53 zone filtering and annotation filtering into `extraArgs`.
- The Helm snippet relied on the chart’s generated service account name matching the IRSA trust policy. I pinned `serviceAccount.name = "external-dns"` so the Helm release and IAM trust policy stay aligned explicitly.
- The Ingress example used the deprecated `kubernetes.io/ingress.class` annotation. I replaced it with the current `ingress_class_name` field on `kubernetes_ingress_v1`.
- The introductory sentence implied IAM permissions were the universal requirement even though the post description also mentions Azure DNS and Cloudflare. I corrected that sentence to refer to provider credentials or IAM permissions.

## Review Notes
- This post pins Helm chart `1.14.3`, which maps to ExternalDNS app version `0.14.0`. That version still uses the Route 53 IAM action `route53:ListTagsForResource`; newer upstream AWS docs for newer ExternalDNS versions use `route53:ListTagsForResources`. I kept the singular action because it matches the pinned app version’s provider implementation.
- IRSA remains technically valid, but AWS now also offers EKS Pod Identity as a newer alternative for some deployments.
