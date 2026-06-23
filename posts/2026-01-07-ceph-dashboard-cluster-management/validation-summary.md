# Validation Summary: How to Set Up Ceph Dashboard for Cluster Management

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ceph Dashboard
- Ceph Manager modules
- Ceph CLI
- Ceph REST API
- Ceph RBD
- Ceph RGW
- Ceph iSCSI Gateway
- Prometheus
- Grafana
- HAProxy
- SSL/TLS certificates

## Sources Consulted
- Ceph Dashboard documentation: https://docs.ceph.com/en/latest/mgr/dashboard/
- Ceph Prometheus Manager module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph RESTful API documentation: https://docs.ceph.com/en/latest/mgr/ceph_api/
- Ceph MON command API documentation: https://docs.ceph.com/en/latest/api/mon_command_api/
- Ceph RBD mirroring documentation: https://docs.ceph.com/en/reef/rbd/rbd-mirroring/
- Ceph RBD man page: https://docs.ceph.com/en/pacific/man/8/rbd/
- Grafana dashboard import documentation: https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/import-dashboards/
- Grafana dashboard HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/

## Issues Found
- The dashboard network settings described `mgr/dashboard/server_port` as the SSL port and `mgr/dashboard/ssl_server_port` as the non-SSL port. Updated the comments and examples so `server_port` is used for HTTP and `ssl_server_port` is used for HTTPS.
- The RBAC example used `cluster` as a dashboard security scope, but current dashboard scopes include values such as `manager`, `pool`, `osd`, `monitor`, and `hosts`. Replaced `cluster read` with `manager read`.
- The password policy example claimed to configure expiration with `set-pwd-policy-expiration-days`, which is not documented in the current dashboard password policy commands. Replaced it with documented complexity policy settings.
- The Ceph REST API example used HTTP basic authentication directly against an API endpoint. Updated it to obtain a JWT from `/api/auth` and pass it with `Authorization: Bearer`.
- The RBD feature example enabled `journaling` without first enabling `exclusive-lock`, even though journaling depends on exclusive lock. Added the prerequisite feature and removed the questionable dynamic `deep-flatten` enable example.
- The Prometheus section described metrics as being exported by the dashboard. Clarified that metrics are exported by the Ceph Manager Prometheus module.
- The Grafana password command passed the password as a positional argument. Updated it to read the password from a temporary file with `-i`, matching the documented Ceph dashboard command form.
- The Grafana API import example posted a raw dashboard JSON file to `/api/dashboards/db`. Updated it to wrap the dashboard JSON in Grafana's dashboard API payload format.
- The RGW section used older/manual access-key and host/port commands as the primary flow. Updated it to use `ceph dashboard set-rgw-credentials` and current hostname mapping guidance.
- The iSCSI gateway examples passed gateway URLs directly to `iscsi-gateway-add`; current documentation requires reading the gateway URL from a file with `-i`. Updated the examples accordingly.
- The HAProxy example did not include the documented standby redirect mitigation and used a less accurate health-check path. Updated it to set standby dashboards to error mode and to use the documented SSL passthrough health check pattern.
- The audit logging examples used raw config keys instead of the documented dashboard CLI commands. Replaced them with `set-audit-api-enabled` and `set-audit-api-log-payload`.
- The CORS command used `set-cors-origin`, which is not the documented dashboard command. Replaced it with `set-cross-origin-url`.

## Review Notes
- The post is now technically valid against the official Ceph and Grafana documentation checked during review.
- Some Grafana integration details vary by Ceph release and deployment method, especially when cephadm manages the monitoring stack automatically.
