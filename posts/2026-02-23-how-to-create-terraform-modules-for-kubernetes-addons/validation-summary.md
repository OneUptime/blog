# Validation Summary: How to Create Terraform Modules for Kubernetes Addons

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- Helm provider for Terraform (v2.x block syntax)
- Kubernetes provider for Terraform
- Amazon EKS
- ingress-nginx Helm chart
- cert-manager Helm chart
- kube-prometheus-stack Helm chart (Prometheus + Grafana + Alertmanager)
- external-dns Helm chart
- AWS IRSA (IAM Roles for Service Accounts)
- AWS Route 53
- Let's Encrypt ACME

## Sources Consulted
- Terraform Helm provider docs: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Terraform Kubernetes provider docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- Terraform AWS EKS data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/eks_cluster
- ingress-nginx Helm chart: https://github.com/kubernetes/ingress-nginx/tree/main/charts/ingress-nginx
- cert-manager Helm chart values: https://artifacthub.io/packages/helm/cert-manager/cert-manager
- cert-manager ClusterIssuer (ACME): https://cert-manager.io/docs/configuration/acme/
- kube-prometheus-stack: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- external-dns Helm chart: https://github.com/kubernetes-sigs/external-dns/tree/master/charts/external-dns
- AWS legacy in-tree LB annotations: https://kubernetes.io/docs/concepts/services-networking/service/#aws-nlb-support
- terraform-aws-modules/eks/aws outputs: https://registry.terraform.io/modules/terraform-aws-modules/eks/aws/latest

## Issues Found
- **Duplicate `grafana.adminPassword` configuration**: The monitoring module set `grafana.adminPassword` via both `set` and `set_sensitive`. Setting it first via plain `set` defeats the purpose of `set_sensitive`, since the password is then visible in plan output. Removed the plain `set` block so only `set_sensitive` is used.

## Review Notes
- The post uses the Helm provider v2.x block syntax (`kubernetes { ... }` nested in the provider, and `set { ... }` blocks in `helm_release`). Helm provider v3.0 (released late 2024) changed this to attribute syntax (`kubernetes = { ... }`, `set = [...]`). The v2 syntax remains valid for users pinning the v2 provider, but readers using a newer Helm provider should be aware they may need to migrate.
- `installCRDs = "true"` is correct for cert-manager chart 1.14.0 (the version pinned in the example). It was deprecated in chart 1.15 in favor of `crds.enabled`. If readers bump the cert-manager version, they should switch to the new key.
- The `kubernetes_manifest` resource for the Let's Encrypt `ClusterIssuer` has a well-known limitation: it requires the CRD to be reachable at plan time. Because the cert-manager CRDs are installed by the `helm_release` in the same apply, the first `terraform apply` will fail at plan for this resource. The typical workaround is to apply in two stages (apply the Helm release first, then the manifest), or to install the ClusterIssuer via a `helm_release` of a small umbrella chart, or via the `kubectl_manifest` resource from `gavinbunney/kubectl`. The `depends_on` shown does not work around this. Worth noting for future revisions, but not a code-correctness issue per se.
- The AWS NLB annotation `service.beta.kubernetes.io/aws-load-balancer-type: nlb` is for the legacy in-tree cloud controller. For clusters using the AWS Load Balancer Controller, the recommended value is `external` with additional `aws-load-balancer-nlb-target-type` / `aws-load-balancer-scheme` annotations. The post's approach still works on EKS but is the older pattern.
- All Helm chart names, repository URLs, and resource/data-source schemas verified against current provider documentation.
