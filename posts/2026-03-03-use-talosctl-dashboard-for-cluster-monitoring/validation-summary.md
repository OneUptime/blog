# Validation Summary: How to Use talosctl dashboard for Cluster Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- Kubernetes Metrics Server / kubectl top
- Prometheus and Grafana

## Sources Consulted
- Talos Linux latest CLI reference for `talosctl dashboard`: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux `talosctl` endpoints and nodes documentation: https://docs.siderolabs.com/talos/v1.12/learn-more/talosctl
- Talos Linux interactive dashboard documentation: https://docs.siderolabs.com/talos/v1.10/deploy-and-manage-workloads/interactive-dashboard
- Talos source for `talosctl dashboard` command and key handling: https://github.com/siderolabs/talos/blob/d42b3b396fb14036720cda44f9b2044e98c62f06/cmd/talosctl/cmd/talos/dashboard.go
- Kubernetes generated reference for `kubectl top`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/

## Issues Found
- The post described the dashboard as showing service status and running services. Current Talos documentation describes `talosctl dashboard` as a text UI for node overview, logs, and real-time metrics, so I changed those references to node overview, logs, and resource usage.
- The post said the dashboard opens with panels for system summary, CPU, memory, and running processes. Current Talos documentation and source describe screens for summary, monitor, and resource explorer views, so I adjusted the wording to avoid implying an exact undocumented panel layout.
- The keyboard shortcuts were inaccurate. The post listed Tab and Shift+Tab for node switching, but the official CLI reference documents `h`/Left and `l`/Right for node switching, plus `j`/Down, `k`/Up, and Ctrl-based paging for logs/process scrolling. I updated the shortcut list accordingly and retained `q` for quitting after confirming it in the Talos source.
- The service comparison used `talosctl services` and said the dashboard provides the same information plus resource metrics. `services` is an alias, but the canonical command is `talosctl service`, and the dashboard is not documented as a replacement for direct service state queries. I changed the example to `talosctl service` and clarified the distinction.
- The resource overhead section claimed the dashboard uses existing Talos API streaming endpoints and reads metrics that are already being collected. That implementation detail is not stated in the official CLI documentation, so I replaced it with the documented default update interval and the `--update-interval` flag.

## Review Notes
The remaining commands use valid `talosctl dashboard --nodes ...` syntax via inherited CLI flags. The post does not pin a Talos version; the review used the current Talos v1.12 documentation and current upstream source.
