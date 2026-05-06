# Validation Summary: How to Deploy cert-manager on Kubernetes with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- cert-manager
- OpenTofu
- Terraform Helm provider
- Terraform Kubernetes provider
- Helm
- Let's Encrypt ACME
- Amazon Route53

## Sources Consulted
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- cert-manager supported releases: https://cert-manager.io/docs/releases/
- cert-manager Helm chart values for `v1.20.2`: https://raw.githubusercontent.com/cert-manager/cert-manager/v1.20.2/deploy/charts/cert-manager/values.yaml
- cert-manager HTTP-01 solver docs: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Route53 DNS-01 docs: https://cert-manager.io/docs/configuration/acme/dns01/route53/
- cert-manager Ingress usage docs: https://cert-manager.io/docs/usage/ingress/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- HashiCorp tutorial on Kubernetes custom resources with Terraform: https://developer.hashicorp.com/terraform/tutorials/kubernetes/kubernetes-provider

## Issues Found
- The post pinned cert-manager to `v1.14.0`, which is no longer a supported release. I updated the chart version to `v1.20.2`, which is the current patch release in a supported cert-manager line as of May 6, 2026.
- The Helm value `installCRDs` is deprecated in the current cert-manager chart. I replaced it with `crds.enabled`, which is the current documented setting.
- The original wording implied that `depends_on` was enough to create `ClusterIssuer` resources immediately after the Helm release. HashiCorp's Kubernetes provider requires CRDs to exist before planning custom resources, so I corrected the post to state that the `kubernetes_manifest` resources must be applied in a second OpenTofu run after cert-manager and its CRDs are installed.
- The Route53 DNS-01 example omitted the AWS authentication assumption. I clarified that the snippet assumes ambient AWS credentials such as IRSA or EKS Pod Identity.
- The summary described HTTP-01 as a single-domain solution and said the HTTP-01 plus DNS-01 combination covers "all use cases." I corrected this to "non-wildcard certificates" and "common ACME use cases," which matches cert-manager's actual challenge model more closely.

## Review Notes
- The post still uses the legacy Jetstack HTTP chart repository at `https://charts.jetstack.io`. cert-manager's current docs say OCI charts are the source of truth, but the legacy repository still exists and remains usable.
- The Terraform provider version constraints in the snippet are older than the latest provider releases, but the resources and syntax used in the post remain valid.
