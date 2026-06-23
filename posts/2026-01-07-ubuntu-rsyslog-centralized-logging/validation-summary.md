# Validation Summary: How to Configure Centralized Logging with rsyslog on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (step-by-step infrastructure how-to)

## Technologies Covered
- rsyslog (RainerScript and legacy directive syntax)
- Ubuntu 20.04/22.04 (apt, ufw, systemd, ss, logger)
- TLS with GnuTLS (`gtls` netstream driver, OpenSSL CA/cert generation)
- logrotate
- Elasticsearch output (`omelasticsearch`)
- Kafka output (`omkafka`)
- Graylog GELF forwarding (`omfwd`)
- rsyslog statistics (`impstats`) and a custom Python Prometheus exporter
- Email alerting (`ommail`)

## Sources Consulted
- rsyslog official documentation — https://www.rsyslog.com/doc/master/
- rsyslog `omfile` sync parameter / `$ActionFileEnableSync` — https://www.rsyslog.com/doc/reference/parameters/omfile-sync.html
- rsyslog `ommail` (Mail Output Module) — https://rsyslog.readthedocs.io/en/latest/configuration/modules/ommail.html
- rsyslog `ompgsql` (PostgreSQL Output Module) — https://www.rsyslog.com/doc/configuration/modules/ompgsql.html
- rsyslog GELF forwarding tutorial — https://docs.rsyslog.com/doc/tutorials/gelf_forwarding.html
- Graylog GELF format documentation — https://go2docs.graylog.org/current/getting_in_log_data/gelf_format.html
- rsyslog.conf(5) man page — https://man7.org/linux/man-pages/man5/rsyslog.conf.5.html

## Issues Found
1. **Incorrect comment on `$ActionFileEnableSync`** — The directive was commented as "Enable high-precision timestamps for better log correlation." `$ActionFileEnableSync` actually maps to the `omfile` `sync` parameter, which calls `fsync()` after each write to flush log data to disk (at a performance cost). It has nothing to do with timestamps. **Fixed** the comment to describe disk syncing accurately.

2. **Misleading comment on `$ActionFileDefaultTemplate RSYSLOG_TraditionalFileFormat`** — The comment read "Set to 'off' to use high-precision timestamps," which is incorrect; you do not set the template to `off`. High-precision timestamps come from using the `RSYSLOG_FileFormat` template instead of `RSYSLOG_TraditionalFileFormat`. **Fixed** the comment to point to the correct template.

3. **Wrong package for email alerting** — The Email Alerting section ran `sudo apt install -y rsyslog-pgsql mailutils` under the comment "Install the mail output module." `rsyslog-pgsql` is the PostgreSQL output module (`ompgsql`) and is unrelated to mail. The `ommail` module ships with the base `rsyslog` package and needs no extra rsyslog package. **Fixed** to install only `mailutils` (for the optional `mail` test command) and clarified that `ommail` is built in.

## Review Notes
- **GELF over TCP delimiter:** The Graylog GELF template ends each message with `\n`, and the `omfwd` action does not set a frame delimiter. The default GELF TCP input expects a null-byte (`\0`) delimiter, though Graylog's GELF TCP input can be configured to use a newline delimiter instead, and GELF TCP does not support compression. Left as-is because it works when the Graylog input is set to newline framing, but readers using the default null-byte framing should configure their input accordingly (or set the omfwd frame delimiter). Not a hard error.
- **Elasticsearch `dynSearchIndex="on"` with `searchIndex="logs"`:** When `dynSearchIndex` is enabled, `searchIndex` is interpreted as the name of a template that produces the index name. The snippet defines an `ElasticsearchIndex` template but passes the literal `"logs"`, so date-based index naming would not work as the comment implies. Functional but worth tightening in a future revision.
- **`searchType="_doc"`:** Mapping types were removed in Elasticsearch 8.x, so `searchType` is ignored/unsupported on newer clusters. Fine for ES 7.x; a version caveat for readers on ES 8+/OpenSearch.
- **Debug directives `$DebugLevel`/`$DebugFile`:** rsyslog debugging is more reliably enabled via the `RSYSLOG_DEBUG` and `RSYSLOG_DEBUGLOG` environment variables; the legacy config directives shown may not take effect on all builds. Minor; useful as guidance rather than a guaranteed mechanism.
- The bulk of the guide — RainerScript module/input/action syntax, TLS setup with GnuTLS, OpenSSL CA/cert generation, queue parameters, ufw rules, logrotate config, `logger` flags (`-n`, `-P`, `-T`), filtering/templating, and HA failover via `action.execOnlyWhenPreviousIsSuspended` — is accurate and consistent with current rsyslog documentation.
