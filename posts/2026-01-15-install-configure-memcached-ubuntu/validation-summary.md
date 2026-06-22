# Validation Summary: How to Install and Configure Memcached on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (installation, configuration, and operations walkthrough)

## Technologies Covered
- Memcached (server and configuration)
- Ubuntu (20.04 / 22.04 / 24.04, apt, systemd, ufw)
- libmemcached-tools (`memcstat`)
- SASL authentication (`sasl2-bin`, `saslpasswd2`)
- PHP `Memcached` extension and session handler
- Python clients (`python-memcached`, `pymemcache`)
- Prometheus `memcached_exporter`
- Networking/diagnostic tools (`telnet`, `nc`, `ss`)

## Sources Consulted
- Memcached official docs — Configuring: https://docs.memcached.org/serverguide/configuring/
- Memcached man page (`doc/memcached.1`): https://github.com/memcached/memcached/blob/master/doc/memcached.1
- Memcached wiki — ConfiguringServer: https://github.com/memcached/memcached/wiki/ConfiguringServer
- pymemcache docs (Client.set `expire` parameter): https://pymemcache.readthedocs.io/
- PHP Memcached extension manual: https://www.php.net/manual/en/book.memcached.php
- prometheus/memcached_exporter releases (v0.14.0, default port 9150): https://github.com/prometheus/memcached_exporter

## Issues Found
1. **Incorrect "Enable Multiple Ports" configuration.** The post instructed listing two `-p` lines (`-p 11211` / `-p 11212`) to listen on multiple ports. Memcached's `-p` flag accepts a single TCP port; a second `-p` overrides the first rather than adding a port. Per the memcached man page, multiple listen ports are configured with `-l <host:port>` repeated (or comma-separated). Changed the snippet to use `-l 127.0.0.1:11211` / `-l 127.0.0.1:11212` and added a note explaining why a second `-p` does not work.

2. **Misleading log directive comment.** The default-config snippet labeled `logfile /var/log/memcached.log` with the comment "Log to syslog." The `logfile` directive writes to a file, not syslog. Updated the comment to "Log to a file."

## Review Notes
- The protocol test commands (`set mykey 0 900 5` followed by a 5-byte `hello`, `get`, `delete`, `stats`) are correct, including byte counts.
- The `pymemcache` example is accurate: `base.Client((host, port))`, `set(..., expire=3600)`, and `get()` returning bytes are all current behavior.
- The PHP examples (`addServer`/`addServers` with weights, `OPT_DISTRIBUTION`/`OPT_LIBKETAMA_COMPATIBLE`, session handler config) are correct against the PHP `Memcached` extension API.
- The default thread count (`-t 4`) and default max object size (`-I 1m`) statements are accurate.
- Version-specific caveat (not changed, as it is example code): PHP-FPM service name `php8.3-fpm` and path `/etc/php/8.3/...` match Ubuntu 24.04; users on 20.04/22.04 should substitute their PHP version (e.g., 7.4 / 8.1).
- Operational caveat worth noting for readers: on Ubuntu, memcached is started via the `systemd-memcached-wrapper` script, which can ignore the `logfile` directive — logs are then visible via `journalctl -u memcached` (the post already shows this command in Troubleshooting).
- SASL (`-S`) requires a memcached build compiled with SASL support; the current Ubuntu package includes it, so the instructions are valid.
