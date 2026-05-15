# Validation Summary: How to Monitor HAProxy Statistics and Performance on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- HAProxy
- HAProxy statistics dashboard
- HAProxy Runtime API
- firewalld
- socat
- rsyslog
- Prometheus
- Grafana

## Sources Consulted
- HAProxy Configuration Manual, stats directives: https://cdn.haproxy.com/documentation/haproxy-configuration-manual/new/2-2r1/
- HAProxy Runtime API, `show stat`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-stat/
- HAProxy Runtime API reference commands: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/
- HAProxy Prometheus metrics endpoint: https://www.haproxy.com/blog/haproxy-exposes-a-prometheus-metrics-endpoint/
- Red Hat Load Balancer Administration, HAProxy logging to rsyslog: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html-single/load_balancer_administration/index

## Issues Found
- The CSV stats endpoint section configured a separate `frontend http_front` on port 80 but fetched CSV from the Step 1 stats listener on port 8404. I changed the section to show the existing `listen stats` endpoint and updated the `curl` URL to use the same credentials shown earlier.

## Review Notes
- The `show stat` CSV field positions used in the `awk` examples match the documented HAProxy CSV header, including `$18` for `status`, `$14` for connection errors, and `$15` for response errors.
- The built-in Prometheus exporter configuration is valid for HAProxy builds that include the Prometheus exporter. On RHEL, users should confirm their packaged HAProxy was built with that support if the `prometheus-exporter` service is unavailable.
- The rsyslog example follows Red Hat's documented `/dev/log` approach. If HAProxy is run inside a chroot, the syslog socket also needs to be available inside the chroot.
