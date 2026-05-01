# Validation Summary: How to Configure Dovecot IMAP/POP3 with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dovecot
- IMAP
- POP3
- IPv6
- TLS/SSL
- OpenSSL
- UFW
- ip6tables
- systemd

## Sources Consulted
- Dovecot CE settings reference (`listen`): https://doc.dovecot.org/latest/core/summaries/settings.html
- Dovecot CE SSL/TLS configuration: https://doc.dovecot.org/2.4.1/core/config/ssl.html
- Dovecot CE service configuration (`inet_listener`, `ssl = yes` on IMAPS/POP3S listeners): https://doc.dovecot.org/main/core/config/service.html
- Dovecot CE testing guide (`doveconf`, listener validation, OpenSSL testing): https://doc.dovecot.org/main/core/admin/testing.html
- Dovecot CE 2.3 to 2.4 upgrade guide (renamed SSL settings): https://doc.dovecot.org/main/installation/upgrade/2.3-to-2.4.html
- OpenSSL `s_client` manual (`-connect` IPv6 bracket syntax, `-starttls imap`): https://docs.openssl.org/3.6/man1/openssl-s_client/
- Ubuntu `ufw` manpage (rule syntax and `comment` support): https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- RFC 3986 (IPv6 literals in URI/host:port contexts use brackets): https://www.rfc-editor.org/rfc/rfc3986.html

## Issues Found
- The TLS configuration block used the older `ssl_cert` and `ssl_key` settings with `</path` syntax. I updated these to `ssl_server_cert_file` and `ssl_server_key_file`, which are the current Dovecot 2.4 setting names and use direct file paths.
- The verification note claimed `ss` should show a specific `:::143`-style output. I changed this to describe the actual requirement, which is that IPv6 listeners appear on the target ports, because `ss` output formatting varies by platform and version.
- The STARTTLS verification command was described as testing "unencrypted" IMAP. I corrected the wording to "IMAP STARTTLS" because the command specifically tests upgrading the connection to TLS.
- The email-client example used brackets around a standalone IPv6 address. I changed it to `2001:db8::10`; bracket syntax is appropriate for host:port and URI contexts, such as the `openssl s_client -connect [addr]:port` examples.

## Review Notes
- Dovecot 2.3-era examples commonly use `ssl_cert` and `ssl_key`; current Dovecot 2.4 documentation renames these to `ssl_server_cert_file` and `ssl_server_key_file`.
- The `ufw` commands are valid as written. On systems where UFW has IPv6 support enabled, the rules are applied for IPv6 as well as IPv4.
- `ip6tables-save | tee /etc/ip6tables.rules` writes the current IPv6 rules to a file, but automatic restore at boot remains distro-specific and may require additional tooling outside the scope of this post.
