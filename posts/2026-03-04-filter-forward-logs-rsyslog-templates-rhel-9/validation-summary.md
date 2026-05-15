# Validation Summary: How to Filter and Forward Logs with rsyslog Templates on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- rsyslog
- RainerScript filters
- rsyslog templates
- syslog facilities and severities
- logger command

## Sources Consulted
- rsyslog properties documentation: https://www.rsyslog.com/doc/configuration/properties.html
- rsyslog templates documentation: https://www.rsyslog.com/doc/configuration/templates.html
- rsyslog property replacer documentation: https://www.rsyslog.com/doc/configuration/property_replacer.html
- rsyslog filters documentation: https://www.rsyslog.com/doc/configuration/filters.html
- rsyslog RainerScript expressions documentation: https://www.rsyslog.com/doc/rainerscript/expressions.html
- rsyslog omfwd module documentation: https://www.rsyslog.com/doc/configuration/modules/omfwd.html
- Red Hat RHEL 9 documentation for configuring logging with rsyslog: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/assembly_configuring-a-remote-logging-solution_security-hardening
- Local command help: `logger --help`
- Local rsyslog version check: `rsyslogd -v`

## Issues Found
- The list-template examples used invalid message property options, `spifno1teleading` and `spifno1stleading`. Changed both to the documented `spIfNo1stSp` option so rsyslog inserts a leading space when the message does not already start with one.
- The JSON example was introduced as a "Plugin Template" even though the snippet defines a `type="list"` template. Renamed the heading to "JSON List Templates" to match the actual rsyslog template type used.
- The property-based regex filter used `regex` with an alternation expression, but rsyslog's `regex` compare operation is basic regular expression syntax. Changed it to `ereregex` so `error|fail|critical` is interpreted as extended regex alternation.
- The negation example referenced `dynaFile="RemoteHostLogs"` without defining a matching dynamic file template. Changed it to a static `file="/var/log/remote-hosts.log"` target so the example is complete.
- The application-routing example used unsupported array-literal comparison syntax for `$programname`. Replaced it with explicit `or` comparisons, which are valid RainerScript expressions.

## Review Notes
The forwarding examples use TCP on port 514 and action queues in a conventional rsyslog style. In production, admins should still confirm firewall, SELinux, disk queue, and TLS requirements for their environment.
