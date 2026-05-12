# Validation Summary: How to Set Up Calico Component Log Collection Step by Step

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Calico (open source) - calico-node / Felix, calico-typha, calico-kube-controllers
- Tigera Operator installation method
- Kubernetes (kubectl, DaemonSets, Deployments, ConfigMaps)
- FelixConfiguration CRD (projectcalico.org/v3)
- GlobalNetworkPolicy CRD (projectcalico.org/v3)
- Fluent Bit (kubernetes filter, grep filter, Merge_Log)
- Log aggregation backends (Elasticsearch, Loki, CloudWatch, Kibana, Grafana)

## Sources Consulted
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Configuring Felix: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Component logs troubleshooting: https://docs.tigera.io/calico/latest/operations/troubleshoot/component-logs
- Tigera Operator Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- GitHub issue projectcalico/calico#3534 (JSON logging feature request, closed not-planned)
- projectcalico/calico source: felix/config/config_params.go
- Fluent Bit kubernetes filter and grep filter documentation

## Issues Found
1. **Missing log level `Trace`.** Step 1 listed the valid `logSeverityScreen` values as `Debug, Info, Warning, Error, Fatal`. Felix actually accepts `Trace` as the most verbose level (in addition to the others). Updated the inline comment to include `Trace`.

2. **Step 2 header claimed "Enable JSON Logging for Calico Components".** Felix does not emit JSON-formatted logs natively - it uses a logrus text formatter, and the configurable-JSON request (projectcalico/calico#3534) was closed as not-planned. The YAML in the section did not enable JSON either; it only set `logFilePath: none`. Renamed the step to "Route Calico Logs to Stdout Only", added an explanatory sentence clarifying that JSON/structured ingestion happens at the log shipper layer (Step 4), and updated the inline comment in the YAML.

3. **Step 5 incorrectly claimed `kubectl describe node` triggers a Felix reconcile.** `kubectl describe node` is a read-only API server call (GET on Node + Events) and does not mutate cluster state or trigger Felix reconciliation - any log lines observed would be Felix's normal periodic reconcile coincidentally occurring at the same time. Replaced the example with applying and deleting a `GlobalNetworkPolicy`, which does cause Felix to log as it programs and unprograms dataplane rules.

## Review Notes
- `logFilePath: none` is valid and correctly disables file logging (default would otherwise be `/var/log/calico/felix.log`).
- The `calico-system` namespace and `k8s-app=calico-node|calico-typha|calico-kube-controllers` label selectors are correct for Tigera Operator installations. (Manifest-based installs would use `kube-system`, which is out of scope per the Prerequisites.)
- Use of `-c calico-node` is fine; the calico-node pod has init containers (`upgrade-ipam`, `install-cni`, optionally `mount-bpffs`) plus the main `calico-node` runtime container, so being explicit is good practice.
- The Fluent Bit filter configuration syntax (kubernetes filter with `Merge_Log On`, `Labels Off`, `Annotations Off`, and a `grep` filter with `Regex <key> <pattern>`) is valid.
- The Introduction sentence still mentions "enabling JSON log formatting for log aggregators" - this is ambiguous but defensible since JSON formatting is performed by the log aggregator, not by Calico itself. Left unchanged to preserve author's framing.
- Future caveat: if/when Calico ever ships native JSON logging, Step 2 could be expanded to enable it at the source rather than relying on the shipper to parse text.
