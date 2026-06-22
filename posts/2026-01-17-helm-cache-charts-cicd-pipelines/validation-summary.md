# Validation Summary: How to Cache Helm Charts in CI/CD Pipelines for Faster Builds

## Status
validated

## Post Type
Technical guide / CI/CD tutorial

## Technologies Covered
- Helm
- Kubernetes chart repositories
- GitHub Actions
- GitLab CI/CD
- Jenkins Pipeline
- Azure DevOps Pipelines
- CircleCI
- Nginx/WebDAV-style chart cache

## Sources Consulted
- Helm command reference for `helm dependency build`: https://helm.sh/docs/helm/helm_dependency_build/
- Helm command reference for `helm repo add`: https://helm.sh/docs/helm/helm_repo_add/
- Helm command reference for `helm repo update`: https://helm.sh/docs/helm/helm_repo_update/
- Helm command reference for `helm repo index`: https://helm.sh/docs/helm/helm_repo_index/
- Helm command reference and environment variables: https://helm.sh/docs/helm/helm/
- Helm chart repository guide: https://helm.sh/docs/topics/chart_repository/
- GitHub Actions cache documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching
- `actions/cache` official repository: https://github.com/actions/cache
- `actions/checkout` official repository: https://github.com/actions/checkout
- `Azure/setup-helm` official repository: https://github.com/Azure/setup-helm
- GitLab CI/CD caching documentation: https://docs.gitlab.com/ci/caching/
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- Jenkins Pipeline basic steps reference for `stash`/`unstash`: https://www.jenkins.io/doc/pipeline/steps/workflow-basic-steps/
- Azure DevOps Cache@2 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/cache-v2
- Azure DevOps pipeline caching documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/release/caching
- Azure DevOps HelmInstaller@1 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/helm-installer-v1
- CircleCI Helm orb documentation: https://circleci.com/developer/orbs/orb/circleci/helm

## Issues Found
- GitHub Actions snippets used older action references for checkout and Helm setup. Updated `actions/checkout@v6` to `actions/checkout@v7` and `azure/setup-helm@v3` to `azure/setup-helm@v5.0.0` to match the current official action examples.
- Jenkins stash example implied `stash`/`unstash` could restore dependencies from previous builds. Jenkins documentation states stashes are not available in other Pipeline runs, so the example was corrected to use stash only for later stages in the same run.
- Custom cache server workflow uploaded chart archives without updating `index.yaml`. Helm chart repositories require an index file, so the workflow now generates or merges an index with `helm repo index` and uploads it with the chart packages.
- Custom cache server workflow implied that adding a `cache` repository would make `helm dependency build` try that repository before upstream repositories. Helm resolves dependencies from the repositories configured in chart metadata and lock files, so the snippet now states that dependencies should reference `repository: "@cache"`.
- The weekly GitHub Actions cache key included `github.run_id`, which is unique for every workflow run and prevents cache reuse. The example now creates the week output before the cache step and uses a reusable week-based key with restore keys.

## Review Notes
- The performance comparison numbers are illustrative rather than guaranteed; actual savings depend on chart count, repository latency, runner cache behavior, and network conditions.
- Helm 3.13.0 remains usable in the examples, but newer Helm 3 releases are available. Teams should pin a tested Helm version rather than relying on `latest`.
- GitLab cache and Azure Cache@2 examples are syntactically aligned with current documentation, but real cache sharing depends on runner/executor configuration and cache backend availability.
