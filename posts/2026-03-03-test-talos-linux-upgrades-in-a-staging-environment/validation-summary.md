# Validation Summary: How to Test Talos Linux Upgrades in a Staging Environment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- kubectl
- etcd
- Helm
- Prometheus / promtool
- CNI plugins

## Sources Consulted
- Talos Linux upgrade documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- Talos CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos machine configuration editing documentation: https://docs.siderolabs.com/talos/v1.8/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- Kubernetes API health endpoint documentation: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes field selector documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes ComponentStatus API reference: https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/component-status-v1/

## Issues Found
- The post said Talos Linux OS upgrades touch Kubernetes components. Talos documentation states that Talos OS upgrades do not upgrade the Kubernetes version by default, so I changed this to refer to the node runtime environment for Kubernetes rather than Kubernetes components directly.
- The production machine configuration export used `talosctl get machineconfig -o yaml` directly as if it produced a raw machine config. Talos documentation notes that this returns a resource with the machine configuration under `.spec`, so I piped the output through `yq eval '.spec' -` before comparing it to generated configs.
- The post used a fixed `ghcr.io/siderolabs/installer:v1.7.0` image tag, which is outdated for a 2026 upgrade-testing guide. I replaced it with the `<target-talos-version>` placeholder so the command points to the version being tested.
- The post used `kubectl get pods --all-namespaces | grep -v Running | grep -v Completed`, which also matches the table header and relies on display text rather than API fields. I replaced it with a supported pod phase field selector that excludes `Running` and `Succeeded` pods.
- The post used `talosctl services`, but the current Talos CLI command is `talosctl service`. I updated the command.
- The post used `kubectl get componentstatuses`, which relies on the deprecated Kubernetes ComponentStatus API. I replaced it with `kubectl get --raw='/readyz?verbose'`, matching current Kubernetes API server health endpoint guidance.
- The post said to always use 3 control plane nodes for quorum testing. I changed this to use at least 3, which preserves the quorum-testing advice without incorrectly excluding larger production-like control plane sizes.

## Review Notes
Local `talosctl` and `kubectl` binaries were not installed in the workspace, so CLI verification was performed against official Talos and Kubernetes documentation rather than local `--help` output.
