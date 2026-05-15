# Validation Summary: How to Use talosctl services to Manage Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl CLI
- Talos services
- Kubernetes node services
- containerd
- etcd
- kubelet

## Sources Consulted
- Sidero Labs Talos CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Sidero Labs Talos logging documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/logging-and-telemetry/logging
- Sidero Labs Talos extension services documentation: https://docs.siderolabs.com/talos/v1.12/build-and-extend-talos/custom-images-and-development/extension-services
- Sidero Labs talosctl concepts documentation: https://docs.siderolabs.com/talos/v1.12/learn-more/talosctl
- Sidero Labs Talos for Linux Admins documentation: https://docs.siderolabs.com/talos/v1.12/learn-more/talos-for-linux-admins

## Issues Found
- The introduction described `machined` as a kernel-level service that drives the Talos API. Updated it to describe `machined` as the Talos init process and clarified that `apid` handles and routes talosctl API requests.
- The post used `talosctl services <service>` for single-service inspection. Updated those examples to the documented `talosctl service <service>` form.
- The post said single-service output includes uptime. Updated the wording to describe state, health, and recent events, which matches the documented output.
- The log examples used `talosctl logs --since`, but the current Talos CLI reference documents `--tail` and follow behavior for logs, not `--since`. Replaced the time-range example with a supported `-f --tail 0` example.
- The kubelet restart and stop descriptions overstated that the node leaves the cluster. Updated them to describe the more accurate NotReady / pod status impact.
- The monitoring example omitted `udevd` even though the post listed it as an expected core service. Added `udevd` to the required service lists.

## Review Notes
The post is technically relevant and generally aligned with current Talos service-management documentation after the corrections. `talosctl` was not installed in the review workspace, so CLI verification was performed against the current official Sidero Labs documentation rather than local `--help` output.
