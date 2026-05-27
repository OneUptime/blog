# Validation Summary: How to Set Up GitLab CI/CD for Kubernetes Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- GitLab Container Registry
- GitLab Review Apps and Environments
- Docker and Docker-in-Docker
- Trivy container scanning
- Kubernetes
- kubectl
- Node.js test jobs
- PostgreSQL service containers

## Sources Consulted
- GitLab Docs: Use Docker to build Docker images - https://docs.gitlab.com/ci/docker/using_docker_build/
- GitLab Docs: Predefined CI/CD variables reference - https://docs.gitlab.com/ci/variables/predefined_variables/
- GitLab Docs: CI/CD variables - https://docs.gitlab.com/ci/variables/
- GitLab Docs: Merge request pipelines - https://docs.gitlab.com/ci/pipelines/merge_request_pipelines/
- GitLab Docs: Environments - https://docs.gitlab.com/ci/environments/
- GitLab Docs: Review apps - https://docs.gitlab.com/ci/review_apps/
- GitLab Docs: Using GitLab CI/CD with a Kubernetes cluster - https://docs.gitlab.com/user/clusters/agent/ci_cd_workflow/
- Docker Docs: docker login - https://docs.docker.com/reference/cli/docker/login/
- Aqua Security Trivy Docs: Container image scanning - https://trivy.dev/latest/docs/target/container_image/
- Kubernetes Docs: kubectl rollout - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- The CI/CD variable table told readers to configure registry credentials manually as `REGISTRY_USER` and `REGISTRY_PASSWORD`, but the pipeline uses GitLab's predefined `CI_REGISTRY_USER` and `CI_REGISTRY_PASSWORD`. Updated the table and surrounding text to identify those as predefined variables.
- The `KUBE_CONFIG` variable was marked protected without qualification, which would prevent typical merge request review environment jobs from accessing it. Clarified that it should be protected for staging/production, but not if the same variable is used by review environments.
- The Docker registry login used `docker login -p`, which is supported but not the recommended non-interactive form because passwords can be exposed in shell history or logs. Updated it to use `--password-stdin`.
- The build job only ran when `CI_COMMIT_BRANCH` was set, but the post later deploys review environments from merge request pipelines that need the built image. Added a merge request pipeline rule so the image is available for review deployments.

## Review Notes
The Docker-in-Docker example assumes the GitLab Runner is configured for privileged Docker-in-Docker use. The post already lists a configured runner as a prerequisite, but a production implementation should pin exact image versions and consider GitLab's Kubernetes Agent workflow instead of storing a long-lived kubeconfig in CI/CD variables.
