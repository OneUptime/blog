# Validation Summary: How to Monitor Ceph from OpenStack Horizon Dashboard

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Ceph (Dashboard manager module, REST API, Prometheus module)
- OpenStack Horizon (custom panels, local_settings.py)
- Grafana (iframe embedding with d-solo URLs)
- Prometheus (Ceph exporter on port 9283)

## Sources Consulted
- Ceph Dashboard documentation: https://docs.ceph.com/en/latest/mgr/dashboard/
- Ceph `ac-user-create` CLI reference: https://docs.ceph.com/en/latest/mgr/dashboard/#creating-users
- Ceph Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- OpenStack Horizon customization documentation: https://docs.openstack.org/horizon/latest/configuration/customizing.html
- Grafana embedding documentation: https://grafana.com/docs/grafana/latest/dashboards/share-dashboards-panels/#embed-a-panel

## Issues Found
- **Incorrect argument order in `ac-user-create` command**: The original command was `ceph dashboard ac-user-create admin administrator -i -`, which places the role name (`administrator`) before the `-i -` flag. The `-i <file>` option must come immediately after the username, before the role positional argument. Fixed to: `ceph dashboard ac-user-create admin -i - administrator`.

## Review Notes
- The `EXTERNAL_MONITORING_LINKS` setting shown in Step 2 is not a built-in Horizon configuration option. The post implies this is used by a custom panel, which is a reasonable approach, but readers should understand they would need to write corresponding custom panel code to consume this setting. The post's framing ("Add a link panel") makes this sufficiently clear.
- The `frameborder="0"` attribute on the iframe in Step 4 is deprecated in HTML5 in favor of CSS `border: none;`, but it still works in all major browsers and is not a functional error.
- All Ceph Dashboard REST API endpoints referenced (`/api/auth`, `/api/health/full`, `/api/pool`) are correct and current.
- The Prometheus exporter default port (9283) and the `ceph_health_status` metric name are both correct.
- The Grafana `/d-solo/` URL pattern for embedding individual panels is correct.
