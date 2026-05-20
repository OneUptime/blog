# Validation Summary: How to Configure Certificate Auto-Renewal with systemd Timers on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- systemd services and timers
- Certbot
- acme.sh
- OpenSSL
- Bash
- Nginx reloads
- journald / journalctl

## Sources Consulted
- systemd.timer official manual: https://www.freedesktop.org/software/systemd/man/systemd.timer.html
- systemd.unit official manual: https://www.freedesktop.org/software/systemd/man/systemd.unit.html
- systemd.exec official manual: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- systemctl official manual: https://www.freedesktop.org/software/systemd/man/systemctl.html
- systemd.time official manual: https://www.freedesktop.org/software/systemd/man/systemd.time.html
- Certbot official documentation, renewing certificates and automated renewals: https://eff-certbot.readthedocs.io/en/stable/using.html#renewing-certificates
- Let's Encrypt integration guide, renewal recommendations: https://letsencrypt.org/ca/docs/integration-guide/
- acme.sh official README: https://github.com/acmesh-official/acme.sh
- OpenSSL s_client official manual: https://docs.openssl.org/3.0/man1/openssl-s_client/
- OpenSSL x509 official manual: https://docs.openssl.org/3.0/man1/openssl-x509/

## Issues Found
- The post said `AccuracySec` adds randomization to spread load. `AccuracySec` is primarily a coalescing/accuracy window; `RandomizedDelaySec` is the setting intended to spread timer executions. Updated the explanation.
- The post implied missed runs are generally retried at boot. systemd only provides this catch-up behavior for `OnCalendar` timers when `Persistent=true` is set. Updated the wording.
- The post said timer and service units must have the same base name. That is the default and recommended pattern, but timers can activate another unit with `Unit=`. Updated the explanation.
- The `acme-renew.timer` example included `Wants=acme-renew.service`, which can start the renewal service when the timer unit itself is started. Removed the dependency because the timer activates the matching service by default.
- The `acme-renew.timer` example combined `AccuracySec=1h` and `RandomizedDelaySec=1h` while describing a 02:00-03:00 randomized window. Because systemd applies the randomized delay and may then coalesce within the accuracy window, that combination can run later than intended. Changed `AccuracySec` to `1us` to match systemd's documented approach for stretching events across a randomized interval.
- The custom script logged Certbot success as a renewal completion even when `certbot renew` may only check and take no action. Updated the message to "renewal check completed successfully."
- The custom script initialized `NGINX_RELOADED=false` but never changed it. Removed the unused guard and updated the comment so the reload behavior is accurate.
- The sample `systemctl list-timers` output omitted the `ACTIVATES` column shown by current systemd. Updated the sample row.

## Review Notes
- The Certbot and acme.sh renewal commands are syntactically valid for current releases.
- The OpenSSL expiry check is appropriate for Ubuntu because it relies on GNU `date -d`; it is less portable to non-GNU systems.
- The custom script reloads nginx after every successful check, even if no certificate was actually renewed. This is technically valid but could be refined in the future by using Certbot deploy hooks or acme.sh reload commands to reload only after actual renewal.
