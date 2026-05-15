# Validation Summary: How to Use talosctl dashboard for Real-Time Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- Terminal-based real-time monitoring
- Prometheus and Grafana monitoring comparison

## Sources Consulted
- Talos Linux v1.13 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos Linux v1.13.2 `talosctl dashboard` source: https://github.com/siderolabs/talos/blob/v1.13.2/cmd/talosctl/cmd/talos/dashboard.go
- Talos Linux v1.13.2 `talosctl service` source: https://github.com/siderolabs/talos/blob/v1.13.2/cmd/talosctl/cmd/talos/service.go
- Talos Linux v1.13.2 `talosctl processes` source: https://github.com/siderolabs/talos/blob/v1.13.2/cmd/talosctl/cmd/talos/processes.go
- Talos Linux interactive dashboard documentation: https://docs.siderolabs.com/talos/v1.9/deploy-and-manage-workloads/interactive-dashboard
- Kubernetes `kubectl top` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/

## Issues Found
- The post listed Tab and Shift+Tab as dashboard node-switching shortcuts. Current Talos CLI documentation and source list `h`/Left and `l`/Right for switching nodes, plus `j`/Down, `k`/Up, and Ctrl-based scrolling shortcuts. Updated the shortcut descriptions and keyboard controls table.
- The post compared the dashboard with `talosctl services`. The canonical command is `talosctl service`; `services` exists as an alias in source, but the official CLI reference documents the singular form. Updated the heading, prose, and command snippet to use `talosctl service`.
- The post said the dashboard provides the same service visibility as `talosctl service`. Official CLI documentation describes the dashboard as node overview, logs, and real-time metrics, not a replacement for the service status command. Updated the comparison to say the dashboard complements service status checks with live logs and resource metrics.

## Review Notes
The remaining command forms using `talosctl dashboard --nodes`, comma-separated node lists, `talosctl logs <service> --follow`, and `kubectl top` are technically valid. The dashboard update interval defaults to 3 seconds and can be changed with `--update-interval`, but the post is not incorrect for omitting that option.
