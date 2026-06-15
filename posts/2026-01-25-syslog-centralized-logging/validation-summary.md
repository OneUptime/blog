# Validation Summary: How to Configure Syslog for Centralized Logging

## Status
validated

## Post Type
Tutorial / technical configuration guide

## Technologies Covered
- Syslog, RFC 3164-style BSD syslog, and RFC 5424 syslog
- rsyslog, including imudp, imtcp, omfile, omfwd, omelasticsearch, omkafka, omhttp, mmpstrucdata, mmjsonparse, and mmexternal
- syslog-ng OSE, including network sources, TLS, file destinations, elasticsearch-http, Kafka, filters, and disk buffering
- OpenSSL certificate generation
- Cisco IOS, Juniper Junos, and Palo Alto Networks syslog configuration
- Elasticsearch, Kafka, HTTP log forwarding, and shell-based health checks
- Python parsing for nginx access log enrichment

## Sources Consulted
- RFC 5424, The Syslog Protocol: https://www.rfc-editor.org/rfc/rfc5424
- rsyslog imtcp and TLS parameters: https://docs.rsyslog.com/doc/configuration/modules/imtcp.html
- rsyslog gtls network stream driver: https://docs.rsyslog.com/doc/concepts/ns_gtls.html
- rsyslog TLS central server tutorial: https://docs.rsyslog.com/doc/tutorials/tls_cert_server.html
- rsyslog omfwd module and TLS forwarding: https://docs.rsyslog.com/doc/configuration/modules/omfwd.html
- rsyslog omelasticsearch module and searchType parameter: https://docs.rsyslog.com/doc/configuration/modules/omelasticsearch.html
- rsyslog mmpstrucdata module: https://docs.rsyslog.com/doc/configuration/modules/mmpstrucdata.html
- rsyslog mmexternal module and binary/interface parameters: https://docs.rsyslog.com/doc/configuration/modules/mmexternal.html
- rsyslog omhttp module and retry/header parameters: https://docs.rsyslog.com/doc/configuration/modules/omhttp.html
- rsyslog omkafka module and partitions.auto parameter: https://docs.rsyslog.com/doc/configuration/modules/omkafka.html
- syslog-ng elasticsearch-http destination: https://syslog-ng.github.io/admin-guide/070_Destinations/030_Elasticsearch-http/README.html
- syslog-ng disk buffering documentation: https://syslog-ng.github.io/admin-guide/080_Log/020_Buffering/README.html
- syslog-ng Kafka destination documentation: https://syslog-ng.github.io/admin-guide/070_Destinations/100_Kafka-c/003_Kafka-c_options.html
- Cisco system message logging documentation: https://www.cisco.com/c/en/us/td/docs/routers/access/wireless/software/guide/SysMsgLogging.html
- Juniper Junos system logging documentation: https://www.juniper.net/documentation/us/en/software/junos/network-mgmt/topics/topic-map/system-logging-on-a-single-chassis-system.html
- Juniper structured-data CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/structured-data-edit-system.html
- Palo Alto Networks syslog monitoring documentation: https://docs.paloaltonetworks.com/pan-os/11-1/pan-os-admin/monitoring/use-syslog-for-monitoring/configure-syslog-monitoring
- Palo Alto Networks syslog server profile reference: https://docs.paloaltonetworks.com/ngfw/help/10-2/device/device-server-profiles-syslog
- OpenSSL local CLI help/version check via `openssl version -a`
- Local rsyslog version/config check via `rsyslogd -v` and `rsyslogd -N1`
- OneUptime site link check: https://oneuptime.com

## Issues Found
- The introduction described one syslog message shape as the standard structure. Updated it to distinguish the common BSD-style structure from RFC 5424's stricter format with version, structured data, and message body fields.
- The rsyslog server snippet loaded `imtcp` twice, once as a plain module and once with TLS parameters. Removed the duplicate TLS module load and moved TLS certificate settings into a `global()` block.
- The rsyslog server snippet used `mmpstrucdata` without loading the module. Added `module(load="mmpstrucdata")`.
- The rsyslog TLS input used inconsistent `StreamDriver.Authmode` casing. Updated it to the documented `StreamDriver.AuthMode` spelling.
- The rsyslog Elasticsearch action used `searchType="_doc"`, which is not appropriate for Elasticsearch 7 and later. Updated it to `searchType=""` so rsyslog omits the document type.
- The syslog-ng Elasticsearch destination included `type("")`, which is deprecated/no-op in current syslog-ng releases. Removed it.
- The rsyslog client snippet explicitly loaded `omfwd`, but the current rsyslog documentation notes `omfwd` is built in. Removed that unnecessary module load.
- The rsyslog client TLS example used `@@(o)`, which selects octet-counted TCP framing and is not a complete TLS configuration. Replaced it with an `omfwd` action showing TLS stream driver settings and permitted peer verification.
- The syslog-ng client disk-buffer example used older `mem-buf-size()` and `disk-buf-size()` option names. Updated them to current `flow-control-window-bytes()` and `capacity-bytes()`.
- The Palo Alto example used unsupported-looking `set deviceconfig system logging syslog-server ...` commands. Replaced it with the documented server profile and log forwarding profile configuration path.
- The rsyslog parsing example used `mmexternal` without loading it and passed the default message-only input to a Python script that expected JSON. Added `module(load="mmexternal")` and set `interface.input="fulljson"` and `interface.output="fulljson"`.
- The health check script claimed to check queue size by counting occurrences of "queue" in `rsyslogd -N1` output, but `-N1` validates configuration rather than reporting live queue depth. Replaced that block with a configuration validation check.

## Review Notes
- Some examples still assume optional packages/plugins are installed, such as rsyslog `omelasticsearch`, `omkafka`, `omhttp`, and syslog-ng Elasticsearch/Kafka modules. Production readers should install the distribution-specific packages before enabling those snippets.
- The OpenSSL certificate commands are usable for examples, but production certificates should normally include proper Subject Alternative Names and use an organization-managed CA.
