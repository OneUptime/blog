# Validation Summary: How to Set Up Dovecot IMAP with Postfix on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Dovecot IMAP
- Postfix SMTP and SASL integration
- Maildir mailbox storage
- TLS/SSL configuration
- firewalld
- systemd
- SELinux

## Sources Consulted
- Red Hat Enterprise Linux 9 Deploying mail servers: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_mail_servers/
- Dovecot 2.3 Maildir Configuration: https://doc.dovecot.org/2.3/configuration_manual/mail_location/Maildir/
- Dovecot 2.3 SSL Configuration: https://doc.dovecot.org/2.3/configuration_manual/dovecot_ssl_configuration/
- Dovecot 2.3 Namespace Configuration: https://doc.dovecot.org/2.3/configuration_manual/namespace/
- Dovecot 2.3 Service Configuration: https://doc.dovecot.org/2.3/configuration_manual/service_configuration/
- Dovecot Debugging Authentication: https://doc.dovecot.org/2.3/admin_manual/debugging/debugging_authentication/
- Dovecot Logging: https://doc.dovecot.org/admin_manual/logging/
- Postfix SASL README: https://www.postfix.org/SASL_README.html
- firewalld service documentation: https://firewalld.org/documentation/service/

## Issues Found
- The mailbox namespace snippet omitted `inbox = yes`. Dovecot treats the namespace section name as an internal configuration name, so the default INBOX namespace should explicitly set `inbox = yes`. Added it to the `15-mailboxes.conf` example.
- The performance tuning comment for `service_count` said it controlled the number of connections before forking a new process. Dovecot documents `service_count` as the number of client connections a process handles before it exits/restarts. Updated the comment to match the actual behavior.

## Review Notes
- The Dovecot and Postfix SASL socket examples match the documented `/var/spool/postfix/private/auth` and `smtpd_sasl_path = private/auth` pattern.
- The Maildir location, TLS certificate file syntax with leading `<`, `doveadm auth test`, `firewall-cmd`, `systemctl`, and SELinux context examples are technically valid for the RHEL 9/Dovecot 2.3 style covered by the post.
- Dovecot 2.4 has a redesigned configuration format, but RHEL 9 documentation still uses the Dovecot 2.3-style configuration shown here.
