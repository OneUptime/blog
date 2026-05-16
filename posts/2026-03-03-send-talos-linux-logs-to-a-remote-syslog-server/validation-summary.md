# Validation Summary: How to Send Talos Linux Logs to a Remote Syslog Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine logging configuration, `talosctl patch machineconfig`)
- Syslog (RFC 3164, RFC 5424, RFC 5425 TLS syslog)
- rsyslog (imudp, imtcp, mmjsonparse, templates, omfile)
- syslog-ng (network sources, json-parser, file destinations)
- Vector (socket source, remap/VRL transforms, socket sink)
- Bash scripting and logrotate
- Compliance frameworks (PCI-DSS, HIPAA, SOC 2)

## Sources Consulted
- Talos Linux logging guide and `LoggingConfig` / `LoggingDestination` schema in the v1.9 configuration reference: https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/
- Talos Linux v1.5 / v1.9 logging guides: https://www.talos.dev/v1.5/talos-guides/configuration/logging/
- Vector VRL expressions reference for path/field syntax: https://vector.dev/docs/reference/vrl/expressions/
- Vector remap transform docs: https://vector.dev/docs/reference/configuration/transforms/remap/
- rsyslog documentation for imudp/imtcp/mmjsonparse and TLS syslog: https://docs.rsyslog.com/doc/tutorials/tls.html
- RFC 5425 (TLS Transport Mapping for Syslog — port 6514)

## Issues Found

1. **Vector VRL syntax for hyphenated field names was invalid.**
   - The `to_syslog` remap transform referenced `.talos-level` and `.talos-service`. In VRL, the hyphen is parsed as the subtraction operator, so paths containing a hyphen must be quoted.
   - **Fix:** Changed `.talos-level` → `."talos-level"` and `.talos-service` → `."talos-service"` in the `transforms.to_syslog` source block.

2. **The "Encrypted Transport" section was misleading.**
   - The original text implied that switching the endpoint to `tcp://...:6514/` was sufficient to obtain TLS-encrypted syslog. Talos's `LoggingDestination.endpoint` only supports the `tcp` and `udp` URL schemes per the official schema — it does not perform TLS handshakes itself, so changing the port alone leaves the traffic unencrypted.
   - **Fix:** Rewrote the section to explain that Talos cannot terminate TLS directly and to recommend a local TLS-terminating relay (stunnel, Vector, or rsyslog) that accepts Talos's plain TCP stream and forwards to the syslog server over TLS on the conventional port 6514 (RFC 5425). Updated the YAML example accordingly.

## Review Notes
- The Talos `machine.logging.destinations` schema, the rsyslog `imudp`/`imtcp`/`mmjsonparse` configuration, the syslog-ng `network()` source and `json-parser(prefix(...))` syntax, the `talosctl patch machineconfig` JSON-patch invocation, the logrotate snippet, and the `ss`/`stat`/`tail` commands all match the current upstream documentation.
- The Vector socket sink with `encoding.codec = "text"` will emit only the `.message` field — the `.facility`, `.severity`, and `.appname` fields set in the remap will not appear in the wire payload. This is conceptually OK for a "bridge" illustration but readers who need real RFC 3164/5424 framing should construct the wire format in `.message` themselves or route through rsyslog/syslog-ng instead.
- Trailing slashes on logging endpoint URLs (e.g. `tcp://host:5514/`) are tolerated by Talos but are not present in the upstream examples; consider dropping them in a future revision for consistency with the official docs.
- The post does not pin a Talos version. The configuration shown is valid across the recent v1.x line (verified against v1.7 / v1.9 / v1.10 references).
