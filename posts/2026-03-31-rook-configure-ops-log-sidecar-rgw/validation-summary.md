# Validation Summary: How to Configure Ops Log Sidecar for RGW in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph Operator for Kubernetes)
- Ceph RADOS Gateway (RGW)
- CephObjectStore CRD
- Kubernetes sidecar containers
- socat (Unix socket forwarding)
- Promtail (Grafana Loki log collector)

## Sources Consulted
- Rook CephObjectStore CRD source code and documentation: https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Rook CephObjectStore CRD docs: https://www.rook.io/docs/rook/latest-release/CRDs/Object-Storage/ceph-object-store-crd/
- Ceph RGW configuration options (rgw.yaml.in): https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in
- Ceph RGW ops log source code (rgw_log.cc): https://github.com/ceph/ceph/blob/main/src/rgw/rgw_log.cc
- Ceph Object Gateway Config Reference: https://docs.ceph.com/en/latest/radosgw/config-ref/
- Clyso RGW ops log documentation (real output examples): https://docs.clyso.com/docs/kb/object/s3-operations-logging/
- Grafana Loki Promtail configuration docs: https://github.com/grafana/loki/blob/v1.4.0/docs/clients/promtail/configuration.md

## Issues Found

1. **`rgwCommandFlags` changed to `rgwConfig`**: The post used `rgwCommandFlags` for persistent RGW configuration options like `rgw_enable_ops_log` and `rgw_ops_log_socket_path`. While `rgwCommandFlags` is a valid CRD field, it causes RGW pod restarts on changes. The `rgwConfig` field applies settings at runtime without restart and is the correct choice for these persistent configuration options. Changed in the YAML example and summary text.

2. **Promtail config used camelCase instead of snake_case**: The Promtail configuration snippet used `scrapeConfigs`, `jobName`, `pipelineStages`, and `staticConfigs` (camelCase). Promtail's native YAML configuration requires snake_case: `scrape_configs`, `job_name`, `pipeline_stages`, `static_configs`. The camelCase format is used by the Promtail Helm chart values, not the Promtail config itself. Fixed all four field names.

3. **RGW ops log JSON field `"key"` changed to `"object"`**: The example ops log entry used `"key"` as the field name for the object path. The actual RGW ops log serializes this as `"object"`. Fixed.

4. **RGW ops log JSON field `"request_uri"` changed to `"uri"`**: The example used `"request_uri"` but the actual field name in RGW ops log output is `"uri"`. Fixed.

5. **RGW ops log `"http_status"` type corrected**: The example showed `"http_status": 200` (integer). In actual RGW ops log output, `http_status` is serialized as a string, e.g., `"http_status": "200"`. Fixed.

6. **Operation value format corrected**: The example used `"REST.GET.OBJECT"` which is the AWS S3 server access log format. RGW ops log uses internal operation names like `"get_obj"`, `"put_obj"`, `"delete_obj"`. Changed to `"get_obj"`.

7. **Time format precision**: Changed `"2026-03-31T10:00:00.000Z"` to `"2026-03-31T10:00:00.000000Z"` to match actual RGW microsecond precision.

## Review Notes
- The CephObjectStore CRD has a built-in `spec.gateway.opsLogSidecar` field that enables a managed ops log sidecar container without manual socat configuration. The post mentions this field but primarily demonstrates the manual approach. The built-in sidecar is simpler for most use cases.
- The manual socat sidecar approach requires careful startup ordering — the socat listener must create the Unix socket before RGW attempts to connect to it. In practice this usually works due to socat's fast startup, but a production setup may want an init container or retry logic.
- Real RGW ops log entries include additional fields not shown in the example (e.g., `trans_id`, `user_agent`, `referrer`, `authentication_type`, `access_key_id`, `bytes_received`, `object_size`, `error_code`). The blog's simplified example is acceptable for illustration purposes.
- The `rgw_ops_log_data_backlog` option is confirmed real (default 5MB) and correctly used in the post.
