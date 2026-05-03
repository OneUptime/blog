# Validation Summary: How to Configure Datadog Agent for IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Datadog Agent (datadog.yaml core config)
- Datadog Network Check (network.d/conf.yaml)
- Datadog HTTP Check (http_check.d/conf.yaml)
- Datadog Custom Checks (Python, datadog_checks.base.AgentCheck)
- Datadog Network Performance Monitoring (NPM, system-probe)
- Datadog Monitors API (v1)
- IPv6 networking (ping6, IPv6 literal URLs per RFC 3986)

## Sources Consulted
- Datadog HTTP Check docs: https://docs.datadoghq.com/integrations/http_check/
- Datadog HTTP Check sample conf: https://github.com/DataDog/integrations-core/blob/master/http_check/datadog_checks/http_check/data/conf.yaml.example
- Datadog Network Integration docs: https://docs.datadoghq.com/integrations/network/
- Datadog Network sample conf: https://github.com/DataDog/integrations-core/blob/master/network/datadog_checks/network/data/conf.yaml.default

## Issues Found
1. **HTTP check used a non-existent `ip_version` option.** The post claimed `ip_version: "ipv6"` would force the HTTP check to use IPv6. There is no such configuration option in the Datadog HTTP check. Fix: removed the `ip_version` lines from both HTTP check instances and updated the surrounding comments to explain that an IPv6-literal URL forces IPv6 by virtue of the URL itself, while a hostname-based URL relies on AAAA-record resolution and host IPv6 connectivity. Also updated the closing paragraph to remove the `ip_version: ipv6` reference.
2. **Used deprecated `ssl_verify` instead of `tls_verify`.** The current Datadog HTTP check parameter is `tls_verify` (boolean). Fix: replaced `ssl_verify: true` with `tls_verify: true`.

## Review Notes
- `system.net.tcp6.established`, `system.net.bytes_rcvd`, and `system.net.bytes_sent` are valid Datadog network integration metrics.
- `collect_connection_state`, `excluded_interfaces`, and `collect_rate_metrics` are all valid options in `network.d/conf.yaml`.
- `bind_host: "::"` is a valid datadog.yaml option to bind the agent IPC to all interfaces (including IPv6).
- The `network_config: enabled: true` block in `datadog.yaml` is the NPM toggle; on its own (without `system_probe_config: enabled: true`) it does not turn NPM on. The post's Step 1 includes only the `network_config` half — this is harmless (the rest of the agent works fine) and the full pair appears later in Step 5, so no change was made.
- `ping6` still ships on most Linux distributions, but on many modern systems (e.g., recent iputils releases) it is a thin wrapper around `ping -6` and may be dropped in the future. Authors revisiting this post could switch the custom check to `ping -6` for forward-compatibility.
- For HTTPS over an IPv6 literal URL, certificate hostname validation will fail unless `tls_validate_hostname: false` is set or a `Host` header is added — worth flagging if a reader tries to combine the two approaches.
- The Datadog Monitors API endpoint (`/api/v1/monitor`) and the `metric alert` payload shape are correct.
