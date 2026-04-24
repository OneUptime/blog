# Validation Summary: How to Configure Postfix mynetworks for IPv4 Trusted Subnets

## Status
validated

## Post Type
Guide

## Technologies Covered
- Postfix
- SMTP relay control
- `mynetworks`
- `mynetworks_style`
- CIDR lookup tables
- SASL authentication
- IPv4 networking

## Sources Consulted
- Postfix `postconf(5)`: https://www.postfix.org/postconf.5.html
- Postfix Basic Configuration README: https://www.postfix.org/BASIC_CONFIGURATION_README.html
- Postfix SMTP access control README: https://www.postfix.org/SMTPD_ACCESS_README.html
- Postfix `cidr_table(5)`: https://www.postfix.org/cidr_table.5.html
- Postfix IPv6 README: https://www.postfix.org/IPV6_README.html
- Postfix `access(5)`: https://www.postfix.org/access.5.html

## Issues Found
- The introduction and conclusion described `mynetworks` as if it were an IPv4-only setting. Updated the wording to keep the article IPv4-focused without misstating Postfix behavior, since Postfix supports both IPv4 and IPv6 addresses in `mynetworks`.
- The comment for `mynetworks_style = host` said it trusts only `127.0.0.1`. Updated this to “the local machine” to match the official Postfix documentation.
- The section heading said “Hash File” but the example used a `cidr:` lookup. Renamed the section to “CIDR File” because Postfix documents CIDR ranges under `cidr:` tables, not `hash:` tables.
- The sample CIDR file listed bare patterns and used an inline `#` comment. Updated the example to use valid CIDR table entries with a result field (`OK`) on each line and moved the partner-server note to its own comment line, matching `cidr_table(5)` syntax.

## Review Notes
- The post is intentionally IPv4-centric, but Postfix also supports IPv6 in `mynetworks`. If IPv6 is enabled on a server, explicit `mynetworks` lists should include the relevant IPv6 loopback or trusted network ranges as needed.
- `mynetworks_style` defaults differ by Postfix version and compatibility settings; the current post does not rely on a default, which keeps the guidance safe.
