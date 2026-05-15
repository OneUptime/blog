# Validation Summary: How to Use talosctl logs to View Service Logs

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- kubectl
- Service logging and centralized log forwarding

## Sources Consulted
- Sidero Talos v1.12 CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Sidero Talos v1.12 logging documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/logging-and-telemetry/logging
- Sidero Talos v1.12 FAQ: https://docs.siderolabs.com/talos/v1.12/troubleshooting/faqs
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/

## Issues Found
- The post used `talosctl services --nodes <node-ip>` to list services. The current Talos v1.12 CLI reference documents `talosctl service [<id> [start|stop|restart|status]] [flags]`, where running it without a service ID lists all services. Changed the example to `talosctl service --nodes <node-ip>`.
- The post stated that `talosctl logs` returns recent log entries by default. The current Talos v1.12 CLI reference documents `--tail int32` as "lines of log file to display (default is to show from the beginning) (default -1)." Updated the wording to say the command shows available output from the beginning by default and that `--tail` controls how many lines are shown.

## Review Notes
The remaining `talosctl logs <service> --nodes <node-ip>`, `--follow`, and `--tail` examples match the current Talos CLI reference. The distinction between `talosctl logs` for node/service logs and `kubectl logs` for pod/container logs is consistent with Talos and Kubernetes documentation. The local environment did not have `talosctl` installed, so CLI verification was performed against official Sidero documentation rather than local `--help` output.
