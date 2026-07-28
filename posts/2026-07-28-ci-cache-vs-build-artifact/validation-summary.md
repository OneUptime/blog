# Validation Summary: CI Cache vs Build Artifact: Which Should You Use Between Jobs and Workflow Runs?

## Status

validated

## Post Type

Guide

## Technologies Covered

- CI/CD caches and build artifacts
- GitHub Actions
- GitLab CI/CD
- BuildKit build cache
- Package and container registries
- Artifact digests, provenance, and attestations

## Sources Consulted

- [GitHub Actions: Dependency caching](https://docs.github.com/en/actions/concepts/workflows-and-actions/dependency-caching)
- [GitHub Actions: Dependency caching reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
- [GitHub Actions: Workflow artifacts](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts)
- [GitHub Actions: Store and share data with workflow artifacts](https://docs.github.com/en/actions/tutorials/store-and-share-data)
- [GitHub Actions: Downloading workflow artifacts](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts)
- [GitHub Actions: Passing information between jobs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/pass-job-outputs)
- [GitHub Actions: Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [GitHub Actions: Expressions and status-check functions](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions)
- [GitHub Actions: Artifact attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations)
- [Official `actions/checkout` releases](https://github.com/actions/checkout/releases)
- [Official `actions/upload-artifact` releases](https://github.com/actions/upload-artifact/releases)
- [Official `actions/download-artifact` releases](https://github.com/actions/download-artifact/releases)
- [GitLab CI/CD: Job artifacts](https://docs.gitlab.com/ci/jobs/job_artifacts/)
- [GitLab CI/CD: Caching](https://docs.gitlab.com/ci/caching/)
- [GitLab CI/CD: `needs`](https://docs.gitlab.com/ci/yaml/needs/)
- [Docker Build: Registry cache](https://docs.docker.com/build/cache/backends/registry/)

## Issues Found

- The GitHub Actions example used superseded major versions for all three referenced actions. Updated `actions/checkout@v6` to `actions/checkout@v7`, `actions/upload-artifact@v6` to `actions/upload-artifact@v7`, and `actions/download-artifact@v7` to `actions/download-artifact@v8`, matching the current official major releases as of the validation date.

## Review Notes

- The updated Action majors use the Node.js 24 action runtime. This is handled by the example's GitHub-hosted `ubuntu-latest` runners; self-hosted runners must be new enough to support Node.js 24 actions.
- `actions/upload-artifact@v4` and later are not supported on GitHub Enterprise Server. The example is valid for GitHub.com, as indicated by its use of a GitHub-hosted runner label.
- The second YAML block is conceptual pseudocode illustrating an unsafe cache-as-artifact pattern, not runnable GitHub Actions or GitLab CI/CD configuration.
- For hardened production workflows, pinning actions to full commit SHAs provides stronger supply-chain immutability than mutable major-version tags.
