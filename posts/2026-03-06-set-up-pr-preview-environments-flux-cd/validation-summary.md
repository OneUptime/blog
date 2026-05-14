# Validation Summary: How to Set Up PR Preview Environments with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- GitHub Actions
- Docker Buildx GitHub Actions
- cert-manager
- Ingress
- ResourceQuota and LimitRange

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get kustomizations`: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `flux events`: https://fluxcd.io/flux/cmd/flux_events/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- GitHub Actions events documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- GitHub Actions scheduled workflows documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax-for-github-actions#onschedule
- actions/checkout documentation: https://github.com/actions/checkout
- Docker Setup Buildx Action documentation: https://github.com/docker/setup-buildx-action
- Docker Login Action documentation: https://github.com/docker/login-action
- Docker Build Push Action documentation: https://github.com/docker/build-push-action
- actions/github-script documentation: https://github.com/actions/github-script

## Issues Found
- The workflow created PR overlay directories but did not update the parent `apps/myapp/previews/kustomization.yaml` before committing. Flux reconciles the configured path as one Kustomize root, so the parent kustomization must include active PR directories. I added regeneration of the parent resource list to the deploy workflow before the commit.
- The cleanup job removed the PR overlay directory but did not remove the stale entry from the parent preview kustomization. That would leave Kustomize referencing a missing directory and could block Flux reconciliation. I added the same parent kustomization regeneration logic after overlay removal.
- The TTL cleanup was shown as an in-cluster CronJob that directly deleted namespaces. Because Flux would still see the stale overlay in Git, it could recreate those resources on the next reconciliation. I replaced it with a scheduled GitHub Actions workflow that removes stale overlays from Git, allowing Flux `prune: true` to delete the cluster resources declaratively.
- The TTL cleanup command depended on `jq` being present in the container image without declaring or installing it. Replacing the cleanup with a Git-based scheduled workflow removed that undeclared runtime dependency.
- The GitHub Action examples used older action major versions. I updated them to current documented major versions: `actions/checkout@v6`, `docker/setup-buildx-action@v4`, `docker/login-action@v4`, `docker/build-push-action@v7`, and `actions/github-script@v9`.
- The `actions/github-script` comment creation call was not awaited. I changed it to `await github.rest.issues.createComment(...)`, matching the official action examples.
- The parent kustomization generation used `echo -e`, which is less portable across shells. I changed it to `printf "%b"` / `printf` so the generated YAML is predictable.

## Review Notes
- The Flux, Kubernetes, Kustomize, cert-manager, and GitHub Actions API fields used in the corrected snippets match current official documentation.
- I could not run `kubectl` or `flux` locally because neither CLI is installed in this environment, so those commands were validated against official CLI documentation instead.
- For public repositories that accept forked pull requests, the workflow may need additional security design because `pull_request` workflows do not receive repository secrets in typical fork scenarios.
