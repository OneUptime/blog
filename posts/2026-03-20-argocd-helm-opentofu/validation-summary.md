# Validation Summary: How to Deploy ArgoCD with Helm and OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Helm
- OpenTofu
- Kubernetes
- OIDC / SSO
- RBAC
- ingress-nginx
- GitHub App repository credentials

## Sources Consulted
- Argo Helm chart `argo-cd-6.7.0` README: https://raw.githubusercontent.com/argoproj/argo-helm/argo-cd-6.7.0/charts/argo-cd/README.md
- Argo Helm chart `argo-cd-6.7.0` values: https://raw.githubusercontent.com/argoproj/argo-helm/argo-cd-6.7.0/charts/argo-cd/values.yaml
- Argo Helm chart tag reference: https://github.com/argoproj/argo-helm/tree/argo-cd-6.7.0/charts/argo-cd
- Argo CD ingress documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Argo CD user management and OIDC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/
- Argo CD projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD project specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD application specification reference: https://argo-cd.readthedocs.io/en/release-2.12/user-guide/application-specification/
- Terraform Kubernetes provider tutorial for `kubernetes_manifest` CRD planning behavior: https://developer.hashicorp.com/terraform/tutorials/kubernetes/kubernetes-provider
- OpenTofu `yamlencode` documentation: https://opentofu.org/docs/language/functions/yamlencode/

## Issues Found
- The OIDC example referenced `clientSecret: $oidc.okta.clientSecret` but did not define that key in `argocd-secret`. I added `configs.secret.extra["oidc.okta.clientSecret"] = var.oidc_client_secret` because Argo CD resolves `$...` references from `argocd-secret`, and the `argo-cd` chart exposes `configs.secret.extra` for this purpose.
- The post implied that `helm_release.argocd`, `AppProject`, and `Application` could be planned together with `kubernetes_manifest`. The Kubernetes provider requires CRDs to exist at plan time for custom resources, so I updated the overview and steps to make the initial CRD/bootstrap apply explicit.
- The project example set `clusterResourceWhitelist = []` while the application example enabled `CreateNamespace=true`. Because `Namespace` is cluster-scoped, that combination would block Argo CD from auto-creating the destination namespace. I changed the project to allow `Namespace` while still denying other cluster-scoped resources.
- The RBAC example granted developers `applications, sync` on `*/*`, which would allow syncing production applications and contradicted the text about preventing unauthorized production changes. I narrowed that permission to `dev/*`.
- The `Application` example did not explicitly depend on the `AppProject`. I added `depends_on = [kubernetes_manifest.argocd_project_production]` to make ordering deterministic.
- The ingress example used `nginx.ingress.kubernetes.io/ssl-passthrough` without mentioning the `ingress-nginx` controller prerequisite. I added a note that the controller must be started with `--enable-ssl-passthrough`.

## Review Notes
- The pinned Helm chart version `6.7.0` is valid for the reviewed keys and structure, but readers should re-check chart values before upgrading to newer chart majors because ingress and configuration options have changed across releases.
- The application sync example uses `targetRevision = "HEAD"`, which is valid for Git sources, but some teams may prefer a branch name such as `main` for clearer intent.
