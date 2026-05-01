# Validation Summary: How to Deploy External DNS on Kubernetes with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- ExternalDNS
- OpenTofu / Terraform HCL
- Helm
- AWS Route53
- AWS IAM Roles for Service Accounts (IRSA)
- Azure DNS
- Azure Workload Identity

## Sources Consulted
- ExternalDNS Helm chart docs: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/
- ExternalDNS AWS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- ExternalDNS Azure DNS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/azure/
- ExternalDNS flags reference: https://kubernetes-sigs.github.io/external-dns/latest/docs/flags/
- ExternalDNS repository README compatibility table: https://github.com/kubernetes-sigs/external-dns/blob/master/README.md
- HashiCorp Helm provider registry page: https://registry.terraform.io/providers/hashicorp/helm/latest
- HashiCorp Kubernetes provider registry page: https://registry.terraform.io/providers/hashicorp/kubernetes/latest
- HashiCorp AWS `aws_eks_cluster` data source docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/eks_cluster.html
- HashiCorp AWS `aws_iam_openid_connect_provider` data source docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_openid_connect_provider
- Azure AKS Workload Identity overview: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Kubernetes Secrets docs: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The post pinned Helm chart `1.14.0`, which deploys ExternalDNS `0.14.0`. ExternalDNS upstream documents Kubernetes `1.33+` support only for `0.18.x` and newer, so I updated the chart version to `1.21.1` to avoid publishing a generic 2026 guide around an outdated controller release.
- The AWS Helm values mixed unsupported chart keys (`provider = "aws"`, `aws.zoneType`) with current chart behavior. I changed the snippet to the chart’s supported structure using `provider.name`, `env`, `annotationFilter`, `registry`, and `extraArgs`.
- The AWS snippet said `sources` was filtering by annotation source, which is not what that setting does. I corrected the explanation to reflect that it selects Kubernetes resource sources (`service` and `ingress`).
- The IRSA example referenced an undefined OIDC provider/local value pair. I added the `aws_eks_cluster` and `aws_iam_openid_connect_provider` data sources plus the `locals` block needed to build a valid trust policy.
- The Route53 IAM policy granted `ListResourceRecordSets` on `*`. I tightened it to the hosted zone ARN scope used in the official ExternalDNS policy examples.
- The Azure example used managed identity fields (`useManagedIdentityExtension`, `userAssignedIdentityID`) while the text described Workload Identity. I replaced that with the documented Workload Identity approach: an `azure.json` Secret, `useWorkloadIdentityExtension`, a pod label, a service account annotation, and volume mounts for `/etc/kubernetes/azure.json`.
- The Azure example relied on Helm to create the namespace even though the Secret had to exist in that namespace first. I added an explicit Kubernetes namespace resource so the Secret and Helm release can be applied in a valid order.
- The Kubernetes Service example used the legacy `kubernetes_service` resource name. I updated it to `kubernetes_service_v1` to match the current Kubernetes provider resource set.
- The summary overstated what `sync` alone guarantees. I corrected it to attribute safe deletion behavior to the combination of `sync`, domain filtering, and TXT ownership records rather than `sync` by itself.

## Review Notes
- The corrected snippets now match the current ExternalDNS chart interface, but they still assume the surrounding AWS, Azure, Helm, and Kubernetes provider configuration exists elsewhere in the OpenTofu project.
- For Azure, the post now follows the Workload Identity pattern documented by ExternalDNS and AKS. The required role assignments and federated credential creation are still assumed to be created outside the shown Helm snippet.
- A local `tofu`, `terraform`, or `helm` execution pass was not possible in this environment because those binaries are not installed.
