# Validation Summary: How to Set Up CI/CD Pipeline for Dapr Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (distributed application runtime)
- GitHub Actions (CI/CD)
- Docker (container builds via `docker/build-push-action`)
- Trivy (container image vulnerability scanning)
- Kubernetes (deployment via `kubectl`)
- Python / pytest (testing)
- Codecov (coverage reporting)
- Kustomize-style overlays (repository structure)

## Sources Consulted
- docker/build-push-action GitHub repository — verified action outputs (`imageid`, `digest`, `metadata`; no `tags` output exists): https://github.com/docker/build-push-action
- codecov/codecov-action GitHub repository — checked version status (v3 deprecated, v5/v6 current): https://github.com/codecov/codecov-action
- aquasecurity/trivy-action GitHub repository — checked version and input parameters: https://github.com/aquasecurity/trivy-action
- azure/k8s-set-context GitHub repository — confirmed `kubeconfig` is a valid input: https://github.com/azure/k8s-set-context
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions

## Issues Found
1. **Invalid job output reference in `build` job**: The `build` job declared `outputs: image-tag: ${{ steps.meta.outputs.tags }}`, but `docker/build-push-action` does not have a `tags` output. Its valid outputs are `imageid`, `digest`, and `metadata`. Since this output was never consumed by any downstream job (all jobs reference the image tag directly via `${{ env.IMAGE_NAME }}:${{ github.sha }}`), the incorrect `outputs` block was removed entirely.

## Review Notes
- `codecov/codecov-action@v3` is deprecated; the current recommended version is v5 or v6. v3 still functions for basic upload but lacks newer CLI features.
- `docker/build-push-action@v5` is two major versions behind (latest is v7). v5 still works.
- `aquasecurity/trivy-action@master` pins to the default branch rather than a specific version tag. This is a security and reproducibility risk; pinning to a release tag (e.g., `@0.35.0`) is recommended.
- `azure/k8s-set-context@v3` is behind the latest (v5), but functions correctly with the `kubeconfig` input as used.
- The `DAPR_VERSION: 1.13.0` environment variable is declared but never referenced in any workflow step.
- The pipeline overview mentions "Integration tests using `dapr run`" but the actual workflow runs pytest against a staging URL without using the Dapr CLI. This is a minor inconsistency between the conceptual overview and the implementation.
- The overview lists "Deploy to production" as step 6, but the workflow does not include a production deployment job. This is intentional (the post focuses on the path up to staging validation).
