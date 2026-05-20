# Validation Summary: How to Pull Helm Charts from S3 Buckets with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Helm and Helm plugins
- helm-s3
- Kubernetes Deployment and Secret manifests
- Amazon S3
- Amazon EKS IRSA
- Amazon ECR OCI Helm charts

## Sources Consulted
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD private repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD OCI documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/oci/
- Argo CD GitHub releases: https://github.com/argoproj/argo-cd/releases
- Helm plugins documentation: https://helm.sh/docs/topics/plugins/
- helm-s3 install documentation: https://helm-s3.hypnoglow.io/docs/install/
- helm-s3 usage documentation: https://helm-s3.hypnoglow.io/docs/usage/
- helm-s3 configuration documentation: https://helm-s3.hypnoglow.io/docs/configuration/
- Amazon EKS Argo CD repository access documentation: https://docs.aws.amazon.com/eks/latest/userguide/argocd-configure-repositories.html

## Issues Found
- The custom repo-server image installed `helm-s3` while running as root, then switched to the `argocd` user. Helm installs plugins under the current user's plugin directory, so Argo CD would not reliably find the plugin. Changed the Dockerfile to install OS packages as root, switch to `argocd`, install `helm-s3` as that user, and set `HELM_PLUGINS`.
- The snippets pinned older example versions: Argo CD `v2.10.0` and `helm-s3` `0.16.0`. Updated the examples to Argo CD `v3.4.2` and `helm-s3` `0.17.1`, matching current release information available during review.
- The init container example extracted only the plugin tarball contents into a tools directory and mounted a single binary, but Helm downloader plugins require a plugin directory containing `plugin.yaml` and the binary under `HELM_PLUGINS`. Changed the init container to extract the full tarball under `/helm-plugins/helm-s3` and mount that directory into the repo-server with `HELM_PLUGINS=/helm-plugins`.
- The IRSA section wrote an IAM policy document but then attached a policy ARN without showing how the policy was created. Added the missing `aws iam create-policy` command.
- The troubleshooting S3 access command used `aws s3 ls` inside the repo-server pod, but the repo-server image does not necessarily include the AWS CLI. Clarified that the command applies only if the AWS CLI is installed in the image.

## Review Notes
- The core approach is valid: Argo CD uses Helm to render charts, Helm downloader plugins can add protocols such as `s3://`, and `helm-s3` supports S3-backed Helm repositories through the normal Helm repository workflow.
- The ECR OCI alternative is directionally correct. For Helm-format OCI repositories in Argo CD, the repository URL should omit the `oci://` prefix and use the `chart` field, which the post does.
