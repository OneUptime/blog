# Validation Summary: How to Configure ProFTPD on Ubuntu Server

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ubuntu Server
- ProFTPD
- FTP and FTPS
- ProFTPD access-control directives
- ProFTPD `mod_tls`
- ProFTPD `mod_sql` and MySQL authentication
- UFW
- OpenSSL

## Sources Consulted
- ProFTPD configuration directive list: https://www.proftpd.org/docs/directives/configuration_full.html
- ProFTPD `mod_core` documentation: https://www.proftpd.org/docs/modules/mod_core.html
- ProFTPD `mod_tls` documentation: https://www.proftpd.org/docs/contrib/mod_tls.html
- ProFTPD `mod_sql` documentation: https://www.proftpd.org/docs/contrib/mod_sql.html
- ProFTPD authentication HOWTO: https://www.proftpd.org/docs/howto/Authentication.html
- ProFTPD logging HOWTO: https://www.proftpd.org/docs/howto/Logging.html
- ProFTPD configuration HOWTO: https://www.proftpd.org/docs/howto/ConfigFile.html
- ProFTPD `proftpd(8)` man page: https://www.mankier.com/8/proftpd
- Ubuntu package metadata from `apt-cache show proftpd-core`, `proftpd-mod-crypto`, and `proftpd-mod-mysql`

## Issues Found
- The install command used `sudo apt install proftpd`, but current Ubuntu package metadata exposes the daemon through `proftpd-core`. Changed the install command to `sudo apt install proftpd-core -y`.
- The post said the Ubuntu installer asks whether to run standalone or via inetd. Current Ubuntu packaging is systemd-oriented and did not support that statement, so the outdated note was removed.
- The basic configuration used `AllowSymlinks`, which is not a general ProFTPD directive. Replaced it with `ShowSymlinks on`, which matches the stated intent of showing symbolic links in listings.
- The first `<Limit LOGIN>` example was described as allowing authenticated users, but `DenyAll` denies logins unless overridden. Corrected the explanatory comment.
- The TLS section loaded `mod_tls` from `proftpd.conf` and omitted the Ubuntu module package. Added `proftpd-mod-crypto` installation and changed the edit target to `/etc/proftpd/modules.conf`.
- The certificate generation command wrote into `/etc/ssl/proftpd` before creating the directory. Moved `sudo mkdir -p /etc/ssl/proftpd` before the `openssl req` command.
- The TLS block repeated `TLSRequired on` under a session-reuse comment. Removed the duplicate directive and corrected the comment to mention `NoSessionReuseRequired` as a `TLSOptions` value.
- The SQL user example stored `SHA1('userpassword')` while the config used `SQLAuthTypes SHA1 Crypt`. Base `mod_sql` supports `Crypt`, `OpenSSL`, `Backend`, `Plaintext`, and `Empty`; `SHA1` requires `mod_sql_passwd`. Changed the example to generate a SHA-512 `crypt(3)` hash with `openssl passwd -6` and use `SQLAuthTypes Crypt`.
- The SQL virtual user used `/sbin/nologin` without disabling ProFTPD's valid-shell check. Added `RequireValidShell off` to the SQL configuration.
- The commented SQL debugging example used `SQLLog` incorrectly for a SELECT-style debugging query. Replaced it with the appropriate `SQLLogFile` directive.
- The monitoring section claimed a SIGHUP to the main PID kills a specific connection. Corrected the comment to say it reloads the daemon after configuration changes.
- The hardening comments for `AuthPAM on` and `AllowForeignAddress off` were inaccurate. Updated the comments to reflect what those directives actually do.

## Review Notes
The post is technically relevant and salvageable. The remaining examples are configuration-oriented and may still need site-specific adjustments, such as creating FTP home directories, setting filesystem ownership, and choosing production certificates instead of self-signed certificates.
