# Validation Summary: Automating Cluster Version Checks with calicoctl version

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes
- kubectl
- GitHub Actions
- Bash scripting

## Sources Consulted
- Calico `calicoctl version` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Calico `calicoctl` user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico `calicoctl` installation guide: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico Kubernetes API datastore configuration: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico `calicoctl node status` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico component versions: https://docs.tigera.io/calico/latest/reference/component-versions
- Kubernetes `kubectl config get-contexts` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_get-contexts/
- GitHub Actions workflow syntax: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions

## Issues Found
- The multi-cluster audit script incorrectly set `KUBECONFIG` to the first cluster server URL from `kubectl config view`, which is not a valid kubeconfig file path and does not select the loop's context. Changed the script to use `calicoctl --context="$CTX" version`, matching Calico's documented multi-context support.
- The audit script bypassed `calicoctl version` by reading `clusterinformation` directly with `kubectl`, which did not match the post's stated approach and depends on internal CRD access. Changed it to parse `Cluster Version:` from `calicoctl version`.
- Version comparison examples used Calico v3.27.0 while current Calico documentation and component versions show v3.32.0. Updated example defaults, install URL, and verification command to v3.32.0.
- The CI example compared client and cluster versions without `--allow-version-mismatch`. Calico documents that mismatched client and cluster versions can cause calls to fail unless this option is used. Added the option to the version checks.
- Added explicit `DATASTORE_TYPE=kubernetes` in automation snippets that rely on Kubernetes datastore access, matching the documented Calico configuration examples.
- The verification section described the audit script as "dry-run mode", but the script does not implement a dry-run mode. Changed the wording to "Run the audit".

## Review Notes
- `calicoctl node status` is a valid command, but Calico notes that some node-related subcommands may not work when run from a local machine instead of a host node. The workflow already treats this as a warning, which is appropriate for this example.
- The Bash version comparison remains intentionally simple and works for standard `vMAJOR.MINOR.PATCH` Calico releases, but it does not handle prerelease suffixes.
