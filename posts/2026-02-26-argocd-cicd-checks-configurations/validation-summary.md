# Validation Summary: How to Set Up CI/CD Checks for ArgoCD Configurations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- GitHub Actions
- GitLab CI/CD
- YAML / yamllint
- kubeconform
- Helm
- Kustomize
- Conftest / Open Policy Agent
- kubectl
- GitHub CLI and branch protection API

## Sources Consulted
- Argo CD CLI command reference for `argocd app diff`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- kubeconform usage documentation: https://kubeconform.mandragor.org/docs/usage/
- Conftest documentation for policy paths, stdin, and output formats: https://www.conftest.dev/ and https://www.conftest.dev/options/
- Kubernetes `kubectl apply` reference for `--dry-run=server`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Helm `helm template` command reference: https://helm.sh/docs/v3/helm/helm_template/
- GitHub Actions checkout documentation: https://github.com/actions/checkout
- GitHub REST API documentation for branch protection: https://docs.github.com/en/rest/branches/branch-protection
- GitHub CLI `gh api` manual: https://cli.github.com/manual/gh_api
- GitLab CI/CD YAML syntax reference for `rules:changes`: https://docs.gitlab.com/ci/yaml/
- yamllint documentation: https://yamllint.readthedocs.io/

## Issues Found
- The GitHub Actions `build` job validated rendered output with `kubeconform` but did not install `kubeconform` in that job. Added a `kubeconform` install step because each GitHub Actions job runs on a fresh runner.
- The GitHub Actions `policy` job rendered Helm charts and Kustomize overlays but only installed Conftest. Added Helm and Kustomize setup steps to that job.
- The optional `dry-run` job used the `kustomize` binary without installing it in that job. Added a Kustomize install step.
- The diff preview job used `git diff --name-only origin/main...HEAD` after a default checkout. Added `fetch-depth: 0` so the base branch history is available.
- The diff preview script built Markdown with literal `\n` escape sequences in a Bash string. Replaced it with `printf` calls that write real newlines to the report file.
- The GitHub branch protection example passed nested JSON objects through `gh api --field`, which would send string values instead of the required object payload. Replaced it with a JSON request body passed through `--input -` and added the required `restrictions` field set to `null`.

## Review Notes
- The snippets use Kubernetes version `1.29.0` for schema validation. That is technically valid, but teams should update it to match their target cluster version.
- The CRD schema lookup uses the Datree CRDs catalog, which is a common external schema source but may not contain every CRD version used by a repository.
