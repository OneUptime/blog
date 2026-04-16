# Validation Summary: How to Set Up ClickHouse Health Checks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (HTTP health endpoints, system.replicas)
- Kubernetes (liveness and readiness probes)
- HAProxy (httpchk health checks)
- Nginx (nginx_upstream_check_module)
- Bash / curl

## Sources Consulted
- ClickHouse HTTP Interface docs: https://clickhouse.com/docs/interfaces/http
- ClickHouse `/ping` and `/replicas_status` endpoint documentation
- ClickHouse `system.replicas` system table reference: https://clickhouse.com/docs/operations/system-tables/replicas
- Kubernetes liveness/readiness probe docs: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- HAProxy `option httpchk` documentation (v2.x)
- nginx_upstream_check_module (yaoweibin) documentation

## Issues Found
No technical issues found.

- The `/ping` endpoint correctly returns HTTP 200 with body `Ok.` when the server is alive.
- The `/replicas_status` endpoint correctly returns 200 when all replicated tables are caught up, and a non-200 response with lag information otherwise.
- The default ClickHouse HTTP port (8123) is accurate.
- The Kubernetes probe YAML is syntactically valid and follows standard probe conventions.
- The HAProxy `option httpchk GET /ping HTTP/1.1\r\nHost:\ clickhouse` uses the legacy but still-supported inline header syntax; valid for HAProxy 2.x.
- The Nginx example uses the third-party `nginx_upstream_check_module` syntax, which is correct.
- All `system.replicas` columns referenced (`database`, `table`, `is_leader`, `inserts_in_queue`, `merges_in_queue`, `queue_oldest_time`, `log_max_index`, `log_pointer`, `is_session_expired`) exist in the ClickHouse schema.
- The bash health check script uses correct `curl` flags (`-s -o /dev/null -w "%{http_code}"`).

## Review Notes
- The HAProxy snippet uses the older `option httpchk ... \r\n...` inline header format. In HAProxy 2.2+, the recommended modern syntax is `http-check send meth GET uri /ping ver HTTP/1.1 hdr Host clickhouse`. The legacy form still works and is not incorrect.
- The `is_leader` column in `system.replicas` is largely vestigial in modern ClickHouse (since multi-leader replication was introduced) but remains present and queryable for backward compatibility.
- Using `/replicas_status` as a readiness probe is a reasonable choice, but operators should be aware that a replica temporarily falling behind will be taken out of the load balancer rotation, which is generally the desired behavior.
