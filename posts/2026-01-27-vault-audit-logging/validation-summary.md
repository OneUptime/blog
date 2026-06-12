# Validation Summary: How to Configure Vault Audit Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (audit devices: file, syslog, socket)
- Vault CLI (`vault audit` subcommands, `sys/audit-hash`)
- Vault Prometheus telemetry
- Fluentd (splunk_hec output plugin)
- Filebeat (Elasticsearch output, ILM)
- logrotate
- rsyslog / syslog-ng
- AWS S3 (CLI for log shipping)
- SOC 2, PCI-DSS, HIPAA compliance frameworks

## Sources Consulted
- Vault audit device documentation: https://developer.hashicorp.com/vault/docs/audit
- Vault audit log schema: https://developer.hashicorp.com/vault/docs/audit/schema
- Vault file audit device: https://developer.hashicorp.com/vault/docs/audit/file
- Vault syslog audit device: https://developer.hashicorp.com/vault/docs/audit/syslog
- Vault socket audit device: https://developer.hashicorp.com/vault/docs/audit/socket
- Vault telemetry / audit metrics: https://developer.hashicorp.com/vault/docs/internals/telemetry/metrics/audit
- Vault `sys/audit-hash` API: https://developer.hashicorp.com/vault/api-docs/system/audit-hash
- HashiCorp KB on SIGHUP / file reopen: https://support.hashicorp.com/hc/en-us/articles/6146703590547
- AICPA SOC 2 Trust Services Criteria (CC6.x, CC7.x)
- PCI-DSS v3.2.1 Requirement 10 reference
- GNU Bash manual on line continuation and comments

## Issues Found

1. **Broken bash line continuation with inline comments.** Two `bash` code blocks (file device options and syslog options) used the pattern `arg=value \    # comment`. Bash escapes the space after `\` rather than the newline, so the `#` starts a comment that breaks the continuation — the command would not actually run as written. **Fixed:** moved the inline comments to a comment header block above the command, leaving only `\` at the end of each continued line.

2. **Audit log JSON example mislabeled.** The example showed `"type": "request"` but included a `response` block. Per the official Vault audit schema, the response object is omitted from request entries — entries that contain a response block are `"type": "response"`. **Fixed:** changed `"type": "request"` to `"type": "response"`.

3. **SOC 2 CC6.8 mislabeled.** The diagram labeled CC6.8 as "Prevent Unauthorized Access." CC6.8 is actually about preventing/detecting unauthorized or malicious software (anti-malware controls). **Fixed:** replaced with CC7.4 (Responds to Identified Security Incidents), which more accurately fits the diagram's mapping to authentication logging and retention policies for forensic incident response.

4. **Incorrect Prometheus metric names for Vault audit.** The Prometheus alerting rules referenced `vault_audit_log_request_duration_seconds` (does not exist — Vault's metric is named `vault_audit_log_request` with units in **milliseconds**, not seconds) and used `increase(vault_audit_log_request[5m])` to detect inactivity (this is a summary, so the activity counter is `vault_audit_log_request_count`). **Fixed:** switched the inactivity expression to `vault_audit_log_request_count` and the latency expression to `vault_audit_log_request{quantile="0.99"} > 500` with a `ms` description.

## Review Notes

- Filebeat input `type: log` is deprecated in Filebeat 8+ in favor of `type: filestream`, but `log` still functions. Left as-is since both are valid and the post does not pin a specific Filebeat version.
- The `sys/audit-hash/file` endpoint is documented but has had its status revisited across Vault versions; the snippet remains correct for current LTS releases.
- The Vault Prometheus exporter (go-metrics sink) does not append `_total` to counter names by default, which differs from native Prometheus client libraries. The alert expressions reflect this Vault-specific convention.
- All CLI flags, audit device options (`file_path`, `log_raw`, `hmac_accessor`, `mode`, `format`, `tag`, `facility`, `address`, `socket_type`), `-path=` custom mount, and `vault audit list -detailed` are correct against current Vault documentation.
- `pkill -HUP vault` for reopening audit log files after logrotate is the documented mechanism; caveat about systemd `ExecReload` resolving to a wrapper PID is a niche concern not worth surfacing in the post.
- PCI-DSS requirement numbers in the table use v3.2.1 numbering; v4.0 has reorganized these into a 10.2.1.x structure. Not an error, just a version-specific observation.
