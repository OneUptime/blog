# Validation Summary: How to Use Pull Requests for Environment Promotion in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Kubernetes
- Kustomize
- GitOps
- GitHub Actions
- GitHub CLI
- GitHub branch protection
- Pull request-based CI/CD promotion

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `flux diff kustomization` documentation: https://fluxcd.io/flux/cmd/flux_diff_kustomization/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Kubernetes `kubectl kustomize` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kubernetes `kubectl apply` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- GitHub CLI `gh pr create`, `gh pr list`, and `gh api` help output from the installed CLI.
- GitHub REST API branch protection documentation: https://docs.github.com/en/rest/branches/branch-protection
- GitHub Actions workflow syntax and permissions documentation: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions
- GitHub Actions `GITHUB_TOKEN` workflow triggering documentation: https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow
- actions/github-script documentation: https://github.com/actions/github-script

## Issues Found
- The branch-based promotion example mixed branch promotion with directory-based promotion. It told readers to edit `apps/staging/**` and then open a PR from `main` to `production`, which would not update production manifests if Flux reconciled `apps/production/**`. Updated the branch-based structure and workflow paths to use stable manifest paths under `apps/**`, leaving the later single-branch directory-based alternative intact.
- The automated promotion workflow used `secrets.GITHUB_TOKEN` to create promotion PRs. GitHub documents that events caused by `GITHUB_TOKEN` do not trigger most follow-on workflows, so the validation PR workflow might not run. Changed the example to use a separate `PROMOTION_PR_TOKEN` GitHub App token or fine-grained PAT.
- The GitHub Actions examples omitted explicit token permissions needed for creating PRs, reading repository contents, and labeling PRs. Added scoped `permissions` blocks.
- The validation workflow used the standalone `kustomize` binary without installing it. Replaced `kustomize build` with `kubectl kustomize`, which is documented as built into `kubectl`.
- The validation workflow ran cluster-dependent `kubectl` and `flux diff` commands without configuring Kubernetes credentials. Added a kubeconfig setup step using a `PRODUCTION_KUBECONFIG` secret.
- The `flux diff kustomization` command used an unsupported `--source-ref` flag. Replaced it with the documented `--path` usage and a Kubernetes `--context` inherited flag.
- The `flux diff kustomization` step would fail promotion PRs whenever differences were found, even though Flux documents exit code 1 as "differences found." Updated the script to fail only when Flux returns an error status greater than 1.
- The branch protection `gh api` example passed JSON objects through `-f`, which sends raw string fields, and omitted the required `restrictions` field for the branch protection endpoint. Rewrote the command with nested `-F` fields and `restrictions=null`.

## Review Notes
The examples are now technically consistent for a branch-based promotion model. Teams using multiple clusters or private runners still need to provide the correct kubeconfig secret, labels, branch protection check names, and token scopes for their own repository.
