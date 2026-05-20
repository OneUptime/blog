# Validation Summary: How to Configure ArgoCD Image Updater with Docker Hub

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD
- Argo CD Image Updater
- Kubernetes Applications and ConfigMaps
- Docker Hub
- GitOps write-back configuration
- Helm and Kustomize image update targets

## Sources Consulted
- Argo CD Image Updater application configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/applications/
- Argo CD Image Updater image configuration and legacy annotations: https://argocd-image-updater.readthedocs.io/en/release-0.15/configuration/images/
- Argo CD Image Updater update strategies: https://argocd-image-updater.readthedocs.io/en/latest/basics/update-strategies/
- Argo CD Image Updater update methods and Git write-back targets: https://argocd-image-updater.readthedocs.io/en/latest/basics/update-methods/
- Argo CD Image Updater registry configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/registries/
- Argo CD Image Updater run command reference: https://argocd-image-updater.readthedocs.io/en/stable/install/cmd/run/
- Docker Hub pull usage and limits: https://docs.docker.com/docker-hub/usage/pulls/

## Issues Found
- The post used a non-existent `argocd-image-updater.argoproj.io/<alias>.semver-constraint` annotation. Updated the examples to put semver constraints in the `image-list` image spec, which is how legacy annotations define constraints.
- The post used the deprecated `latest` update strategy name. Updated examples and headings to use `newest-build`, which is the current strategy name.
- The post described the newest-build strategy as selecting by push date. Updated the wording to build date, matching the Image Updater behavior.
- The registry `limit` comment described limiting API calls per interval. Updated it to requests per second, matching the registry configuration documentation.
- The post implied Application annotations alone are sufficient in current versions. Added a note that current CR-based Image Updater deployments must select those Applications with `useAnnotations: true` for legacy annotations to be read.

## Review Notes
The annotation-based examples are technically valid as legacy annotation configuration when `useAnnotations: true` is enabled. A future revision could modernize the whole article around the `ImageUpdater` custom resource format, but that would be a larger rewrite beyond correcting technical inaccuracies.
