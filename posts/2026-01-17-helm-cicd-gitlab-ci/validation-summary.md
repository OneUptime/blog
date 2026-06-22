# Validation Summary: Helm Chart CI/CD with GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Kubernetes
- GitLab CI/CD
- GitLab Container Registry
- GitLab Pages
- GitLab Auto DevOps
- Docker-in-Docker
- kind
- Trivy
- Kubesec
- OPA Conftest
- helm-unittest
- helm-diff
- YAML
- POSIX shell

## Sources Consulted
- Helm command documentation: https://helm.sh/docs/helm/
- Helm OCI registry documentation: https://helm.sh/docs/topics/registries/
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- GitLab predefined CI/CD variables reference: https://docs.gitlab.com/ci/variables/predefined_variables/
- GitLab container registry authentication documentation: https://docs.gitlab.com/user/packages/container_registry/authenticate_with_container_registry/
- GitLab container registry documentation: https://docs.gitlab.com/user/packages/container_registry/
- GitLab Helm package registry documentation: https://docs.gitlab.com/user/packages/helm_repository/
- GitLab CI/CD artifacts reports documentation: https://docs.gitlab.com/ci/yaml/artifacts_reports/
- GitLab Pages documentation: https://docs.gitlab.com/user/project/pages/introduction/
- GitLab Auto DevOps customization documentation: https://docs.gitlab.com/topics/autodevops/customize/
- Trivy GitLab CI documentation: https://trivy.dev/docs/latest/tutorials/integrations/gitlab-ci/
- Kubesec documentation: https://github.com/controlplaneio/kubesec
- Conftest options documentation: https://www.conftest.dev/options/
- helm-unittest FAQ: https://github.com/helm-unittest/helm-unittest/blob/main/FAQ.md
- helm-diff documentation: https://github.com/databus23/helm-diff

## Issues Found
- The Trivy config scan artifact was declared as a GitLab `container_scanning` report, but `trivy config --format json` does not produce GitLab's container-scanning report schema. Removed the `artifacts:reports:container_scanning` binding and kept the JSON as a normal artifact.
- The main OCI publish and deploy examples used `oci://${CI_REGISTRY}/${CI_PROJECT_NAMESPACE}/charts`, which omits the project path and can target the wrong GitLab Container Registry namespace. Changed these examples to `oci://${CI_REGISTRY_IMAGE}/charts` for publishing and `oci://${CI_REGISTRY_IMAGE}/charts/${CHART_NAME}` for deployment.
- The deploy jobs pulled private OCI charts without first logging in to the registry. Added `helm registry login` using GitLab's predefined registry credentials before Helm deployment.
- The GitLab Pages index update used `curl` in the `alpine/helm` job without installing it. Added `apk add --no-cache curl` before the Pages publishing script.
- The CI variable table listed unused `HELM_REPO_USERNAME` and `HELM_REPO_PASSWORD` variables and implied predefined registry variables must be manually configured. Replaced them with the GitLab predefined registry variables and clarified that only the kubeconfig variables are configured manually.
- The version-bump job used Bash here-string syntax (`<<<`) in an `alpine:latest` job, where GitLab scripts run under `/bin/sh`. Replaced it with POSIX-compatible `cut` commands.

## Review Notes
The examples are technically valid as CI/CD patterns, but they assume supporting project setup: GitLab Container Registry enabled, runner permissions for Docker-in-Docker/kind where used, protected kubeconfig variables, and per-chart environment values files. Helm 3.13.0 is older than current Helm releases but still supports the OCI commands used in the article.
