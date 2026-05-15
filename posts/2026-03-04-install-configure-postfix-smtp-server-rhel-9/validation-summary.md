# Validation Summary: How to Install and Configure a Postfix SMTP Server on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Postfix SMTP server
- Cyrus SASL authentication
- firewalld
- DNS records for mail delivery
- Linux systemd and mail troubleshooting commands

## Sources Consulted
- Red Hat Enterprise Linux 9: Deploying mail servers: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_mail_servers/deploying_mail_servers
- Postfix postconf(5) manual: https://www.postfix.org/postconf.5.html
- Postfix master(5) manual: https://www.postfix.org/master.5.html
- Postfix SASL Howto: https://www.postfix.org/SASL_README.html
- Postfix mail logging documentation: https://www.postfix.org/MAILLOG_README.html
- firewalld service documentation: https://firewalld.org/documentation/service/

## Issues Found
- The post stated that Postfix is usually installed by default on RHEL. Red Hat documentation says the package is installed when the mail server package selection is used, so I changed the wording to say it might already be installed depending on installation choices.
- The mail-flow diagram labeled the shared Postfix node as "Submission" even for remote SMTP traffic on port 25. I changed the label to "Postfix SMTP Services" so it accurately covers both submission and inbound SMTP.
- The `mailbox_size_limit` comment described a total mailbox size limit. Postfix documents this parameter as the maximum size of an individual local mailbox or Maildir file, so I corrected the comment.
- The Cyrus SASL instructions enabled Postfix SASL settings and `saslauthd` but omitted the Cyrus SASL `smtpd.conf` backend configuration. I added the required `/etc/sasl2/smtpd.conf` snippet with `pwcheck_method: saslauthd` and `mech_list: PLAIN LOGIN`.
- The `postconf -n` section said it showed every active setting. `postconf -n` shows non-default active settings, so I corrected the wording.

## Review Notes
- The guide remains a basic setup and correctly notes that production deployments should add TLS certificates, SPF/DKIM/DMARC, and Dovecot for IMAP access.
- The Spamhaus RBL example is syntactically valid, but production use should follow Spamhaus query and resolver policies.
