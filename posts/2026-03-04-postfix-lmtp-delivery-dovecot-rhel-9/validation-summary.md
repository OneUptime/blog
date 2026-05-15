# Validation Summary: How to Configure Postfix with LMTP Delivery to Dovecot on RHEL

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Postfix
- Dovecot
- LMTP
- Pigeonhole Sieve
- Dovecot quota plugin
- Maildir virtual mailboxes

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Deploying mail servers": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_mail_servers/deploying_mail_servers
- Dovecot 2.3 documentation, "Postfix and Dovecot LMTP": https://doc.dovecot.org/2.3/configuration_manual/howto/postfix_dovecot_lmtp/
- Dovecot 2.3 documentation, "LMTP Server": https://doc.dovecot.org/2.3/configuration_manual/protocols/lmtp_server/
- Dovecot 2.3 documentation, "Pigeonhole Sieve Configuration": https://doc.dovecot.org/2.3/configuration_manual/sieve/configuration/
- Dovecot 2.3 documentation, "Pigeonhole Sieve: File Location for Sieve Scripts": https://doc.dovecot.org/2.3/configuration_manual/sieve/file/
- Dovecot 2.3 documentation, "Quota Plugin": https://doc.dovecot.org/2.3/settings/plugin/quota-plugin/
- Dovecot 2.3 documentation, "Quota Configuration": https://doc.dovecot.org/2.3/configuration_manual/quota/
- Postfix postconf(5): https://www.postfix.org/postconf.5.html
- Postfix virtual(8): https://www.postfix.org/virtual.8.html
- Postfix Address Classes README: https://www.postfix.org/ADDRESS_CLASS_README.html

## Issues Found
- The post said Postfix delivers directly to Maildir or mbox "by default." On RHEL/Postfix, direct local delivery defaults to the local delivery agent and system mailbox behavior, while Maildir is configuration-dependent. Changed the wording to "In many basic setups" to avoid overstating the default.
- The post said `dovecot-pigeonhole` includes the LMTP service. Official Dovecot and Red Hat documentation show LMTP is part of Dovecot, while Pigeonhole provides Sieve support. Updated the package explanation accordingly.
- The quota-warning service ran as `dovecot` while its listener was owned by `vmail`. Dovecot's quota warning example recommends using an unprivileged mail user for the warning script. Changed the service user to `vmail` for consistency with the virtual-mailbox configuration shown in the post.

## Review Notes
The LMTP socket path under `/var/spool/postfix/private/dovecot-lmtp` and the Postfix `virtual_transport = lmtp:unix:private/dovecot-lmtp` / `mailbox_transport = lmtp:unix:private/dovecot-lmtp` examples are consistent with Dovecot's Postfix LMTP guide. Red Hat's RHEL 9 guide uses `/var/run/dovecot/lmtp` as its default socket example, so either path is valid as long as Dovecot and Postfix are configured with matching paths and permissions.
