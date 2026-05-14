# Validation Summary: How to Configure OCIRepository with Docker Hub in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller OCIRepository
- Flux CLI OCI artifact commands
- Kubernetes Secrets
- Docker Hub
- Docker personal access tokens and organization access tokens
- GitHub Actions

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API v1 reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux v2.6 GA announcement: https://fluxcd.io/blog/2025/05/flux-v2.6.0/
- Flux CLI `flux push artifact` documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux CLI `flux tag artifact` documentation: https://fluxcd.io/flux/cmd/flux_tag_artifact/
- Flux CLI `flux list artifacts` documentation: https://fluxcd.io/flux/cmd/flux_list_artifacts/
- Flux CLI `flux create secret oci` documentation: https://fluxcd.io/flux/cmd/flux_create_secret_oci/
- Kubernetes `kubectl create secret docker-registry` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Docker Hub OCI artifacts documentation: https://docs.docker.com/docker-hub/repos/manage/hub-images/oci-artifacts/
- Docker personal access tokens documentation: https://docs.docker.com/security/for-developers/access-tokens/
- Docker organization access tokens documentation: https://docs.docker.com/enterprise/security/access-tokens/
- Docker Hub usage and limits documentation: https://docs.docker.com/docker-hub/usage/
- Docker CLI `docker login` documentation: https://docs.docker.com/reference/cli/docker/login/
- GitHub Actions contexts reference: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs

## Issues Found
- The post referred to Docker Hub "robot accounts" for authentication. Docker's current official automation credential types are personal access tokens and organization access tokens, so the wording was updated to use PATs and OATs.
- The prerequisites said Flux CD v0.35 or later, but the manifests use `source.toolkit.fluxcd.io/v1` for OCIRepository. Flux v2.6 promoted OCIRepository to the v1 API, so the prerequisite was updated to Flux v2.6 or later for these examples.
- The prerequisite and token creation guidance implied write access was always required, and recommended "Read, Write, Delete" for pushing. The text was adjusted to say read-only is enough for pulling, and read/write or broader write-including permissions are needed for pushing.
- The Docker Hub rate limit diagram listed Pro/Team as 5000 pulls per day. Current Docker documentation lists authenticated Pro, Team, and Business accounts as unlimited pull rate, subject to fair use, so the diagram was updated.

## Review Notes
The Flux CLI examples, OCIRepository fields, `secretRef` usage, Docker registry secret shape, Docker login usage, and GitHub Actions workflow syntax were consistent with the consulted official documentation. The GitHub Actions example uses `fluxcd/flux2/action@main`; pinning to a release tag would improve reproducibility, but this is not a technical correctness issue.
