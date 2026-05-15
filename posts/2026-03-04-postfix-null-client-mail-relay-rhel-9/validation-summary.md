# Validation Summary: How to Set Up Postfix as a Null-Client Mail Relay on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Postfix
- Postfix null-client configuration
- SMTP relay configuration
- SASL client authentication
- STARTTLS/TLS for SMTP relay connections
- Postfix canonical and virtual alias maps

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Deploying mail servers": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_mail_servers/deploying_mail_servers
- Postfix Standard Configuration Examples, "Postfix on a null client": https://www.postfix.org/STANDARD_CONFIGURATION_README.html
- Postfix Basic Configuration, relayhost syntax and bracketed relay hosts: https://www.postfix.org/BASIC_CONFIGURATION_README.html
- Postfix SASL Howto, SMTP/LMTP client authentication: https://www.postfix.org/SASL_README.html
- Postfix TLS Support, SMTP client TLS security levels: https://www.postfix.org/TLS_README.html
- Postfix Address Rewriting, canonical maps and local alias behavior: https://www.postfix.org/ADDRESS_REWRITING_README.html
- Postfix regexp_table(5), regexp table substitution syntax: https://www.postfix.org/regexp_table.5.html
- Postfix postconf(5), alias_maps, local_transport, and virtual_alias_maps behavior: https://www.postfix.org/postconf.5.html

## Issues Found
- The sender canonical example for rewriting only the domain used `/@.*$/ @example.com`, which would return `@example.com` as the entire rewritten address and lose the local part. Changed it to `/^(.+)@.*$/ ${1}@example.com` so Postfix regexp substitution preserves the username.
- The section for handling root mail recommended `/etc/aliases` and `newaliases`. With `mydestination` empty, mail is not delivered through the local delivery agent, and Postfix local aliases apply only to local delivery. Replaced this with a `virtual_alias_maps` example that maps `root@example.com` to `admin@example.com` before relay.

## Review Notes
The core null-client settings match Red Hat's RHEL 9 guidance: empty `mydestination`, bracketed `relayhost`, `inet_interfaces = loopback-only`, restricted `mynetworks`, and disabled local delivery. The SASL and TLS relay examples match upstream Postfix client-authentication and mandatory STARTTLS guidance. In a real deployment, administrators should ensure the `mail` command is installed for the test command and should match the SASL password-map key exactly to the configured `relayhost`, including `:587` when that port is used.
