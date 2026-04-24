# Validation Summary: How to Configure ProFTPD to Listen on a Specific IPv4 Address

## Status
validated

## Post Type
Guide

## Technologies Covered
- ProFTPD
- FTP
- IPv4
- Linux service configuration
- `systemd`

## Sources Consulted
- ProFTPD `mod_core` directive reference: https://www.proftpd.org/docs/modules/mod_core.html
- ProFTPD virtual host how-to: https://www.proftpd.org/docs/howto/Vhost.html
- ProFTPD configuration file how-to: https://www.proftpd.org/docs/howto/ConfigFile.html
- ProFTPD logging documentation: https://www.proftpd.org/docs/modules/mod_log.html
- `proftpd(8)` Debian man page for `--configtest`: https://manpages.debian.org/testing/proftpd-basic/proftpd.8.en.html

## Issues Found
- The post used `ServerAddress` as the directive for binding the main server to a specific IPv4 address. ProFTPD documents `DefaultAddress` for the main server bind address, so the post was updated to use `DefaultAddress`.
- The post said ProFTPD would listen only on the specified IPv4 address, but ProFTPD's standalone daemon listens on all addresses by default unless `SocketBindTight on` is enabled. The basic example, introduction, description, and conclusion were updated to include `SocketBindTight on`.
- The multi-virtual-host example left the main server active, which can leave an extra listener or cause address/port collisions depending on the host's primary address. The example was updated to add `SocketBindTight on` and `Port 0` so only the defined virtual hosts listen.

## Review Notes
- `proftpd --configtest -c /etc/proftpd/proftpd.conf` is valid; the `proftpd(8)` man page documents both `-c/--config` and `-t/--configtest`.
- `Allow`/`Deny`, `AllowAll`, `DenyAll`, `MasqueradeAddress`, `PassivePorts`, `UseIPv6`, and `<VirtualHost>` usage in the post are technically consistent with ProFTPD documentation.
- Some packaged `systemd` units start ProFTPD with `--nodaemon`, which changes logging behavior; in those installations, administrators may need to check the journal in addition to any configured `SystemLog` file.
