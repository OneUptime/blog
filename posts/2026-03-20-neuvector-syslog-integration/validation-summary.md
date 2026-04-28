# Validation Summary: How to Set Up NeuVector Syslog Integration

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NeuVector (container security platform)
- Syslog (UDP, TCP, TCP+TLS)
- NeuVector REST API (`/v1/system/config`)
- Splunk (TCP/syslog input)
- Elastic Stack (Logstash, Elasticsearch)
- curl, tcpdump

## Sources Consulted
- NeuVector OpenAPI spec: https://github.com/neuvector/neuvector/blob/main/controller/api/apis.yaml (RESTSystemConfigSyslogCfgV2 / RESTSystemConfigSyslogV2 schemas)
- NeuVector controller config handler: https://github.com/neuvector/neuvector/blob/main/controller/rest/system.go (syslog category/protocol validation)
- NeuVector API constants: https://github.com/neuvector/neuvector/blob/main/controller/api/apis.go (`SyslogProtocolTCPTLS = 66`, LogLevel/Category constants)
- NeuVector Reporting & Notifications docs: https://open-docs.neuvector.com/5.2/reporting/reporting/
- NeuVector REST API & Automation docs: https://open-docs.neuvector.com/automation/automation/
- NeuVector Splunk integration docs: https://open-docs.neuvector.com/integration/splunk/

## Issues Found
1. **`syslog_ip_proto` had wrong type.** All three Step 1 examples and the Step 4 Splunk example passed string values (`"udp"`, `"tcp"`) for `syslog_ip_proto`. Per `RESTSystemConfigSyslogCfgV2` in `apis.yaml` and `apis.go`, this field is `uint8` (an IP protocol number). The controller code in `controller/rest/system.go` validates against `syscall.IPPROTO_UDP` (17), `syscall.IPPROTO_TCP` (6), and `api.SyslogProtocolTCPTLS` (66). Sending a string would fail JSON deserialization. Replaced `"udp"` with `17`, `"tcp"` with `6`, and added a one-line note documenting the values. The TLS example now uses `66`.
2. **`syslog_tls_verify` is not a real field.** The TLS example used `"syslog_tls_verify": true`, which does not exist in the NeuVector API schema. TLS is configured via `syslog_ip_proto: 66` plus `syslog_server_cert` (PEM-encoded server cert for verification). Replaced `syslog_tls_verify` with a `syslog_server_cert` example.
3. **Invalid syslog categories listed.** Step 3 included `incident` and `violation` in the example payload and "Available categories" list. The controller validation at `controller/rest/system.go` only accepts `api.CategoryEvent` ("event"), `api.CategoryRuntime` ("security-event"), and `api.CategoryAudit` ("audit") for syslog — submitting any other category returns HTTP 400 "Invalid syslog Category". (The `threat`, `violation`, and `incident` constants exist as event sub-types but are bundled under `security-event` for syslog.) Removed the two invalid entries and clarified that `security-event` covers threats/violations/incidents.
4. **Incorrect format claim in introduction.** The introduction stated NeuVector forwards events "in CEF (Common Event Format) or standard syslog format". NeuVector does not emit CEF — the only output toggles are `syslog_in_json` (JSON or RFC-style plain text). Reworded to "JSON or plain-text syslog format".
5. **Misleading Splunk HEC reference.** Step 4 told the reader to create a Splunk HEC (HTTP Event Collector) token, but HEC is HTTP-based and NeuVector's syslog forwarder only speaks UDP/TCP syslog — the rest of the example (and the post's whole premise) uses a TCP syslog input on port 1514. Replaced the HEC instructions with a Splunk TCP input setup that matches what the curl actually does.

## Review Notes
- The `single_cve_per_syslog` field in Step 1 is correct (boolean, present in `RESTSystemConfigSyslogCfgV2`). A related field `syslog_cve_in_layers` also exists but is not required.
- `syslog_level` accepted values (Title-cased) per `api.LogLevel*` constants: `Emergency`, `Alert`, `Critical`, `Error`, `Warning`, `Notice`, `Info`, `Debug`. The post uses `Warning` and `Info`, both valid. The Step 7 table omits `Debug`, `Alert`, and `Emergency`, but that's a stylistic simplification rather than an error.
- The Splunk SPL search references `level="High"`, which is not a NeuVector level — but this is illustrative SPL and depends on the user's field extraction, so left as-is.
- The Logstash config in Step 5 is syntactically valid. Note that the Logstash `syslog` input listens on UDP and TCP by default; if NeuVector is sending JSON-in-syslog, the `json { source => "message" }` filter will work for RFC3164-framed payloads but may need adjustment for RFC5424 framing in some setups. Not a correctness issue, just a deployment consideration.
- The post does not pin NeuVector versions; the API shape verified here is current on `main` and matches NeuVector 5.x. Older 4.x releases used the same field names and types.
