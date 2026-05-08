# Validation Summary: How to Automate Cluster Changes with calicoctl convert

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes NetworkPolicy
- kubectl
- GitHub Actions
- Bash
- Python 3
- PyYAML

## Sources Consulted
- Calico Open Source calicoctl convert reference: https://docs.tigera.io/calico/latest/reference/calicoctl/convert
- Calico Open Source calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico Open Source calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico Open Source install calicoctl guide: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico Open Source NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source troubleshooting commands for Kubernetes and Calico network policies: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- GitHub Actions workflow syntax reference: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The scripts used `import yaml`, but the prerequisites only listed Python 3. Updated the prerequisites to require Python 3 with PyYAML and added `python3 -m pip install pyyaml` to the GitHub Actions example.
- The inline Python in the GitHub Actions `run` block would be passed to `python3 -c` with leading indentation and fail with `IndentationError`. Replaced it with a heredoc so the Python code is parsed correctly after YAML indentation is stripped.
- The GitHub Actions example used `kubectl` without configuring cluster credentials. Added a kubeconfig setup step that decodes a `KUBECONFIG_DATA` secret into `$HOME/.kube/config`.
- The PR creation step could fail because the workflow did not grant write permissions, configure git author identity, or provide `GH_TOKEN` to the GitHub CLI. Added the required permissions, git config, and `GH_TOKEN` environment variable.

## Review Notes
The Calico command usage is consistent with current documentation: `calicoctl convert -f ... -o yaml` supports converting Kubernetes `NetworkPolicy` resources to Calico v3 format, and `calicoctl validate -f ...` is valid for offline validation of Calico resource files. The pinned `calicoctl` v3.27.0 download URL is still available, but production workflows should normally install the `calicoctl` version that matches the Calico cluster version.
