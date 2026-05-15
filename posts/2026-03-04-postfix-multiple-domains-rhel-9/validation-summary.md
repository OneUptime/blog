# Validation Summary: How to Configure Postfix for Multiple Domains on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Postfix
- DNS MX records
- Virtual alias domains
- Virtual mailbox domains
- Maildir mailbox storage
- Postfix hash lookup tables

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Deploying mail servers": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_mail_servers/deploying_mail_servers
- Postfix Virtual Domain Hosting Howto: https://www.postfix.org/VIRTUAL_README.html
- Postfix Address Classes: https://www.postfix.org/ADDRESS_CLASS_README.html
- Postfix virtual(5) manual: https://www.postfix.org/virtual.5.html
- Postfix virtual(8) manual: https://www.postfix.org/virtual.8.html
- Postfix postmap(1) manual: https://www.postfix.org/postmap.1.html

## Issues Found
- The original RHEL examples did not set `inet_interfaces = all`. RHEL Postfix listens only on loopback by default, so a server intended to receive mail for internet-facing domains must be configured to listen on the relevant network interfaces. I added `inet_interfaces = all` to both `main.cf` examples.
- The DNS prerequisites said "All domains resolve to the same server IP." For MX-based delivery, the required record is that the MX host resolves to the mail server IP. I changed this to say that `mail.example.com` resolves to the server IP.

## Review Notes
The Postfix virtual alias and virtual mailbox parameters, `postmap` usage, hash table examples, Maildir trailing slash behavior, UID/GID mapping, and the warning not to list a domain in both `mydestination` and a virtual domain class are consistent with the official Postfix documentation. For a production RHEL deployment, the guide could also mention opening the SMTP service in firewalld, TLS, anti-spam controls, and Dovecot integration, but those are outside the article's narrow multi-domain configuration scope.
