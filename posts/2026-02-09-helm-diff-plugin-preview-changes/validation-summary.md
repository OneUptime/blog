# Validation Summary: How to Use Helm Diff Plugin to Preview Changes Before Applying Upgrades

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Helm Diff plugin
- Kubernetes
- kubectl
- GitHub Actions
- Bash

## Sources Consulted
- Helm Diff plugin README and command help: https://github.com/databus23/helm-diff
- Helm plugin install documentation: https://docs.helm.sh/ko/docs/helm/helm_plugin_install/
- Helm upgrade documentation: https://v3.helm.sh/docs/v3/helm/helm_upgrade/
- Kubernetes kubectl diff reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_diff
- actions/checkout documentation: https://github.com/actions/checkout
- Azure/setup-helm documentation: https://github.com/Azure/setup-helm
- actions/github-script documentation: https://github.com/actions/github-script
- Azure k8s-set-context usage references: https://github.com/Azure/k8s-set-context

## Issues Found
- The post claimed the current plugin install flow works with all Helm 3 releases. Updated it to note that the current Helm plugin manager install flow requires Helm 3.18 or later, and added the required `--verify=false` install command for Helm 4.
- The diff output description included a tilde marker for modifications. Helm Diff uses unified diff-style additions and deletions, so the tilde line was removed.
- The filtering section used `--suppress-secrets` for "Show only the summary". Replaced it with `--output simple`, which is the documented simplified output mode.
- The GitHub Actions example used older action major versions and contained an invalid JavaScript template literal with unescaped Markdown backticks. Updated the actions, added the required comment permission, passed the diff through an environment variable, and awaited the GitHub API call.
- The release manifest section described `--detailed-exitcode` as showing a full manifest and saved diff output as `.yaml`. Updated the wording and file extension to reflect that it saves diff output.
- The advanced options section used the undocumented `--suppress-hooks` flag. Replaced it with the documented `--no-hooks` flag.
- The "Diff for New Releases" section used `helm diff install`, which is not a current Helm Diff command. Replaced it with `helm diff upgrade ... --allow-unreleased`.
- The large diff examples only matched changed resources and used lowercase kinds in a grep loop. Updated the grep patterns to include added and removed resources, and corrected Kubernetes kind casing.
- The troubleshooting section used an undocumented `--timeout` flag for Helm Diff. Replaced it with the documented `--disable-validation` option for cluster validation problems.

## Review Notes
Helm was not installed in the local workspace, so command verification was performed against upstream Helm Diff documentation and official Helm/Kubernetes/GitHub Actions references rather than local `--help` output. The validation examples still assume a reachable Kubernetes cluster and a valid kubeconfig where cluster-backed diffing is required.
