# Validation Summary: How to Deploy to Multiple Environments with GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions workflows
- GitHub Actions environments, secrets, variables, and deployment protection rules
- GitHub Actions matrix jobs and workflow dispatch inputs
- GitHub Actions manual approval workflows
- Kubernetes `kubectl`
- Helm
- AWS CLI for EKS kubeconfig setup
- Slack webhook notifications

## Sources Consulted
- GitHub Docs: Managing environments for deployment - https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments
- GitHub Docs: Workflow syntax for GitHub Actions - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Docs: Running variations of jobs in a workflow - https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations
- GitHub Docs: Events that trigger workflows - https://docs.github.com/actions/using-workflows/events-that-trigger-workflows
- GitHub Docs: Use GITHUB_TOKEN for authentication in workflows - https://docs.github.com/actions/reference/authentication-in-a-workflow
- GitHub actions/checkout repository and releases - https://github.com/actions/checkout
- trstringer/manual-approval action README - https://github.com/trstringer/manual-approval
- Kubernetes Docs: `kubectl set image` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes Docs: `kubectl rollout status` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Helm Docs: `helm upgrade` - https://helm.sh/docs/helm/helm_upgrade/
- AWS Docs: Create or update a kubeconfig file for Amazon EKS - https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html
- AWS CLI Command Reference: `aws eks update-kubeconfig` - https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html

## Issues Found
- The sequential Kubernetes deployment examples set `KUBECONFIG_DATA` but did not make it available to `kubectl`. `kubectl` reads kubeconfig from the `KUBECONFIG` path or the default kubeconfig file, not from a custom `KUBECONFIG_DATA` variable. Added commands to write the secret value to a temporary kubeconfig file and export `KUBECONFIG` before running `kubectl`.
- The manual approval example used `${{ github.TOKEN }}`. GitHub's documented way to pass the default workflow token is `${{ secrets.GITHUB_TOKEN }}`. Updated the example accordingly.
- The preview environment cleanup job checked for `github.event.action == 'closed'`, but the workflow only subscribed to `opened`, `synchronize`, and `reopened` pull request activity types, so cleanup would never run. Added `closed` to the trigger and guarded the deploy job so it does not deploy on close events.

## Review Notes
- `actions/checkout@v6` is current as of this review, but it requires sufficiently recent runner versions. This is worth mentioning if the post is later expanded for self-hosted runners.
- The GitHub API comment and manual approval examples may require explicit `permissions` entries, such as `issues: write`, in repositories with restricted default `GITHUB_TOKEN` permissions.
- The Docker image name `myapp` is a placeholder; real workflows should use an authenticated registry-qualified image name.
