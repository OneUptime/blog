# Validation Summary: How to Ship Logs to a SIEM with rsyslog on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- rsyslog / RainerScript
- rsyslog omfwd forwarding
- rsyslog TLS forwarding
- rsyslog omelasticsearch output
- rsyslog imfile input
- rsyslog disk-assisted queues
- rsyslog impstats monitoring
- Linux audit logs
- syslog and SIEM ingestion formats

## Sources Consulted
- Red Hat Enterprise Linux 9 Security Hardening: Configuring a remote logging solution: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/assembly_configuring-a-remote-logging-solution_security-hardening
- Red Hat Enterprise Linux 9 Configuring basic system settings: Troubleshooting problems by using log files: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_basic_system_settings/index
- rsyslog omfwd module documentation: https://www.rsyslog.com/doc/configuration/modules/omfwd.html
- rsyslog omelasticsearch module documentation: https://www.rsyslog.com/doc/configuration/modules/omelasticsearch.html
- rsyslog templates documentation: https://www.rsyslog.com/doc/configuration/templates.html
- rsyslog template examples: https://www.rsyslog.com/doc/reference/templates/templates-examples.html
- rsyslog property statement documentation: https://www.rsyslog.com/doc/reference/templates/templates-statement-property.html
- rsyslog imfile module documentation: https://www.rsyslog.com/doc/configuration/modules/imfile.html
- rsyslog queue documentation: https://www.rsyslog.com/doc/concepts/queues.html
- rsyslog impstats module documentation: https://www.rsyslog.com/doc/configuration/modules/impstats.html
- Local command checks: `rsyslogd -N1`, `rsyslogd -v`, and `logger --help`

## Issues Found
- The JSON output templates were manually assembled with quoted string fields but only applied JSON escaping to the `msg` property. This could produce invalid JSON if fields such as `hostname`, `programname`, or `procid` contained characters that require escaping. Updated both `SIEMJson` and `ElasticDoc` to use rsyslog's `option.jsonf="on"` list templates with `format="jsonf"` fields, which is the documented method for JSON-safe structured output.

## Review Notes
- The forwarding, TLS, imfile, queue, impstats, `logger`, and `rsyslogd -N1` examples align with current rsyslog and Red Hat documentation.
- The CEF example is a simplified template and should be tested against the target SIEM's CEF parser before production use, because CEF products can have stricter field mapping and escaping expectations than generic syslog receivers.
- Direct Elasticsearch/OpenSearch ingestion through `omelasticsearch` is valid rsyslog functionality, but production Elastic deployments often require TLS and authentication settings that depend on the target cluster configuration.
