# Validation Summary: How to Deploy and Manage ArgoCD with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Kubernetes
- Helm provider
- Kubernetes provider
- Argo CD
- GitHub HTTPS repository authentication

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/v1.9/language/providers/requirements/
- OpenTofu provider configuration: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu resource addressing and `-target`: https://opentofu.org/docs/cli/state/resource-addressing/
- OpenTofu registry API for `opentofu/helm`: https://registry.opentofu.org/v1/providers/opentofu/helm/versions
- OpenTofu registry API for `opentofu/kubernetes`: https://registry.opentofu.org/v1/providers/opentofu/kubernetes/versions
- Helm provider `helm_release` docs: https://github.com/hashicorp/terraform-provider-helm/blob/main/docs/resources/release.md
- Kubernetes provider `kubernetes_manifest` docs: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/manifest.md
- Kubernetes provider `kubernetes_secret_v1` docs: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/secret_v1.md
- HashiCorp tutorial on managing Kubernetes custom resources: https://developer.hashicorp.com/terraform/tutorials/kubernetes/kubernetes-provider
- Argo CD getting started: https://argo-cd.readthedocs.io/en/release-2.14/getting_started/
- Argo CD application specification reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/application-specification/
- Argo CD declarative setup for repository secrets: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD ingress and TLS behavior: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Argo Helm chart values and templates for `argo-cd` 6.7.3: https://github.com/argoproj/argo-helm/tree/argo-cd-6.7.3/charts/argo-cd
- GitHub personal access token authentication over HTTPS: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens

## Issues Found
- The post configured `kubernetes_namespace`, `kubernetes_manifest`, and `kubernetes_secret` resources without an explicit `kubernetes` provider block. I added `provider "kubernetes" { config_path = "~/.kube/config" }` so the Kubernetes resources are configured consistently with the Helm provider.
- The Helm `set` path for `configs.params.server.insecure` was not escaped. The Helm provider docs show that literal dots in keys must be escaped, so I changed it to `configs.params.server\\.insecure`.
- The post implied that the Argo CD Helm release and the `Application` custom resource could be applied in the same normal `tofu apply`. That is not reliable with `kubernetes_manifest`, because the provider validates the CRD schema during planning. I removed the misleading `depends_on`, added an explanatory sentence, and updated the commands to install Argo CD first and then run a second `tofu apply`.
- The access instructions used `https://localhost:8080` and service port `443` while also enabling `server.insecure=true`. In Argo CD insecure mode, TLS is disabled on the server. I changed the port-forward to `8080:80` and the URL to `http://localhost:8080`.
- The private GitHub repository secret used `username = "git"` alongside a GitHub personal access token. GitHub HTTPS authentication requires a username to be supplied with the token, so I changed this to `var.github_username`.
- The summary section implied the `Application` resource could be declared immediately after the Helm install without regard to CRD availability. I updated that sentence to reflect that the Argo CD CRDs must exist first.

## Review Notes
- The pinned Argo CD Helm chart version `6.7.3` is valid, but it is older than current releases as of 2026-05-07. The post remains technically correct because the configuration fields used here still exist for that chart version.
- Keeping `server.insecure=true` is technically correct with the updated HTTP port-forward, but it should only be used for local development or when TLS is terminated upstream by an ingress or load balancer.
