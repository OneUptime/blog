# Validation Summary: How to Build Kubernetes Node Problem Detector

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Node Problem Detector
- Helm
- Kubernetes DaemonSets, ConfigMaps, RBAC, Events, and Node Conditions
- NPD system log monitor, custom plugin monitor, health checker, and system stats monitor
- Prometheus, Prometheus Operator rules, and Grafana dashboards
- Draino and Kubernetes node remediation
- Go client-go remediation controller example
- Bash custom health check scripts

## Sources Consulted
- Kubernetes documentation: Monitor Node Health - https://kubernetes.io/docs/tasks/debug/debug-cluster/monitor-node-health/
- Kubernetes Node Problem Detector README - https://github.com/kubernetes/node-problem-detector
- NPD custom plugin monitor example - https://github.com/kubernetes/node-problem-detector/blob/master/config/custom-plugin-monitor.json
- NPD health checker configs - https://github.com/kubernetes/node-problem-detector/tree/master/config
- NPD system stats monitor config - https://github.com/kubernetes/node-problem-detector/blob/master/config/system-stats-monitor.json
- NPD Kubernetes exporter/problem client source - https://github.com/kubernetes/node-problem-detector/tree/master/pkg/exporters/k8sexporter
- Kubernetes core/v1 Event API reference - https://kubernetes.io/docs/reference/kubernetes-api/core/event-v1/
- Kubernetes safe node drain documentation - https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/
- Draino project documentation - https://github.com/planetlabs/draino

## Issues Found
- The Helm install example used the old Delivery Hero chart repository syntax. Updated it to the current upstream OCI install command from the NPD README.
- The manual DaemonSet referenced `health-checker-kubelet.json` and `system-stats-monitor.json`, but the preceding ConfigMap did not define them. Added matching ConfigMap entries.
- Health checker examples used a non-existent `healthchecker` plugin value. Updated them to use the NPD custom plugin configuration pattern used by upstream `health-checker-*.json` files.
- System stats monitor examples described threshold-based problem reporting and included plugin/source fields that do not match upstream config examples. Updated the text and examples to describe metrics collection and use current metric names.
- Disk examples claimed to measure latency while actually measuring throughput or IOPS. Renamed the checks, condition names, messages, and paths so the examples accurately describe throughput/IOPS checks.
- Event filtering examples used `source=node-problem-detector`, which is not a reliable Kubernetes field selector for NPD events. Replaced them with valid node event selectors.
- Shell examples used literal `<node-name>` placeholders inside executable bash blocks. Replaced them with a `NODE_NAME` variable and marked sample output as `text`.
- The Go remediation controller used `policyv1.Eviction` without importing `k8s.io/api/policy/v1`, and ignored eviction errors. Added the missing import and basic error handling.

## Review Notes
- `kubectl`, `helm`, and `go` were not installed in the review environment, so native CLI and Go compilation checks could not be run locally.
- Fenced JSON and YAML snippets were parsed successfully after edits, and bash snippets passed `bash -n`.
- Draino is still technically aligned with its project documentation, but the project appears relatively old; future revisions could mention evaluating maintained remediation alternatives for production clusters.
