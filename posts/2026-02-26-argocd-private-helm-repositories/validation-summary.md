# Validation Summary: How to Use Helm Charts from Private Helm Repositories

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Helm
- Kubernetes Secrets
- Helm OCI registries
- AWS ECR
- Google Artifact Registry
- Azure Container Registry
- ChartMuseum
- Sonatype Nexus Repository
- JFrog Artifactory
- Sealed Secrets
- External Secrets Operator

## Sources Consulted
- Argo CD private repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/helm/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- AWS CLI `ecr get-login-password` command reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- Google Artifact Registry Helm authentication documentation: https://cloud.google.com/artifact-registry/docs/helm/authentication
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/

## Issues Found
- The post used `argocd repo add --ca-cert-path`, but current Argo CD documentation does not list that as a repository-add flag. I changed the example to use `argocd cert add-tls <hostname> --from <ca-file>` before adding the repository, which is Argo CD's documented method for trusting a custom repository CA.
- The troubleshooting section referred to a `--ca-cert` option and suggested putting a CA certificate directly in the repository Secret. I changed it to reference `argocd cert add-tls` or declarative TLS certificate configuration.
- The token authentication section described the example as bearer-token authentication while using the token as a password. Argo CD documents access tokens as passwords with a non-empty username, so I updated the wording and example username.
- The AWS ECR section referred to an "ArgoCD ECR credential helper." I changed this to the documented reality that ECR authorization tokens are short-lived and need external refresh automation.
- The Google Artifact Registry OCI example included an `https://` scheme in the Argo CD OCI repository URL. Argo CD's Helm OCI examples omit the protocol, so I updated the example to use `us-central1-docker.pkg.dev/my-project/my-repo`.

## Review Notes
The remaining Argo CD repository Secret fields, Helm Application example, TLS client certificate flags, `--enable-oci` usage, `argocd repo list`, `argocd repo get`, and `argocd app get --hard-refresh` command are consistent with the official documentation reviewed. The External Secrets Operator example uses `external-secrets.io/v1beta1`, which is widely documented and still compatible in many installations, though newer installations may prefer the latest stable API version supported by their deployed operator.
