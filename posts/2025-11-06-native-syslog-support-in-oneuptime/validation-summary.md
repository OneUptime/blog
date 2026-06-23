# Validation Summary: OneUptime Now Speaks Syslog Natively: Bring Legacy Logs into Modern

## Status
validated

## Post Type
Product announcement with hands-on configuration tutorial (curl, rsyslog, Fluent Bit).

## Technologies Covered
- Syslog protocol (RFC3164 / BSD and RFC5424)
- Syslog PRI / facility / severity encoding
- curl (HTTPS POST ingestion)
- rsyslog (omhttp output module, imjournal input module, list templates)
- Fluent Bit (syslog input plugin, http output plugin)
- OneUptime telemetry ingestion (logs, log monitors, dashboards)

## Sources Consulted
- RFC 5424 — The Syslog Protocol (structured data / SD-PARAM format, PRI computation): https://datatracker.ietf.org/doc/html/rfc5424
- RFC 3164 — The BSD syslog Protocol: https://datatracker.ietf.org/doc/html/rfc3164
- rsyslog omhttp module documentation (server, serverport, useHttps, restpath, httpcontenttype, httpheaders, template): https://docs.rsyslog.com/doc/configuration/modules/omhttp.html
- rsyslog imjournal module documentation (StateFile): https://docs.rsyslog.com/doc/configuration/modules/imjournal.html
- Fluent Bit syslog input plugin docs (Mode, Listen, Port, Parser, default parsers): https://docs.fluentbit.io/manual/data-pipeline/inputs/syslog
- Fluent Bit http output plugin docs (Host, Port, URI, Format, json_date_key, Header, tls): https://docs.fluentbit.io/manual/pipeline/outputs/http
- Local bash parsing test confirming the comment-after-line-continuation breakage and the corrected command.

## Issues Found
1. **Broken `curl` command (comments after line-continuation backslashes).** The original example placed `# ...` comments on the same lines as `-H "..." \` continuations. In bash, the backslash escapes the following space (not the newline), so the comment terminates the comment line and the newline ends the command early — the command broke after the first `-H`, with the remaining `-H` and `-d` lines run as separate commands (reproduced locally: `-b: command not found`). **Fix:** moved the explanatory comments to standalone comment lines above the command and removed the inline trailing comments, leaving a single valid command. Verified the corrected version parses as one command and passes all arguments correctly.

2. **Non-compliant RFC5424 structured data in the sample message.** The example used unquoted SD-PARAM values (`src=192.0.2.10 dst=198.51.100.8 action=allow`). RFC 5424 §6.3 requires `SD-PARAM = PARAM-NAME "=" %d34 PARAM-VALUE %d34`, i.e. param values MUST be double-quoted. Since the post explicitly advertises RFC5424 parsing, **fix:** quoted the values (`src="192.0.2.10" dst="198.51.100.8" action="allow"`), escaped for the JSON payload as `src=\"192.0.2.10\"` etc. Confirmed the resulting `-d` body is valid JSON and the decoded syslog line is RFC5424-compliant.

3. **rsyslog template could emit invalid JSON.** The `OneUptimeJSON` template inserted `property(name="rawmsg")` raw between JSON quote constants; any message containing `"`, `\`, or a control character would break the resulting JSON. **Fix:** added `format="json"` to the property so rsyslog JSON-escapes the value (it escapes without adding surrounding quotes, which the template's constants already provide).

## Review Notes
- PRI math is correct: `134 = 16 (local0) * 8 + 6 (info)`; facility 16 = local0 and severity 6 = info are accurate.
- The RFC5424 header field order shown (`<PRI>VERSION TIMESTAMP HOSTNAME APP-NAME PROCID MSGID [SD] MSG`) is correct, and the sample timestamp (`2025-11-06T02:12:04Z`) is a valid RFC5424 timestamp.
- All rsyslog omhttp parameters (`server`, `serverport`, `useHttps`, `restpath`, `httpcontenttype`, `httpheaders` array, `template`), the imjournal `StateFile` parameter, and the Fluent Bit syslog-input (`Mode`, `Listen`, `Port`, `Parser` with `syslog-rfc5424`/`syslog-rfc3164`) and http-output (`Host`, `Port`, `URI`, `Format`, `json_date_key`, `Header`, `tls`) options are valid per current docs. rsyslog config is case-insensitive for parameter names, so `usehttps` works as written.
- The second rsyslog snippet references the `OneUptimeJSON` template "defined earlier"; readers copying only that block into a fresh file must also include the template definition. This is a documentation-completeness nuance, not a technical error, so it was left as written.
- Product-specific endpoints/paths (`https://oneuptime.com/syslog/v1/logs`, `/docs/telemetry/syslog`, the `x-oneuptime-token` / `x-oneuptime-service-name` headers, attribute names like `syslog.facility.name`) are OneUptime's own and are internally consistent across the post; treated as authoritative since this is a first-party announcement.
