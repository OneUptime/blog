# Validation Summary: How to Configure ArgoCD Image Updater with Harbor

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Image Updater
- Argo CD Applications
- Kubernetes ConfigMaps and Secrets
- Harbor container registry
- Harbor robot accounts
- Docker Registry HTTP API v2
- Helm values and Kustomize write-back

## Sources Consulted
- Argo CD Image Updater registry configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/registries/
- Argo CD Image Updater image configuration and update strategies: https://argocd-image-updater.readthedocs.io/en/stable/configuration/images/
- Argo CD Image Updater 0.15 annotation format: https://argocd-image-updater.readthedocs.io/en/release-0.15/configuration/images/
- Argo CD Image Updater write-back methods: https://argocd-image-updater.readthedocs.io/en/release-0.15/basics/update-methods/
- Harbor robot account documentation: https://goharbor.io/docs/2.12.0/working-with-projects/project-configuration/create-robot-accounts/
- Harbor API specification: https://raw.githubusercontent.com/goharbor/harbor/release-2.12.0/api/v2.0/swagger.yaml
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Docker CLI `docker login` reference: https://docs.docker.com/reference/cli/docker/login/

## Issues Found
- The project-level Harbor robot account username examples used `robot$argocd-image-updater`. Harbor project robot accounts include the project name in the generated username, so the examples were changed to `robot$myproject+argocd-image-updater` and the note now distinguishes project and system robot account username formats.
- The semver examples used non-existent `argocd-image-updater.argoproj.io/<alias>.semver-constraint` annotations. Argo CD Image Updater specifies version constraints in the image specification itself, so the constraints were moved into the `image-list` values.
- The reverse-proxy registry example included `tagsortmode: latest-first`, which is not part of the current Image Updater registry configuration. It was removed.
- The latest strategy example used the older `latest` strategy name. Current Image Updater documentation names this strategy `newest-build` and treats `latest` as the legacy name, so the example was updated.

## Review Notes
The post still uses Application annotations and the ConfigMap-based registry example, which match the established Image Updater 0.x workflow. Current Image Updater documentation also describes the newer `ImageUpdater` custom resource, so a future broader refresh could migrate the examples to that style if the blog wants to target only the latest controller configuration model.
