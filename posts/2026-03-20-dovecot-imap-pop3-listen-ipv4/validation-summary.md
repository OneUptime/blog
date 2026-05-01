# Validation Summary: How to Configure Dovecot IMAP/POP3 to Listen on IPv4 Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dovecot CE
- IMAP
- POP3
- ManageSieve
- TLS/SSL
- Linux listener verification with `ss` and `openssl`

## Sources Consulted
- Dovecot CE All Settings: `listen`, `ssl`, `ssl_min_protocol`, `ssl_cipher_list` - https://doc.dovecot.org/latest/core/summaries/settings.html
- Dovecot CE Service Configuration: `inet_listener`, `inet_listener_port`, `inet_listener_ssl` - https://doc.dovecot.org/2.4.1/core/config/service.html
- Dovecot CE SSL/TLS Configuration: `ssl_server_cert_file` and `ssl_server_key_file` - https://doc.dovecot.org/2.4.1/core/config/ssl.html
- Dovecot CE Upgrade Guide 2.3 to 2.4: renamed SSL settings and `inet_listener { address }` replaced by `listen` - https://doc.dovecot.org/2.4.1/installation/upgrade/2.3-to-2.4.html
- Dovecot CE `doveconf(1)` man page: `doveconf -n` usage - https://doc.dovecot.org/2.4.0/core/man/doveconf.1.html
- Dovecot CE ManageSieve documentation: service name and default port 4190 - https://doc.dovecot.org/2.4.1/core/config/sieve/managesieve.html

## Issues Found
- The post incorrectly described `listen = *` as the default while also claiming it listened on IPv6. I changed this to `listen = *, ::` for the default dual-stack behavior and kept `listen = *` for IPv4-only listening, which matches the official `listen` setting documentation.
- The IPv4-only section suggested disabling IPv6 at the OS level or using `0.0.0.0` as the main approach. I corrected the examples to use the documented Dovecot form `listen = *` for IPv4-only listener configuration and removed the stray incomplete outgoing-LMTP comment that did not provide a valid setting.
- The per-service listener examples used `address =` inside `inet_listener` blocks. I changed these to `listen =`, which is the current documented syntax in Dovecot 2.4.
- The SSL example used older setting names `ssl_cert` and `ssl_key`. I updated them to `ssl_server_cert_file` and `ssl_server_key_file`, which are the current Dovecot 2.4 names.
- The verification section used `dovecot -n`, but the documented configuration-dump utility is `doveconf -n`. I updated the command accordingly.
- The verification steps checked sockets before reloading Dovecot. I moved `systemctl reload dovecot` before the listener and TLS checks so the commands validate the newly applied configuration rather than the previous runtime state.
- The conclusion referred to per-listener `address` fields. I updated that wording to match the corrected `listen` syntax used in the examples.

## Review Notes
- The article is now aligned with current Dovecot 2.4-style configuration names and listener syntax. Older 2.3-era guides commonly use `ssl_cert`/`ssl_key` and `inet_listener { address }`, but those are not the current names documented for 2.4.
- The ManageSieve example is technically valid for listener binding, but readers also need ManageSieve enabled in Dovecot if they intend to use that service.
- Sample `ss` output can vary slightly by distribution and kernel version; the important validation point is that Dovecot is bound to the intended local addresses and ports.
