# Validation Summary: How to Use ArgoCD with AWS ECR for Image Sources

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD Image Updater
- Kubernetes CronJobs, Deployments, Secrets, and Jobs
- Amazon ECR
- Amazon EKS and IRSA
- Helm OCI registries
- AWS CLI
- IAM and ECR repository policies

## Sources Consulted
- Argo CD OCI documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/oci/
- Argo CD private repository documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Image Updater container registry documentation: https://argocd-image-updater.readthedocs.io/en/stable/configuration/registries/
- Argo CD Image Updater image configuration and update strategy documentation: https://argocd-image-updater.readthedocs.io/en/stable/configuration/images/
- Argo CD Image Updater application configuration documentation: https://argocd-image-updater.readthedocs.io/en/stable/configuration/applications/
- AWS ECR private registry authentication documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- AWS CLI ECR get-authorization-token documentation: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-authorization-token.html
- AWS ECR Helm OCI artifact documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/push-oci-artifact.html
- AWS ECR on EKS documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/ECR_on_EKS.html
- AWS EKS node IAM role documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-node-role.html
- AWS ECR repository policy documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-policies.html
- AWS CLI ECR describe-image-scan-findings documentation: https://docs.aws.amazon.com/cli/latest/reference/ecr/describe-image-scan-findings.html
- AWS ECR lifecycle policy documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- Helm registry login documentation: https://helm.sh/docs/helm/helm_registry_login/
- Helm OCI registry documentation: https://helm.sh/docs/topics/registries/

## Issues Found
- The ECR token refresh CronJob used `amazon/aws-cli:latest` but also ran `kubectl`; that image does not provide a reliable runnable example with both tools. Changed the image to a placeholder that explicitly requires both AWS CLI and kubectl, and noted the service account also needs Kubernetes RBAC to manage the Secret.
- The Argo CD Helm OCI repository Secret used only the registry host while the Application used the `helm-charts` repository path. Updated the Secret URL to match the Application repository path.
- The Helm OCI repository Secret implied an empty password would be managed by a credential helper. Argo CD Helm repository credentials require a usable credential or a separate integration that obtains ECR tokens. Replaced the empty password with an explicit ECR login password placeholder and clarified the IRSA/token integration requirement.
- The Argo CD Image Updater ECR auth script returned only the ECR password. Image Updater `ext:` credentials must output `username:password` on one line, so the script now emits `AWS:<password>`.
- The Image Updater Helm values used `extraVolumes` and `extraVolumeMounts`, which are not the current argo-helm chart values. Updated them to `volumes` and `volumeMounts`.
- The Image Updater semver constraint used a non-documented `main.semver-constraint` annotation. Moved the constraint into the `image-list` entry, which is the documented legacy annotation format.
- The update strategy examples used `latest` and `name`, which have been renamed. Updated them to `newest-build` and `alphabetical`, and corrected the `newest-build` description to refer to image creation date rather than push time.

## Review Notes
Argo CD Image Updater 1.x emphasizes `ImageUpdater` custom resources, with legacy Application annotations supported through `useAnnotations`. The post's annotation-based examples remain valid for legacy annotation mode, but a future refresh could show the CR-based configuration path.
