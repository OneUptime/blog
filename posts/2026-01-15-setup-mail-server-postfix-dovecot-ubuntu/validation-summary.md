# Validation Summary: How to Set Up a Full Mail Server with Postfix and Dovecot on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu 22.04/24.04
- Postfix
- Dovecot
- Dovecot LMTP, IMAP, POP3, and ManageSieve
- Pigeonhole Sieve
- Let's Encrypt / Certbot
- UFW
- DNS records for mail delivery
- SPF and DMARC
- Fail2ban

## Sources Consulted
- Postfix postconf(5) official documentation: https://www.postfix.org/postconf.5.html
- Postfix master(5) Ubuntu manpage: https://manpages.ubuntu.com/manpages/questing/man5/master.5.html
- Dovecot Postfix SASL how-to: https://doc.dovecot.org/2.3/configuration_manual/howto/postfix_and_dovecot_sasl/
- Dovecot passwd-file documentation: https://doc.dovecot.org/2.3/configuration_manual/authentication/passwd_file/
- Dovecot Pigeonhole Sieve configuration documentation: https://doc.dovecot.org/2.3/configuration_manual/sieve/configuration/
- Dovecot core SSL settings documentation: https://doc.dovecot.org/2.3/settings/core/
- Certbot standalone documentation: https://eff-certbot.readthedocs.io/en/stable/using.html
- Let's Encrypt HTTP-01 challenge documentation: https://letsencrypt.org/docs/challenge-types/
- RFC 5231, Sieve Relational Extension: https://www.rfc-editor.org/rfc/rfc5231.html
- Ubuntu 24.04 package metadata checked locally with apt-cache for postfix, dovecot-core, dovecot-sieve, dovecot-managesieved, certbot, swaks, mailutils, and fail2ban.

## Issues Found
- POP3 was installed, documented, and listed in firewall/quick-reference tables, but Dovecot was configured with only `imap lmtp sieve` and the POP3 listener was commented out. Updated the Dovecot protocol list and enabled the POP3/POP3S listeners so the configuration matches the stated IMAP/POP3 setup.
- The article described Dovecot delivery as LDA in architecture text while the Postfix configuration uses Dovecot LMTP. Updated the delivery wording and architecture labels to LMTP.
- Certbot standalone mode requires HTTP-01 validation on reachable TCP port 80, but the tutorial did not open port 80. Added the UFW rule where ports are listed and in the Certbot setup flow.
- The Postfix install command included `postfix-mysql` even though the guide uses hash maps, not MySQL maps. Removed the unnecessary package from the install command.
- The Dovecot auth service comment said auth was running as root for shadow access, but the configuration uses passwd-file authentication and sets `user = dovecot`. Corrected the comment and aligned `auth-worker` with the restricted passwd-file permissions.
- The Dovecot users file was created without restricted ownership/mode guidance. Added `root:dovecot` ownership and `640` permissions, and updated the helper script to preserve them after adding users.
- The Sieve configuration used the deprecated `sieve_dir` setting even though the modern `sieve = file:~/sieve;active=~/.dovecot.sieve` location was already present. Removed `sieve_dir`.
- The global Sieve spam-score example used `:value` with `i;ascii-numeric` but did not require `relational` and `comparator-i;ascii-numeric`. Added the required extensions to the script and Dovecot Sieve extension list.
- The Mermaid architecture diagram incorrectly showed IMAP traffic going to Postfix. Updated it so SMTP submission goes to Postfix and IMAP/POP3 goes to Dovecot.
- The DNS section referenced a later DKIM setup section that does not exist. Reworded it to say DKIM should be added if configured separately.

## Review Notes
The post is technically valid after the corrections above for the Ubuntu 24.04 package line, which currently provides Postfix 3.8.x and Dovecot 2.3.x. A future improvement would be to add a real DKIM signing section and spam/virus filtering if the post continues to describe the server as production-oriented.
