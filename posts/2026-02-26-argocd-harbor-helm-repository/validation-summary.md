# Validation Summary: How to Add Harbor as a Helm Repository in ArgoCD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- Harbor
- Helm
- Helm OCI registries
- ChartMuseum
- Kubernetes Secrets and ConfigMaps
- GitLab CI

## Sources Consulted
- Argo CD Private Repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD OCI source documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/oci/
- Harbor 2.7 Managing Helm Charts documentation: https://goharbor.io/docs/2.7.0/working-with-projects/working-with-images/managing-helm-charts/
- Harbor Working with OCI Helm Charts documentation: https://goharbor.io/docs/main/working-with-projects/working-with-oci/working-with-helm-oci-charts/
- Harbor 2.8 release notes on ChartMuseum removal: https://goharbor.io/blog/harbor-2.8/
- Harbor Robot Accounts documentation: https://goharbor.io/docs/2.14.0/administration/robot-accounts/
- Harbor OIDC authentication documentation: https://goharbor.io/docs/1.10/administration/configure-authentication/oidc-auth/
- Helm OCI registry documentation: https://helm.sh/docs/v3/topics/registries/
- Helm registry login command reference: https://helm.sh/docs/v3/helm/helm_registry_login/

## Issues Found
- The post said Harbor v1.x to v2.7 included ChartMuseum and that ChartMuseum was being deprecated. Harbor added Helm chart management in v1.6 and removed ChartMuseum in v2.8. Updated the version wording to state that ChartMuseum existed from Harbor v1.6 through v2.7 and is not included in Harbor 2.8 or later.
- The OCI repository registration examples used only `harbor.company.com`, while the Application example used `harbor.company.com/platform`. Argo CD's Helm OCI examples register the registry namespace used as the chart repository. Updated the CLI and repository Secret URL to `harbor.company.com/platform`.
- The OCI Application section said the Application uses the full OCI reference. Argo CD Helm OCI chart sources omit the `oci://` scheme and use `repoURL`, `chart`, and `targetRevision`. Reworded the sentence to match Argo CD's Helm OCI behavior.
- The unauthorized troubleshooting command checked image tags through the Docker Registry API, which does not directly validate pulling the Helm chart shown in the post. Replaced it with `helm registry login` and `helm pull oci://... --version ...` to test OCI chart credentials directly.

## Review Notes
The Argo CD repository Secret fields, Application API version and Helm fields, ChartMuseum repository URL pattern, `enableOCI` field, Harbor robot account guidance, OIDC CLI secret guidance, TLS ConfigMap name, and Helm OCI push examples are consistent with the consulted documentation. The post still covers ChartMuseum for legacy Harbor installations, but readers on Harbor 2.8 or later should use OCI mode.
