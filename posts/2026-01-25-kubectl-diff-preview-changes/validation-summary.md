# Validation Summary: How to Use kubectl diff to Preview Changes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- Kustomize
- Helm
- Helm diff plugin
- GitHub Actions
- GitLab CI/CD
- Bash
- YAML

## Sources Consulted
- Kubernetes kubectl diff reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_diff/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#apply
- GitHub Actions variables documentation: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables
- GitLab CI/CD script documentation: https://docs.gitlab.com/ci/yaml/script/
- Helm plugins documentation: https://helm.sh/docs/topics/plugins/
- Helm diff plugin documentation: https://github.com/databus23/helm-diff
- Azure setup-kubectl action documentation: https://github.com/Azure/setup-kubectl
- actions/github-script documentation: https://github.com/actions/github-script
- actions/checkout documentation: https://github.com/actions/checkout

## Issues Found
- The GitHub Actions example exported `KUBECONFIG` inside one step, which would not persist to later steps. Changed it to write the decoded kubeconfig to `~/.kube/config`, and added kubectl setup plus kubeconfig configuration to the deploy job.
- The GitHub Actions example used older action majors for reusable CI examples. Updated `actions/checkout`, `azure/setup-kubectl`, and `actions/github-script` to current documented major versions.
- The GitLab deploy job ran `kubectl diff` before `kubectl apply` without handling exit code `1`, so a valid diff would stop the job before applying. Changed it to allow exit code `1` while still failing other errors.
- The Secret comparison example said it decoded secrets, but `kubectl get secret -o yaml` still outputs encoded Secret data. Updated the comment to describe comparing encoded Secret manifests.
- The final validation workflow chained `kubectl diff` with `&&`, so it would skip `kubectl apply` whenever differences existed. Grouped the diff command with an exit-code check so exit code `1` is treated as an expected difference while real errors still stop the workflow.

## Review Notes
The main kubectl examples, `-f`, `-k`, `-R`, `KUBECTL_EXTERNAL_DIFF`, server-side dry-run, and documented diff exit codes match current Kubernetes documentation. The Helm plugin install and `helm diff upgrade` examples match the Helm and helm-diff documentation.
