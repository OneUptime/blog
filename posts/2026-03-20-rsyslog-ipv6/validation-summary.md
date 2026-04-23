# Validation Summary: How to Configure rsyslog for IPv6

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- rsyslog
- IPv6
- Syslog over UDP and TCP
- RainerScript
- omfwd
- omelasticsearch
- TLS with rsyslog network stream drivers
- util-linux logger

## Sources Consulted
- rsyslog imudp module documentation: https://docs.rsyslog.com/doc/configuration/modules/imudp.html
- rsyslog imtcp module documentation: https://docs.rsyslog.com/doc/configuration/modules/imtcp.html
- rsyslog omfwd module documentation: https://docs.rsyslog.com/doc/configuration/modules/omfwd.html
- rsyslog omelasticsearch module documentation: https://docs.rsyslog.com/doc/configuration/modules/omelasticsearch.html
- rsyslog dynSearchIndex parameter documentation: https://docs.rsyslog.com/doc/reference/parameters/omelasticsearch-dynsearchindex.html
- rsyslog reserved template names documentation: https://docs.rsyslog.com/doc/reference/templates/templates-reserved-names.html
- rsyslog is_in_subnet() documentation: https://docs.rsyslog.com/doc/rainerscript/functions/rs-is_in_subnet.html
- rsyslog gtls network stream driver documentation: https://docs.rsyslog.com/doc/concepts/ns_gtls.html
- rsyslog impstats module documentation: https://docs.rsyslog.com/doc/configuration/modules/impstats.html
- util-linux logger man page: https://manpages.debian.org/testing/util-linux/logger.1.en.html

## Issues Found
- The first UDP input used `address="::1"` but the comment said it listened on all IPv6 interfaces. Updated the comment to say it listens on IPv6 loopback.
- The Elasticsearch action referenced an undefined `plain-syslog` template and used a property-replacer style date expression directly in `searchIndex`, which would be treated as a literal unless `dynSearchIndex` is enabled. Changed it to use the predefined `RSYSLOG_StdJSONFmt` template, added a `daily-syslog-index` string template, enabled `dynSearchIndex`, and set `searchType=""` for modern Elasticsearch versions.
- The custom JSON template escaped only `msg`; other string fields could produce invalid JSON if they contained escapable characters. Added `format="json"` to `hostname`, `programname`, and `fromhost-ip`.
- The IPv6 subnet filters used string prefix checks. Replaced them with `is_in_subnet()` using CIDR notation for `2001:db8::/32` and `fe80::/10`.
- The TLS example used anonymous TLS, which encrypts but does not authenticate peers and is not suitable for the production guidance in the post. Updated the example to use `x509/name` authentication with permitted peer names.
- The TLS input snippet reloaded `imtcp` with module-level TLS settings after the earlier `imtcp` load. Moved the TLS stream driver settings onto the TLS `input()` instead.
- The test command used `logger --ipv6`, which is not a util-linux `logger` option. Replaced it with `logger --server ::1 --port 5140 --udp`.
- The statistics check used `kill -USR1`, which toggles rsyslog debug output when debug support is enabled rather than emitting statistics. Replaced it with an `impstats` configuration note.
- Updated the conclusion to reflect `is_in_subnet()` and X.509-authenticated TLS.

## Review Notes
The snippets were reviewed against current rsyslog 8 documentation and local `logger --help`. A full custom `rsyslogd -N1 -f` validation of assembled snippets could not be run in this environment because the local non-root rsyslogd process was denied access to temporary config files; the system config syntax check itself completed successfully.
