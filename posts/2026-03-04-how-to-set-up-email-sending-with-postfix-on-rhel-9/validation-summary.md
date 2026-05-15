# Validation Summary: How to Set Up Email Sending with Postfix on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Postfix
- DNF
- firewalld
- s-nail / mail command
- Cyrus SASL
- SMTP relay authentication
- Postfix TLS configuration

## Sources Consulted
- Red Hat Enterprise Linux 9 Deploying mail servers: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_mail_servers/deploying_mail_servers
- Red Hat Enterprise Linux 9 Considerations in adopting RHEL 9, package replacements: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/considerations_in_adopting_rhel_9/assembly_software-management_considerations-in-adopting-rhel-9
- Red Hat Enterprise Linux 9 Package manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/package_manifest/index
- Postfix Configuration Parameters: https://www.postfix.org/postconf.5.html
- Postfix TLS Support: https://www.postfix.org/TLS_README.html
- Postfix SASL Howto: https://www.postfix.org/SASL_README.html
- Postfix Replacements for Deprecated Features: https://www.postfix.org/DEPRECATION_README.html

## Issues Found
- The install command used `mailx`, but RHEL 9 replaced the `mailx` package with `s-nail`. Changed the command to install `s-nail`.
- The SMTP authentication example can require the Cyrus SASL PLAIN/LOGIN plugin package for typical authenticated relay hosts. Added `cyrus-sasl-plain` to the install command.
- The TLS snippet used `smtp_use_tls = yes`, which Postfix documents as obsolete in favor of `smtp_tls_security_level`. Removed `smtp_use_tls` because the snippet already sets `smtp_tls_security_level = encrypt`.

## Review Notes
- The firewall commands are only needed when accepting inbound SMTP, which the post already states.
- `smtp_tls_security_level = encrypt` is appropriate for a known relay host that requires STARTTLS, but it should not be used as a blanket default for arbitrary public Internet delivery.
