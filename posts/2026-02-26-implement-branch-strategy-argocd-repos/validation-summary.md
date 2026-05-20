# Validation Summary: How to Implement Branch Strategy for ArgoCD Repos

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Application manifests
- GitOps repository promotion patterns
- Kubernetes manifests and Kustomize overlays
- Git branches and tags
- GitHub CODEOWNERS and branch protection
- GitHub Actions workflows
- peter-evans/create-pull-request GitHub Action

## Sources Consulted
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Kustomize images reference: https://github.com/kubernetes-sigs/kustomize/blob/master/site/content/en/docs/Reference/API/Kustomization%20File/images.md
- Kustomize official repository and installation script: https://github.com/kubernetes-sigs/kustomize
- GitHub CODEOWNERS documentation: https://docs.github.com/articles/about-codeowners
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub REST API branch protection documentation: https://docs.github.com/en/rest/branches/branch-protection
- actions/checkout official repository: https://github.com/actions/checkout
- peter-evans/create-pull-request official documentation: https://github.com/peter-evans/create-pull-request
- GitHub CLI `gh pr create --help` output from the local environment

## Issues Found
- The Argo CD `Application` examples omitted `spec.project`, which is part of the official Application spec. Added `project: default` to each example Application.
- The single-branch and tag-based Argo CD examples showed `source` but omitted `destination`, which made the snippets incomplete for the deployment behavior being described. Added representative `destination.server` and `destination.namespace` fields.
- The GitHub Actions promotion workflow used older action versions. Updated `actions/checkout` from `v4` to `v6` and `peter-evans/create-pull-request` from `v6` to `v8` to match current official examples.
- The promotion workflow used `kustomize` without installing the standalone binary. Added an install step using the official Kubernetes SIGs Kustomize installation script.
- The promotion workflow did not grant the `GITHUB_TOKEN` permissions required by `peter-evans/create-pull-request` in repositories with restricted default permissions. Added `contents: write` and `pull-requests: write`.
- The workflow requested `platform-team` through the `reviewers` input, which is for user reviewers. Changed it to `team-reviewers` for a GitHub team and added an explicit token input because team review requests require a PAT or equivalent GitHub App token.
- The workflow extracted the first image tag from the rendered manifests, which could promote the wrong image in overlays containing multiple images. Narrowed the match to `myorg/${{ inputs.service }}`.

## Review Notes
The branch-per-environment, directory-per-environment, and tag-based promotion strategies are technically valid patterns in Argo CD because `targetRevision` can point at branches, tags, or commits and `path` selects the manifest directory. The branch protection snippet is a YAML-shaped illustration of GitHub branch protection API fields, not a complete standalone configuration file.
