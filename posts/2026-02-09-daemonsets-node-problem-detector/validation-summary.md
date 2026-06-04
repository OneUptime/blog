# Validation Summary: How to use DaemonSets for node problem detector and auto-remediation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes DaemonSets
- Kubernetes Node Problem Detector
- Kubernetes Node Conditions and Events
- Kubernetes RBAC and ServiceAccounts
- Prometheus metrics scraping
- kubectl cordon and drain
- Linux host log access, /dev/kmsg, journald, and nsenter

## Sources Consulted
- Kubernetes documentation: Monitor Node Health: https://kubernetes.io/docs/tasks/debug/debug-cluster/monitor-node-health/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes Node Problem Detector upstream README: https://github.com/kubernetes/node-problem-detector
- Node Problem Detector upstream deployment manifest: https://github.com/kubernetes/node-problem-detector/blob/master/deployment/node-problem-detector.yaml
- Node Problem Detector upstream RBAC manifest: https://github.com/kubernetes/node-problem-detector/blob/master/deployment/rbac.yaml
- Node Problem Detector system log monitor documentation: https://github.com/kubernetes/node-problem-detector/tree/master/pkg/systemlogmonitor
- Node Problem Detector custom plugin monitor documentation: https://github.com/kubernetes/node-problem-detector/tree/master/pkg/custompluginmonitor
- Node Problem Detector v0.8.15 release/config files: https://github.com/kubernetes/node-problem-detector/releases/tag/v0.8.15
- Node Problem Detector v0.8.25 release page checked for current version context: https://github.com/kubernetes/node-problem-detector/releases/tag/v0.8.25

## Issues Found
- The introductory claim said NPD can identify disk pressure directly. Kubernetes `DiskPressure` is a built-in kubelet node condition, while NPD commonly reports filesystem and kernel/runtime problems as Node Conditions or Events. Changed this wording to "filesystem errors."
- The basic DaemonSet passed `docker-monitor.json` to `--config.custom-plugin-monitor`, but the Docker and containerd log monitor JSON files use the SystemLogMonitor format. Changed the command to pass kernel, Docker, and containerd monitor configs through `--config.system-log-monitor`.
- The basic DaemonSet description mentioned only Docker daemon logs while the post also provided a containerd monitor. Updated the description to "container runtime logs."
- The remediation sidecar used `nsenter` but installed only `curl` and `jq` in Alpine. Added `util-linux`, which provides `nsenter`.
- The custom reporter sidecar used `kubectl` from a plain Alpine image but did not install it. Added `kubectl` to the `apk add` line.
- The custom reporter comment said it updated a node condition, but the command labels a node. Changed the comment to "Update node label."
- The Prometheus metrics DaemonSet configured `kernel-monitor.json`, whose `logPath` is `/dev/kmsg`, but did not mount `/dev/kmsg`. Added the `kmsg` volume and volume mount.

## Review Notes
The examples are valid YAML after the fixes. The post pins `registry.k8s.io/node-problem-detector/node-problem-detector:v0.8.15`, which is a valid published image, but it is older than the latest `v0.8.x` releases available as of 2026-06-04. A future refresh could update the examples to the current NPD release and align the sample config with newer upstream defaults such as the split `readonly-monitor.json`.
