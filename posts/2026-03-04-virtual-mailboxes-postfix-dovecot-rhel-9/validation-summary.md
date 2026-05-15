# Validation Summary: How to Set Up Virtual Mailboxes with Postfix and Dovecot on RHEL

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Postfix virtual mailbox delivery
- Dovecot IMAP
- Dovecot passwd-file authentication
- Maildir storage
- TLS for Dovecot
- SELinux mail spool labeling
- Dovecot quota plugin

## Sources Consulted
- Postfix Virtual Domain Hosting Howto: https://www.postfix.org/VIRTUAL_README.html
- Postfix virtual(8) manual: https://www.postfix.org/virtual.8.html
- Dovecot passwd-file authentication documentation: https://doc.dovecot.org/2.3/configuration_manual/authentication/passwd_file/
- Dovecot virtual users documentation: https://doc.dovecot.org/2.3/configuration_manual/virtual_users/
- Dovecot mail location documentation: https://doc.dovecot.org/2.3/configuration_manual/mail_location/
- Dovecot password schemes documentation: https://doc.dovecot.org/2.3/configuration_manual/authentication/password_schemes/
- Dovecot SSL documentation: https://doc.dovecot.org/2.3/admin_manual/ssl/
- Dovecot quota plugin documentation: https://doc.dovecot.org/2.3/configuration_manual/quota_plugin/
- Dovecot quota configuration documentation: https://doc.dovecot.org/2.3/configuration_manual/quota/
- Dovecot LDA documentation: https://doc.dovecot.org/2.3/configuration_manual/protocols/lda/
- Red Hat Enterprise Linux 9 Deploying mail servers documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_mail_servers/deploying_mail_servers

## Issues Found
- The post said to reload Postfix after `main.cf` and map changes, and the new-user workflow reloaded Postfix after rebuilding `virtual_mailbox_maps`. Postfix hash map changes require `postmap` to rebuild the database; a service reload is needed for `main.cf` changes, not for ordinary map database rebuilds. Updated the comments to distinguish these cases.
- The Dovecot quota example loaded both `quota` and `imap_quota` only inside the IMAP protocol block. Dovecot documents loading the core `quota` plugin globally and adding `imap_quota` for IMAP quota commands. Updated the snippet accordingly.
- The quota section implied quota support applied generally, but this guide delivers mail with Postfix's `virtual(8)` delivery agent. Dovecot quota enforcement applies to Dovecot-handled saves and deliveries, such as IMAP APPEND or LMTP/LDA delivery, and does not enforce SMTP delivery limits when Postfix writes directly with `virtual(8)`. Added a short caveat.

## Review Notes
The primary Postfix virtual mailbox settings, Maildir trailing slash behavior, Dovecot passwd-file format, static userdb configuration, Dovecot mail location variables, TLS file syntax, and RHEL virtual-user/SELinux guidance were consistent with the consulted documentation. The Dovecot auth socket shown in `10-master.conf` is valid but unused unless Postfix SASL authentication is configured separately.
