# Validation Summary: How to Configure ArgoCD Image Updater with ECR

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD Image Updater
- Argo CD Applications
- Kubernetes ConfigMaps, Deployments, and ServiceAccounts
- Amazon ECR
- AWS IAM and IRSA for Amazon EKS
- AWS CLI
- Helm image parameter annotations

## Sources Consulted
- Argo CD Image Updater container registry configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/registries/
- Argo CD Image Updater registry authentication methods: https://argocd-image-updater.readthedocs.io/en/stable/basics/authentication/
- Argo CD Image Updater image configuration and annotations: https://argocd-image-updater.readthedocs.io/en/release-0.15/configuration/images/
- Argo CD Image Updater current image configuration and strategy naming: https://argocd-image-updater.readthedocs.io/en/latest/configuration/images/
- Argo CD Image Updater update methods / Git write-back target: https://argocd-image-updater.readthedocs.io/en/release-0.13/basics/update-methods/
- AWS CLI `ecr get-login-password` command reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- Amazon ECR private registry authentication: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Amazon ECR private repository policy examples: https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-policy-examples.html
- Amazon EKS IRSA cross-account trust policy examples: https://docs.aws.amazon.com/eks/latest/userguide/cross-account-access.html

## Issues Found
- The IRSA trust policy did not include the `aud` condition for `sts.amazonaws.com`. Added it to match AWS EKS IRSA examples and scope the web identity token audience correctly.
- The post described `env:AWS_ECR_TOKEN` as an ECR credential helper setup. Argo CD Image Updater's `env:` credential source expects a `username:password` value and is not the Amazon ECR Docker credential helper. Replaced this with a pull-secret alternative and clarified that the secret still needs token refresh.
- The Application example used `argocd-image-updater.argoproj.io/myapp.semver-constraint`, which is not a documented Application annotation. Moved the semver constraint into the `image-list` image reference, where Image Updater expects semver constraints.
- The Helm example used the legacy `latest` update strategy name. Changed it to `newest-build`, the current strategy name recommended by Argo CD Image Updater documentation.
- The external ECR login script was mounted from a ConfigMap, but the post did not show creating that ConfigMap. Added the missing `kubectl create configmap` command so the `/scripts/ecr-login.sh` mount can resolve.

## Review Notes
The post still uses legacy Application annotations, which remain documented in release 0.15 and can be consumed in newer Image Updater setups through annotation support, but current documentation increasingly centers the `ImageUpdater` custom resource. Future updates could add a version note or a CR-based example.
