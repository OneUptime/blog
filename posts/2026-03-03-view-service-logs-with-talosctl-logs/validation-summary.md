# Validation Summary: How to View Service Logs with talosctl logs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Talos Linux
- talosctl CLI
- Kubernetes static pod and container logs
- Talos machine logging configuration
- Unix log filtering tools

## Sources Consulted
- Talos Linux CLI reference for `talosctl logs`, `talosctl dashboard`, `talosctl containers`, and `talosctl service`: https://docs.siderolabs.com/talos/latest/reference/cli
- Talos Linux logging documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/logging-and-telemetry/logging
- Talos Linux troubleshooting documentation for control plane container logs: https://docs.siderolabs.com/talos/v1.9/troubleshooting/troubleshooting
- Talos Linux machine configuration reference for `machine.logging.destinations`: https://www.talos.dev/latest/reference/configuration/v1alpha1/config/

## Issues Found
- The Kubernetes control plane log examples used `talosctl logs kube-apiserver`, `kube-controller-manager`, and `kube-scheduler` as if those were Talos service names. Talos documents Kubernetes container logs through `talosctl logs -k` with the Kubernetes containerd namespace. I changed the examples to list containers with `talosctl containers -k` and then use `talosctl logs -k <container-name>`.
- The API server troubleshooting examples repeated the unsupported direct `kube-apiserver` service log form. I changed them to use `talosctl logs -k <kube-apiserver-container>`.
- The post claimed `talosctl logs` supports `-o json` and showed `jq` examples. The official CLI reference for `talosctl logs` does not include an output format flag. I replaced that section with guidance to process text output directly or use Talos log forwarding with `json_lines`.
- The log retention section described Talos as keeping logs only in a limited in-memory buffer. Current Talos logging documentation says logs are written under `/var/log`, and forwarding is recommended for aggregation and longer-term retention. I updated the wording to refer to local log history and rotation.

## Review Notes
The `talosctl logs` flags shown for service logs, including `--follow`, `--tail`, and multi-node `--nodes` usage, match the official CLI reference. The remote logging configuration shape and `json_lines` format are documented and current.
