# Validation Summary: Monitor Calico etcd RBAC

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Calico
- Kubernetes
- etcd
- etcd RBAC
- Prometheus
- Grafana
- Loki / LogQL
- systemd

## Sources Consulted
- etcd configuration options: https://etcd.io/docs/v3.6/op-guide/configuration/
- etcd monitoring guide: https://etcd.io/docs/v3.6/op-guide/monitoring/
- etcd metrics reference: https://etcd.io/docs/v3.6/metrics/
- etcd authentication guide: https://etcd.io/docs/v3.6/op-guide/authentication/authentication/
- Calico etcd RBAC overview: https://docs.tigera.io/calico/latest/reference/etcd-rbac/overview
- Calico segmenting etcd on Kubernetes: https://docs.tigera.io/calico/latest/reference/etcd-rbac/kubernetes
- Calico component metrics guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Grafana Loki metric queries / LogQL reference: https://grafana.com/docs/loki/latest/query/metric_queries/

## Issues Found
- The post used `--audit-log-path`, `--audit-log-maxsize`, and `--audit-log-maxbackups` as etcd flags. Current etcd documentation does not list Kubernetes-style audit log flags for etcd. I changed the section to use documented etcd structured logging and rotation flags: `--log-format`, `--log-outputs`, `--enable-log-rotation`, and `--log-rotation-config-json`.
- The systemd drop-in replaced the entire `ExecStart` with an incomplete etcd command. That could break an existing member by dropping required cluster, data directory, TLS, and advertise/listen flags. I changed it to set documented `ETCD_*` environment variables instead.
- The permission-denied parsing command assumed an audit log JSON schema with a `.user` field and claimed to count events in the last hour while not filtering by time. I changed it to parse the configured etcd JSON log file and count matching `.msg` values.
- The diagram and conclusion referred to etcd audit logs. I changed these references to structured etcd logs because etcd does not provide the audit log configuration shown in the original post.
- The metrics section said etcd exposes metrics on port 2381 by default. Official etcd docs say metrics are exposed on the client port by default and optionally on URLs configured with `--listen-metrics-urls`. I changed the example to use port 2379 and clarified the optional metrics listener behavior.
- The Felix dashboard and alert used `felix_etcd_reconnects_total`, which is not listed in the current official Felix Prometheus metric reference. I changed the example to the documented `felix_resyncs_started` metric and updated the alert wording.

## Review Notes
- The Loki log-range alert syntax is consistent with Grafana Loki documentation.
- `felix_resyncs_started` is documented as not meaningful in a Typha deployment, so a future version of the post could add a Typha-specific dashboard path for clusters that use Typha.
- etcd metrics and Calico Felix metrics may require TLS, service discovery, or explicit metrics enablement depending on the deployment.
