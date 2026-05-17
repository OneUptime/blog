# Validation Summary: How to Check Service Status on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl CLI
- Kubernetes (kubectl)
- etcd
- containerd / CRI
- kubelet
- Prometheus / CronJob (monitoring integration example)
- Bash scripting

## Sources Consulted
- Talos source code — service state definitions: https://github.com/siderolabs/talos/blob/main/internal/app/machined/pkg/system/events/events.go
- Talos sequencer source — control-plane vs worker services: https://github.com/siderolabs/talos/blob/main/internal/app/machined/pkg/runtime/v1alpha1/v1alpha1_sequencer_tasks.go
- Talos v1.9 etcd maintenance docs: https://docs.siderolabs.com/talos/v1.9/build-and-extend-talos/cluster-operations-and-maintenance/etcd-maintenance
- Talos GHCR container registry: https://github.com/siderolabs/talos/pkgs/container/talosctl (verified `ghcr.io/siderolabs/talosctl:v1.9.0` manifest returns HTTP 200)
- Kubernetes PR #93570 — componentstatuses deprecation: https://github.com/kubernetes/kubernetes/pull/93570
- Kubernetes 1.19 CHANGELOG: https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.19.md

## Issues Found

1. **Fabricated service state "Pre"** — The post listed a service state called "Pre" with the description "The service is running pre-start tasks." This is not a real Talos service state. The canonical list defined in Talos source (`events.go`) is: `Initialized`, `Starting`, `Preparing`, `Waiting`, `Running`, `Stopping`, `Finished`, `Failed`, `Skipped`. Pre-start tasks actually run as part of the `Preparing` state. **Fix:** Removed the "Pre" section, folded the pre-start-tasks language into the `Preparing` description, and added a section for the real `Starting` state.

2. **Incorrect claim about worker-node services** — The post stated "A healthy worker node will show the same services except etcd." Per the Talos sequencer source (`StartAllServices` in `v1alpha1_sequencer_tasks.go`), both `etcd` and `trustd` are appended only for `TypeInit`/`TypeControlPlane` machine types, not `TypeWorker`. **Fix:** Updated the sentence to exclude both `etcd` and `trustd`.

## Review Notes
- The remaining content was verified accurate: `talosctl etcd alarm list` is a real subcommand; `ghcr.io/siderolabs/talosctl:v1.9.0` is a valid published image (even though it isn't listed in the v1.9.0 release notes, the manifest is publicly pullable); `kubectl get componentstatuses` is correctly noted as deprecated (since Kubernetes v1.19, Aug 2020).
- The phrase "Or use a endpoints file" in the multi-node section is slightly misleading — `-e` accepts inline endpoint addresses, not a file path; endpoints from a file are sourced from `talosconfig`. Left unchanged since the command itself works as written.
- The post does not list `dashboard` or `syslogd`, which are present on all node types in recent Talos versions. The omission is not incorrect (these can be configured/disabled), but readers on newer Talos may see additional rows in their output.
