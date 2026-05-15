# Validation Summary: How to Use talosctl reboot to Restart Nodes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- etcd
- kubectl

## Sources Consulted
- Sidero Labs Talos v1.13 CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Sidero Labs Talos changelog: https://docs.siderolabs.com/changelog
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/

## Issues Found
- The post said `talosctl reboot` drains the Kubernetes node automatically during the reboot process. Current Talos exposes draining as the explicit `--drain` flag, so the text was changed to state that graceful reboot is the default and `--drain` is required for Talos-managed cordon and pod eviction.
- The post used `talosctl services`, but the documented command is `talosctl service`. The command example was corrected.
- The post described `talosctl etcd members` as an etcd health check. The command lists members, but `talosctl etcd status` is the correct fit for checking member status, so the example was updated.
- The post described `--mode powercycle` as equivalent to a hard reset and recommended it when graceful reboot hangs. Current Talos documents `powercycle` as bypassing kexec and `force` as skipping graceful teardown, so the mode examples and troubleshooting guidance were updated.

## Review Notes
The kubectl examples for `kubectl drain --ignore-daemonsets --delete-emptydir-data`, `kubectl get pods --field-selector spec.nodeName=... -A`, and `kubectl get nodes -w` align with current Kubernetes documentation. No version-specific Talos version was pinned in the article, so the review used the current Talos v1.13 CLI reference available during validation.
