# Validation Summary: How to Configure HAProxy Health Checks for IPv4 Backend Servers

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- HAProxy health checks
- HAProxy Runtime API / admin socket
- `socat`
- MySQL protocol health checks
- PostgreSQL protocol health checks

## Sources Consulted
- HAProxy Configuration Manual 3.3 — `option httpchk`: https://docs.haproxy.org/3.3/configuration.html#4.2-option%20httpchk
- HAProxy Configuration Manual 3.3 — `http-check send`: https://docs.haproxy.org/3.3/configuration.html#4.2-http-check%20send
- HAProxy Configuration Manual 3.3 — `timeout check`: https://docs.haproxy.org/3.3/configuration.html#4.2-timeout%20check
- HAProxy Configuration Manual 3.3 — `inter`, `fastinter`, `downinter`: https://docs.haproxy.org/3.3/configuration.html#5.2-inter
- HAProxy Configuration Manual 3.3 — `agent-check`: https://docs.haproxy.org/3.3/configuration.html#5.2-agent-check
- HAProxy Configuration Manual 3.3 — `option mysql-check`: https://docs.haproxy.org/3.3/configuration.html#4.2-option%20mysql-check
- HAProxy Configuration Manual 3.3 — `option pgsql-check user`: https://docs.haproxy.org/3.3/configuration.html#4.2-option%20pgsql-check%20user
- HAProxy Management Guide 3.3 — `show servers state`: https://docs.haproxy.org/3.3/management.html#9.3-show%20servers%20state

## Issues Found
1. **Deprecated HTTP-check header syntax**: The post used `option httpchk GET /health HTTP/1.1\r\nHost:\ api.internal` to inject a `Host` header. Current HAProxy docs state that adding headers after the version string on `option httpchk` is deprecated, and `HTTP/1.1` requires a `Host` header. Changed this to `option httpchk GET /health HTTP/1.1` plus `http-check send hdr Host api.internal`.

2. **`timeout check` explanation was too broad**: The comment described `timeout check` as the maximum time to wait for a health-check response. HAProxy documents it more specifically as an additional check timeout after the connection has already been established. Updated the inline comment to match that behavior.

3. **`downinter` description was inaccurate for the example shown**: The post said `downinter 2000` meant less frequent polling of down servers, but the example uses `inter 5000`, so `downinter 2000` is actually more frequent than the normal interval. Updated the explanation to the doc-accurate behavior: it is the interval used when the server is fully DOWN.

4. **`show servers state` output codes were misinterpreted**: The post claimed raw values like `6` meant DRAIN. HAProxy documents `show servers state` as structured output with fields including `srv_op_state` and `srv_admin_state`, where `srv_admin_state` is a bitmask and DRAIN is represented by an administrative flag such as `0x08`, not the standalone value `6`. Updated the command example to match HAProxy's documented `socat` usage style and corrected the output explanation to reference the proper fields and meanings.

5. **Database health-check snippets were missing explicit TCP mode**: `option mysql-check` and `option pgsql-check user` are documented for TCP context. Added `mode tcp` to both backend examples so the snippets are valid and self-contained when copied into configurations that may otherwise inherit HTTP mode.

## Review Notes
- The remaining examples are consistent with current HAProxy documentation, including `check`, `port`, `rise`, `fall`, `agent-check`, and protocol-aware MySQL/PostgreSQL checks.
- `option httpchk GET /health` without an explicit `http-check expect` remains valid; by default HAProxy treats 2xx and 3xx responses as successful HTTP health checks.
- Local syntax validation with `haproxy -c` was not possible in this workspace because the `haproxy` binary is not installed, so validation was performed against official HAProxy documentation.
