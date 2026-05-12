# Validation Summary: How to Test Calico GlobalNetworkPolicy with Real Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (projectcalico.org/v3 API, GlobalNetworkPolicy resource)
- Kubernetes network policy
- calicoctl CLI
- Felix (Calico dataplane agent) and its Prometheus metrics
- Mermaid diagrams

## Sources Consulted
- GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Cloud policy metrics (calico_denied_packets / calico_denied_bytes): https://docs.tigera.io/calico-cloud/operations/monitor/metrics/policy-metrics
- Felix configuration reference (LogFilePath, PrometheusMetricsPort, PrometheusReporterEnabled): https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
1. **Non-existent metric prefix `felix_denied`** — The Verification section used `curl -s http://localhost:9091/metrics | grep felix_denied`. There is no Felix Prometheus metric prefixed with `felix_denied` in either OSS or Enterprise Calico. The actual metric names emitted by Felix's policy/flow-log Prometheus reporter for denied traffic are `calico_denied_packets` and `calico_denied_bytes`. Updated the grep pattern to `calico_denied` so the command can return real data when the reporter is enabled.

## Review Notes
- The GlobalNetworkPolicy YAML is valid per the v3 schema: `selector: all()`, EntityRule `source.selector` / `destination.selector` with `app == 'authorized'` syntax, numeric `order`, and `types: [Ingress, Egress]` are all correct.
- `calicoctl apply -f` and `calicoctl get globalnetworkpolicies -o wide` are valid. The resource also accepts the alias `gnp`.
- Port `9091` is the default Felix Prometheus metrics port (configurable via `prometheusMetricsPort` in FelixConfiguration). Note that the `calico_denied_*` metrics require `prometheusReporterEnabled: true` in FelixConfiguration; without that, the grep will still return nothing. The post does not mention this prerequisite, but the command itself is now syntactically targeting a real metric name.
- `/var/log/calico/felix.log` is the documented default for `LogFilePath`. In Kubernetes calico-node DaemonSet deployments, Felix typically logs to stdout (visible via `kubectl logs`), so this command assumes a systemd/host-installed Felix. Not flagged as an error since both deployment modes are valid.
- Mermaid `\n` line break in the node label (`B{GlobalNetworkPolicy\nPolicy}`) renders correctly in most modern Mermaid versions; `<br/>` is more universally portable but `\n` is accepted.
- Calico v3.26 (May 2023) is an older minimum version; current Calico is significantly newer, but stating a minimum is reasonable.
