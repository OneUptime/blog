# Validation Summary: How to Deploy ArgoCD on Kubernetes with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Helm provider for OpenTofu/Terraform
- Kubernetes provider for OpenTofu/Terraform
- Argo CD
- Kubernetes
- Helm
- NGINX Ingress
- cert-manager
- GitOps

## Sources Consulted
- Argo CD Helm chart README for chart version `6.6.0`: https://github.com/argoproj/argo-helm/blob/argo-cd-6.6.0/charts/argo-cd/README.md
- Argo CD Helm chart values for chart version `6.6.0`: https://github.com/argoproj/argo-helm/blob/argo-cd-6.6.0/charts/argo-cd/values.yaml
- Argo CD declarative setup docs: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD private repositories docs: https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/
- Argo CD project specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD application specification reference: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/application-specification/
- Argo CD automated sync docs: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- HashiCorp Kubernetes provider docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- HashiCorp Kubernetes `kubernetes_manifest` resource docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest
- HashiCorp Kubernetes `kubernetes_secret` resource docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret.html
- HashiCorp Helm provider docs: https://registry.terraform.io/providers/hashicorp/helm/latest/docs

## Issues Found
- The post declared the Kubernetes provider but never configured it, even though `kubernetes_namespace`, `kubernetes_secret`, and `kubernetes_manifest` all depend on it. I added a `provider "kubernetes"` block using the same API endpoint, CA certificate, and token as the Helm provider so the examples can actually connect to the cluster.
- The ingress values shown for `argo-cd` chart `6.6.0` used the wrong schema. I replaced the old-style `server.ingress.hosts` and list-based `server.ingress.tls` fields with the chart v6 fields `server.ingress.hostname` and `server.ingress.extraTls`, switched to `ingressClassName`, and set `configs.params."server.insecure" = true` plus the NGINX backend protocol annotation so TLS termination at the ingress matches the upstream chart documentation.
- The AppProject example allowed `Namespace` with `group = "*"`, but Argo CD documents `Namespace` as a core-group resource with `group = ""`. I corrected the whitelist entry to match the official AppProject examples.
- The post implied that Argo CD custom resources could be created in the same initial apply as the Helm release. `kubernetes_manifest` resolves CRD schemas during planning, so that bootstrap flow is not reliable until the Argo CD CRDs already exist. I added a note instructing readers to apply the Helm release first and then run a full apply for the `AppProject` and `Application` resources.
- The best-practices section said `selfHeal` "immediately" reverts manual changes. Argo CD automatically reconciles drift, but not literally instantaneously, so I adjusted the wording to avoid overstating the behavior.

## Review Notes
- The corrected examples are accurate for the pinned `argo-cd` Helm chart version `6.6.0`, but that chart version is older than the current releases as of 2026-05-07. Future maintenance should consider updating the version pins and re-validating the values schema.
- The post pins `hashicorp/helm` `~> 2.12` and `hashicorp/kubernetes` `~> 2.24`. Those versions are older than current provider releases, but the corrected configuration remains valid for the APIs used in this post.
- The repository SSH key and Argo CD admin password hash are stored through OpenTofu-managed resources. The Kubernetes provider documentation notes that secret data is stored in state, so production setups should treat state storage as sensitive.
