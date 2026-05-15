# Validation Summary: How to Set Up IMAP and POP3 with Dovecot on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Dovecot IMAP and POP3 server
- TLS/SSL configuration
- Maildir mailbox storage
- firewalld
- Postfix local delivery integration
- OpenSSL and doveadm testing

## Sources Consulted
- Red Hat Enterprise Linux 9 Deploying mail servers documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_mail_servers/
- Dovecot 2.3 SSL configuration documentation: https://doc.dovecot.org/2.3/configuration_manual/dovecot_ssl_configuration/
- Dovecot 2.3 core settings reference: https://doc.dovecot.org/2.3/settings/core/
- Dovecot 2.3 POP3 server documentation: https://doc.dovecot.org/2.3/configuration_manual/protocols/pop3_server/
- Dovecot 2.3 mail location documentation: https://doc.dovecot.org/2.3/configuration_manual/mail_location/
- Dovecot 2.3 authentication debugging documentation: https://doc.dovecot.org/2.3/admin_manual/debugging/debugging_authentication/
- firewalld service documentation: https://firewalld.org/documentation/service/

## Issues Found
- The POP3-specific configuration described `pop3_uidl_format` as a deleted-message setting. It is actually the UIDL format used by POP3 clients to identify already downloaded messages. Updated the comment to describe stable UIDLs accurately.
- The POP3-specific configuration set `pop3_delete_type = flag` while saying it prevented deletion after download, but Dovecot only uses `pop3_delete_type` with `pop3_deleted_flag`. Added `pop3_deleted_flag = $POP3Deleted` and changed the comment to explain that POP3-deleted messages are hidden with an IMAP keyword instead of being expunged.

## Review Notes
- RHEL 9 documentation notes that Dovecot enables IMAP, POP3, and LMTP by default; explicitly setting `protocols = imap pop3` is still valid for a server that is not using LMTP.
- The Maildir path must match Postfix delivery, typically by setting Postfix's `home_mailbox` consistently. The post already calls this out in troubleshooting.
