# Validation Summary: Compare GitHub Resources for Cilium Users

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- GitHub
- GitHub CLI
- Helm charts
- eBPF
- YAML manifests

## Sources Consulted
- Cilium GitHub repository: https://github.com/cilium/cilium
- Cilium contribution guide: https://docs.cilium.io/en/stable/contributing/development/contributing_guide/
- Cilium CLI sysdump command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium CLI version command reference: https://docs.cilium.io/en/latest/cmdref/cilium_version/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- GitHub CLI issue list manual: https://cli.github.com/manual/gh_issue_list
- GitHub CLI pull request create manual: https://cli.github.com/manual/gh_pr_create
- GitHub CLI repo fork help output.
- Cilium GitHub labels and issue template from the GitHub API.

## Issues Found
- The policy issue-filtering example used the label `area/policy`, which is not a current label in the `cilium/cilium` repository. Changed it to `sig/policy`, which is the current policy-related label.
- The sysdump example passed a filename ending in `.zip` to `--output-filename`. Cilium documents this option as the resulting file name without extension. Removed the `.zip` suffix.
- The Kubernetes version command used `kubectl version --short`, which is not present in the current official kubectl reference. Changed it to `kubectl version`.
- The best-practices section referenced `good first issue`, but Cilium's current label is `good-first-issue`. Updated the label name.

## Review Notes
The referenced Cilium repository paths were checked against the current `main` branch. `examples/policies/`, `examples/minikube/http-sw-app.yaml`, `install/kubernetes/cilium/values.yaml`, Helm templates, `pkg/`, `bpf/`, and `Documentation/` are present. The GitHub CLI examples use valid current flags.
