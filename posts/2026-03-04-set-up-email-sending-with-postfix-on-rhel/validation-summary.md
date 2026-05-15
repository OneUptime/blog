# Validation Summary: How to Set Up Email Sending with Postfix on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Postfix
- SMTP
- SASL authentication
- TLS / STARTTLS
- firewalld
- s-nail / mail command

## Sources Consulted
- Red Hat Enterprise Linux 9: Deploying mail servers: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_mail_servers/deploying_mail_servers
- Red Hat Enterprise Linux 9.0 Release Notes: s-nail replaces mailx: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/9.0_release_notes/9.0_release_notes
- Postfix SASL Howto: https://www.postfix.org/SASL_README.html
- Postfix TLS Support: https://www.postfix.org/TLS_README.html
- Gmail IMAP, POP, and SMTP documentation: https://developers.google.com/workspace/gmail/imap/imap-smtp

## Issues Found
- The post stated that Postfix is the default MTA on RHEL and that it is typically installed by default. Red Hat documentation treats Postfix as the documented mail server MTA package but does not require it to be present on every installation. Updated the wording and install comment to avoid overclaiming.
- The send-only configuration labeled `mydestination` as a relay restriction. In Postfix, `mydestination` defines domains delivered locally; relay scope is controlled separately by listener configuration and trusted networks. Updated the comment and added `mynetworks = 127.0.0.0/8, [::1]/128` to match local-only submissions.
- The testing step installed `mailx`, which is outdated for RHEL 9 because Red Hat replaced `mailx` with `s-nail`. Updated the command to install `s-nail` while keeping the `mail -s` test command.
- The Gmail relay example enabled SMTP SASL authentication but did not install a SASL mechanism package. Added `cyrus-sasl-plain`, which is required on RHEL-family systems for common authenticated SMTP relays using PLAIN/LOGIN over TLS.

## Review Notes
The remaining commands and settings are technically sound for a basic RHEL Postfix send-only or relay setup. The Gmail example uses `smtp.gmail.com:587` with TLS, which matches Google documentation, but production use should account for provider-specific limits, app-password availability, and organization policy.
