# Validation Summary: How to Use SCM Provider Generator for GitHub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSet
- SCM Provider generator
- GitHub API and repository topics
- GitHub App authentication
- Kubernetes Secrets and kubectl
- GitHub CLI

## Sources Consulted
- Argo CD SCM Provider Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-SCM-Provider/
- Argo CD ApplicationSet Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Declarative Setup / repository credentials documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD FAQ on reconciliation interval: https://argo-cd.readthedocs.io/en/latest/faq/
- GitHub CLI `gh repo edit` manual: https://cli.github.com/manual/gh_repo_edit

## Issues Found
- The post said repositories can be filtered by visibility. The official SCM Provider filters are repository name, paths, labels/topics, and branch, so this was changed to names, branches, topics, and paths.
- The GitHub App secret example only created a generic secret with GitHub App fields. Argo CD documents `appSecretName` as a GitHub App secret in repo-creds format, so the example now includes `type`, `url`, and the `argocd.argoproj.io/secret-type=repo-creds` label.
- The basic example described `allBranches: false` as excluding archived repositories. The field actually controls whether only default branches or all branches are scanned, so the comment was corrected.
- The template parameter list described `url` as always HTTPS. Argo CD documents `url` as the clone URL for the selected clone protocol, and GitHub supports `ssh` and `https`, so examples that rely on HTTPS now set `cloneProtocol: https`.
- The rate limiting section used `argocd-cm` `timeout.reconciliation`, which controls Argo CD application reconciliation rather than the SCM Provider generator polling interval. The example now uses `requeueAfterSeconds` on the SCM Provider generator.

## Review Notes
The remaining examples align with the current Argo CD ApplicationSet SCM Provider documentation. The GitHub token example is valid for classic personal access tokens, but organizations may prefer fine-grained tokens or GitHub App authentication depending on their GitHub policy.
