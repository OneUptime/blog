# Validation Summary: How to Enable Kubernetes Audit Logging on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, `talosctl`)
- Kubernetes (kube-apiserver audit logging)
- Kubernetes audit policy (`audit.k8s.io/v1`)
- Fluent Bit (DaemonSet log collection)
- Elasticsearch (log destination)

## Sources Consulted
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit Policy API reference (`audit.k8s.io/v1`): https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- kube-apiserver flag reference (audit-log-*, audit-policy-file, audit-webhook-*): https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Talos Linux machine configuration reference (`machine.files`, `cluster.apiServer.extraArgs`, `cluster.apiServer.extraVolumes`): https://www.talos.dev/latest/reference/configuration/v1alpha1/config/
- Talos Linux CLI reference (`talosctl patch machineconfig`, `talosctl apply-config`, `talosctl usage`): https://www.talos.dev/latest/reference/cli/
- Fluent Bit Elasticsearch output plugin: https://docs.fluentbit.io/manual/pipeline/outputs/elasticsearch
- Cross-referenced validated sibling posts in this repository (e.g., `use-staged-mode-for-configuration-changes-in-talos-linux`, `patch-talos-machine-configs-with-talosctl-machineconfig-patch`, `set-up-audit-logging-for-talos-linux`).

## Issues Found
1. **Incorrect `talosctl` command for live-node patching.** The original example used `talosctl apply-config --nodes ... --patch @audit-logging-patch.yaml`. In current Talos Linux releases, `apply-config` takes a full machine configuration (with `-f, --file`) and its `--config-patch` (`-p`) flag patches the local config before submission. To patch an existing live node's machine configuration with a partial YAML patch, the correct command is `talosctl patch machineconfig --nodes ... --patch @file.yaml`. Updated the command accordingly. This matches the correction made in several sibling validated posts.
2. **Incorrect Fluent Bit output plugin for Elasticsearch.** The Fluent Bit configuration declared `Name forward` but pointed `Host` at Elasticsearch on port 9200. The `forward` plugin speaks the Fluentd/Fluent Bit Forward protocol (default port 24224), not the Elasticsearch HTTP API. Changed `Name forward` to `Name es`, which is the correct plugin for shipping records to Elasticsearch over HTTP on port 9200.

## Review Notes
- The audit event JSON sample, audit stages (RequestReceived, ResponseStarted, ResponseComplete, Panic), and audit levels (None, Metadata, Request, RequestResponse) are accurate per the Kubernetes auditing reference.
- The kube-apiserver flag names used in `cluster.apiServer.extraArgs` (`audit-log-path`, `audit-log-maxage`, `audit-log-maxbackup`, `audit-log-maxsize`, `audit-policy-file`, `audit-webhook-config-file`, `audit-webhook-batch-max-size`, `audit-webhook-batch-max-wait`) are all valid. Talos requires `extraArgs` values to be strings, which the post correctly does (e.g., `"30"`).
- The audit policy YAML uses valid `audit.k8s.io/v1` schema, including rules that match an entire API group by specifying `group:` without `resources:`.
- The `machine.files` entry uses valid fields (`content`, `permissions`, `path`, `op: create`) and the `extraVolumes` entries use valid `hostPath`/`mountPath`/`name`/`readOnly` fields.
- `talosctl usage` is a real command for retrieving filesystem disk usage on a node, so the monitoring example is correct.
- Readers should be aware that audit policy choices significantly affect log volume; the trade-off advice in the Performance Considerations section is reasonable guidance but not version-specific.
