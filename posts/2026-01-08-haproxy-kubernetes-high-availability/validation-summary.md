# Validation Summary: How to Configure HAProxy for High Availability in Front of Kubernetes

## Status
validated

## Post Type
Tutorial / Guide (step-by-step infrastructure setup)

## Technologies Covered
- HAProxy (load balancing, TLS termination, health checks, stick-tables/rate limiting, runtime API)
- Keepalived / VRRP (Virtual IP failover)
- Kubernetes (NodePort and headless Services, Deployments, readiness/liveness probes)
- Let's Encrypt / Certbot (TLS certificate issuance and renewal)
- Prometheus exporter, rsyslog, logrotate (observability)
- Consul (dynamic server discovery via `server-template`)
- `hey` load-testing tool

## Sources Consulted
- HAProxy configuration tutorials — Health checks: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/
- HAProxy issue #1344 — "'option httpchk': hiding headers or body at the end of the version string is deprecated": https://github.com/haproxy/haproxy/issues/1344
- HAProxy issue #1711 — httpchk over HTTP/2 with `proto h2` (gRPC health checks): https://github.com/haproxy/haproxy/issues/1711
- Claudio Kuenzler — "HAProxy option httpchk headers/body at end of version string unsupported": https://www.claudiokuenzler.com/blog/1498/haproxy-option-httpchk-headers-body-end-version-string-unsupported
- gRPC Health Checking Protocol: https://grpc.io/docs/guides/health-checking/
- keepalived issue #2184 — `script_user` / `enable_script_security` behavior: https://github.com/acassen/keepalived/issues/2184

## Issues Found
1. **Deprecated `option httpchk` syntax with embedded headers (4 backends).** The main configuration used the legacy form `option httpchk GET <uri> HTTP/1.1\r\nHost:\ <host>` in the `kubernetes_default`, `app1_backend`, `app2_backend`, and `api_backend` backends. Appending headers after the HTTP version string in `option httpchk` is deprecated in HAProxy 2.2+ and emits a startup warning ("hiding headers or body at the end of the version string is deprecated"). This is also inconsistent with the post's own "Health Checks Configuration" section, which already demonstrates the modern `http-check send` directive. I converted each to the current, non-deprecated form, e.g.:

   ```
   option httpchk
   http-check send meth GET uri /healthz hdr Host kubernetes.default.svc
   http-check expect status 200
   ```

   Functionality and intent are unchanged; the warning is eliminated.

## Review Notes
- The gRPC backend health check (`option httpchk` + `http-check connect ssl alpn h2` + `http-check send meth GET uri /grpc.health.v1.Health/Check`) matches HAProxy's documented HTTP/2 gRPC health-check pattern and is correct. Note that `grpc_backend` runs in `mode tcp` with the front-end terminating TLS, so live traffic to the backends is cleartext while the health check connects with `ssl`; this works but is a slight inconsistency a reader may want to align (drop `ssl` from `http-check connect`, or add `ssl` to the `server` lines) depending on whether the pods expose TLS.
- HTTP-level health checks (`option httpchk` / `http-check`) are valid in `mode tcp` backends — confirmed against HAProxy docs — so the gRPC and any TCP-mode HTTP checks are legitimate.
- `option smtpchk EHLO haproxy.local`, `option mysql-check user haproxy`, and `option pgsql-check user haproxy` are all valid current syntax.
- Keepalived configuration is correct: `killall -0 haproxy` is a valid liveness probe, `enable_script_security` + `script_user root` are required for scripts to run, and the priority/weight math (MASTER 101 + 2, BACKUP 100 + 2) produces correct failover when HAProxy dies on the master.
- `net.ipv4.ip_nonlocal_bind=1` is correctly included so HAProxy can bind to the floating VIP. `net.ipv4.ip_forward=1` is not strictly required for an L4/L7 proxy (only relevant for routing), but it is harmless.
- The `X-XSS-Protection` response header is deprecated by modern browsers (no longer recommended by OWASP), though it is not incorrect to set it. Consider relying on `Content-Security-Policy` instead in a future revision.
- Ubuntu 22.04 ships HAProxy 2.4, which supports all directives used (including `http-request use-service prometheus-exporter`, `server-template`, and the modern `http-check` syntax applied above).
- `ssl-default-bind-ciphersuites` correctly configures only the TLS 1.3 cipher suites; TLS 1.2 cipher selection falls back to defaults, which is acceptable.
