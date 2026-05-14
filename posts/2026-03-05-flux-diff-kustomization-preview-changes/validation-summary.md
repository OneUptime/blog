# Validation Summary: How to Use flux diff kustomization to Preview Changes in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes
- Kustomize
- GitOps
- GitHub Actions

## Sources Consulted
- Flux CLI reference for `flux diff kustomization`: https://fluxcd.io/flux/cmd/flux_diff_kustomization/
- Flux CLI reference for `flux build kustomization`: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI installation and GitHub Actions setup: https://fluxcd.io/flux/cmd/
- GitHub Actions workflow permissions documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- actions/github-script documentation: https://github.com/actions/github-script
- actions/checkout documentation: https://github.com/actions/checkout
- Azure Kubernetes set context action documentation: https://github.com/Azure/k8s-set-context

## Issues Found
- The GitHub Actions workflow used `pull-requests: write` as the only token permission while calling `github.rest.issues.createComment` and checking out the repository. Changed permissions to `contents: read` and `issues: write`, matching GitHub's documented scopes for repository checkout and issue/PR comments.
- The GitHub Actions workflow used older major versions of common actions and omitted the documented `method: kubeconfig` input for `azure/k8s-set-context`. Updated the snippet to `actions/checkout@v6`, `azure/k8s-set-context@v4` with `method: kubeconfig`, and `actions/github-script@v9`.
- The Exit Codes section said errors always exit with code `2`. Flux documents errors as `>1`, so the post now states `>1`.
- The `flux build kustomization` comparison said the build command works without cluster access. Flux normally fetches the in-cluster Kustomization unless `--kustomization-file` and `--dry-run` are used, and dry-run skips substitutions from cluster Secrets and ConfigMaps. Updated that paragraph to reflect the documented behavior.

## Review Notes
The main `flux diff kustomization my-app --path ./apps/my-app` command, `--path` flag, server-side dry-run explanation, prune behavior, post-build substitution behavior, and Flux GitHub Action usage are consistent with the official Flux documentation.
