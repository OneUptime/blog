# Validation Summary: How to Set Up ModSecurity WAF with Apache on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ModSecurity 2.x (libapache2-mod-security2)
- Apache HTTP Server (apache2)
- Ubuntu (apt package manager, systemd)
- OWASP ModSecurity Core Rule Set (referenced via rule IDs in 9xxxxx range)
- ModSecurity Rule Language (SecRule directives, operators, actions)

## Sources Consulted
- ModSecurity v2 Reference Manual: https://github.com/SpiderLabs/ModSecurity/wiki/Reference-Manual-(v2.x)
- Default modsecurity.conf-recommended distributed with ModSecurity 2.9
- Ubuntu package metadata for `libapache2-mod-security2`
- OWASP ModSecurity Core Rule Set documentation: https://coreruleset.org/docs/
- Apache HTTP Server documentation for mod_security2 / a2enmod / a2enconf

## Issues Found
- **Rule-ID aggregation command broken** (line ~275). The original:
  ```
  sudo grep "id \"" /var/log/apache2/modsec_audit.log | awk '{print $NF}' | sort | uniq -c | sort -rn
  ```
  In ModSecurity Message lines the format is `... [id "942100"] [msg "..."] [severity "CRITICAL"]`, so `awk '{print $NF}'` returns the trailing severity/message token, not the rule ID. Replaced with a `grep -oE '\[id "[0-9]+"\]'` extraction that reliably aggregates rule IDs.

## Review Notes
- The post targets ModSecurity 2.x (the version packaged for Ubuntu as `libapache2-mod-security2`). ModSecurity 3.x (libmodsecurity) uses a different connector architecture (`ModSecurity-apache` connector) and is not packaged in the default Ubuntu repos at this time; the post correctly stays within the 2.x scope.
- Configuration values (`SecRequestBodyLimit 13107200` ≈ 12.5 MiB, `SecRequestBodyNoFilesLimit 131072` = 128 KiB, `SecResponseBodyLimit 524288` = 512 KiB, `SecAuditLogParts ABIJDEFHZ`, `SecAuditLogRelevantStatus "^(?:5|4(?!04))"`) match the upstream `modsecurity.conf-recommended` defaults.
- The post enables `SecResponseBodyAccess On`, which differs from the recommended-config default of `Off`. This is intentional in the post (so response-body rules work) but does carry a performance cost on response-body-heavy workloads — worth flagging to readers in a future revision.
- Phase numbering (1: request headers, 2: request body, 3: response headers, 4: response body, 5: logging) matches the ModSecurity reference manual.
- User-defined rule IDs (1001–1006, 9001–9002) sit safely in the user range (1–99999) and do not collide with CRS rule IDs (9xxxxx). 9001/9002 are close to the upper boundary of the user range — readers may prefer to namespace local rules in a more comfortable sub-range (e.g., 10000+) in production.
- Path traversal example rule `@contains /../` only matches the literal substring and will miss URL-encoded payloads (`%2e%2e%2f`, etc.). It is presented as a basic illustration and that is acceptable for a tutorial, but the OWASP CRS rules at `REQUEST-930-APPLICATION-ATTACK-LFI.conf` give the production-grade coverage.
- The `SecRule REQUEST_HEADERS:User-Agent "^$"` example relies on ModSecurity's default operator being `@rx`, which is correct per the reference manual.
