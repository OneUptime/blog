# Validation Summary: How to Set Up TLS Certificate Rotation on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (apt package management)
- Certbot / Let's Encrypt (ACME client)
- Nginx (`nginx -t`, `systemctl reload nginx`)
- Apache HTTP Server (`apache2ctl configtest`)
- systemd (services, timers, `OnCalendar`, `RandomizedDelaySec`, `Persistent`, `Type=oneshot`)
- OpenSSL (`genrsa`, `req`, `x509`, `verify`, `s_client`)
- Bash scripting (process substitution, parameter expansion, `set -uo pipefail`, `timeout`)
- cron (`/etc/cron.d/` user-field format)

## Sources Consulted
- Certbot user guide and CLI reference — https://eff-certbot.readthedocs.io/en/stable/using.html (renewal hooks, `certonly --standalone`, `renew --dry-run`, `--post-hook`)
- Certbot renewal hooks documentation — https://eff-certbot.readthedocs.io/en/stable/using.html#renewing-certificates (confirms `/etc/letsencrypt/renewal-hooks/{pre,deploy,post}/` directories)
- systemd.timer man page — `OnCalendar`, `RandomizedDelaySec`, `Persistent`, `WantedBy=timers.target` syntax
- systemd.service man page — `Type=oneshot` permits multiple `ExecStart=` entries that run sequentially
- Nginx documentation — `nginx -t` (test config), `systemctl reload nginx` (graceful reload on SIGHUP)
- Apache HTTP Server documentation — `apache2ctl configtest` (Ubuntu/Debian wrapper)
- OpenSSL man pages — `openssl-genrsa(1)`, `openssl-req(1)`, `openssl-x509(1)` (including `-extfile` behavior with the unnamed default section), `openssl-verify(1)`, `openssl-s_client(1)` (`-servername` for SNI)
- crontab(5) — `/etc/cron.d/` files include a user field
- Ubuntu certbot package (`/lib/systemd/system/certbot.timer`) — default `OnCalendar=*-*-* 00,12:00:00`, `RandomizedDelaySec=43200`, `Persistent=true` matches the post

## Issues Found
No technical issues found.

## Review Notes
- The custom-CA rotation script uses `set -uo pipefail` without `-e`. This is a deliberate choice (the script checks `$?` after `openssl verify`), but a failure in earlier steps like `openssl genrsa` or `openssl req` will not abort the script. Adding `-e` would make the script more robust; this is a future improvement, not an error.
- `chmod 640` on the private key (`$KEY_PATH.new`) is acceptable when a service group needs read access, but `600` is stricter. Either is defensible depending on deployment model.
- The `-extfile <(printf "subjectAltName=DNS:$DOMAIN")` form relies on OpenSSL reading extensions from the unnamed default section when `-extensions` is not given; this works in modern OpenSSL (1.1.1+ / 3.x) shipped on supported Ubuntu releases.
- The post correctly notes that Certbot ships its own `certbot.timer` on current Ubuntu releases; the manual unit example is a fallback and intentionally mirrors the packaged timer's schedule.
- The custom-CA script's final verification step opens a TLS connection to `$DOMAIN:443`, which assumes the service is reachable on that host/port from the rotating host. Worth flagging in a future revision but not technically wrong.
