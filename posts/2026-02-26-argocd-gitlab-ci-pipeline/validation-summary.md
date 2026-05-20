# Validation Summary: How to Create a Complete GitLab CI + ArgoCD Pipeline

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- GitLab Container Registry
- Argo CD
- Argo CD Image Updater
- Argo CD Notifications
- Kubernetes
- Kustomize
- Docker-in-Docker

## Sources Consulted
- GitLab Docs: Use Docker to build Docker images - https://docs.gitlab.com/ci/docker/using_docker_build/
- GitLab Docs: CI/CD artifacts reports types - https://docs.gitlab.com/ci/yaml/artifacts_reports/
- GitLab Docs: Environments and review apps - https://docs.gitlab.com/ci/environments/
- GitLab Docs: Deployments API - https://docs.gitlab.com/api/deployments/
- Argo CD Docs: Declarative setup and repository secrets - https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD Docs: Application specification - https://argo-cd.readthedocs.io/en/release-2.12/user-guide/application-specification/
- Argo CD Docs: Webhook configuration - https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD Docs: Notifications webhook service - https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Image Updater Docs: Container registries - https://argocd-image-updater.readthedocs.io/en/v0.7.0/configuration/registries/
- Kubernetes Docs: Kustomize - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Alpine Linux Packages: kubectl and kustomize packages for Alpine 3.19 - https://pkgs.alpinelinux.org/

## Issues Found
- The Docker login example used `docker login -p`, which works but is not the current recommended CI pattern. Updated it to pipe `CI_REGISTRY_PASSWORD` into `docker login --password-stdin`, matching GitLab's Docker-in-Docker examples.
- The Argo CD Image Updater registry credential example was modeled as an Argo CD repository secret with `type: helm`, which is not how Image Updater registry credentials are configured. Replaced it with a Kubernetes Secret containing `username:password` credentials and an `argocd-image-updater-cm` `registries.conf` entry that references the secret.
- The multi-environment deployment template ran `kustomize edit set image` from an Alpine image without installing Kustomize. Added `kustomize` to the `apk add` line.
- The multi-environment deployment template returned to `/builds/deployment-repo`, which is not the correct clone location for a project workspace. Changed it to `${CI_PROJECT_DIR}/deployment-repo`.
- The merge request review deployment job used `kubectl` from `alpine:3.19` without installing it. Added `apk add --no-cache kubectl`.
- The review Argo CD Application did not enable automated sync or namespace creation, so applying the Application would not deploy the review environment automatically. Added automated sync and `CreateNamespace=true`.
- The review environment stop job also used `kubectl` without installing it. Added `apk add --no-cache kubectl`.
- The GitLab webhook section mentioned an Argo CD webhook secret but did not state the required Argo CD secret key. Added the `argocd-secret` `webhook.gitlab.secret` key note.
- The Argo CD Notifications example posted to the GitLab Deployments API without required `ref` and `tag` fields. Added both fields to the webhook payload.

## Review Notes
- The GitLab CI examples still use `only`, which remains supported, though `rules` is the more flexible modern style for larger pipelines.
- The Argo CD Application uses a non-default project named `applications`; readers must create that AppProject separately.
- The review app example assumes GitLab Runner has a Kubernetes context with permission to create Argo CD Applications and namespaces.
