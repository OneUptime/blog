# Validation Summary: How to Configure Postfix as an SMTP Relay Server on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Postfix SMTP server and relay configuration
- SMTP, STARTTLS, and SASL authentication
- Cyrus SASL and saslauthd
- firewalld
- Postfix queue monitoring and pflogsumm

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Deploying mail servers: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_mail_servers/deploying_mail_servers
- Postfix Basic Configuration README: https://www.postfix.org/BASIC_CONFIGURATION_README.html
- Postfix SMTP relay and access control documentation: https://www.postfix.org/SMTPD_ACCESS_README.html
- Postfix TLS Support: https://www.postfix.org/TLS_README.html
- Postfix SASL Howto: https://www.postfix.org/SASL_README.html
- Postfix Configuration Parameters: https://www.postfix.org/postconf.5.html
- Postfix Performance Tuning: https://www.postfix.org/TUNING_README.html
- Postfix master(5) service configuration: https://www.postfix.org/master.5.html

## Issues Found
- The SASL section enabled Postfix SASL settings and started `saslauthd`, but did not configure Cyrus SASL to use `saslauthd`. Added `/etc/sasl2/smtpd.conf` with `pwcheck_method: saslauthd` and `mech_list: PLAIN LOGIN`, matching the Postfix SASL documentation.
- The post enabled optional inbound TLS and SASL authentication, but did not prevent plaintext AUTH. Added `smtpd_tls_auth_only = yes` so authentication is offered only after STARTTLS, as recommended by the Postfix TLS documentation.
- The rate-limiting section said the settings protect against internal hosts, but Postfix excludes `$mynetworks` from client event limits by default. Added `smtpd_client_event_limit_exceptions =` so the shown limits apply to trusted internal clients too.
- The firewall section opened TCP port 587 but did not enable Postfix's `submission` service. Added a minimal `/etc/postfix/master.cf` submission service example with encrypted TLS, SASL enabled, and authenticated relay restrictions.

## Review Notes
The core relay configuration, TLS client settings, relay restrictions, queue commands, and firewalld commands are technically valid for RHEL 9/Postfix. In production, administrators should tune `mynetworks`, rate limits, HELO restrictions, and submission-service policy for their own client behavior and authentication backend.
