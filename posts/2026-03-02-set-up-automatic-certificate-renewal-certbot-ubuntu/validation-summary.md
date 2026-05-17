# Validation Summary: How to Set Up Automatic Certificate Renewal with Certbot on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Certbot (Let's Encrypt ACME client)
- Let's Encrypt (ACME v2 API)
- Ubuntu (systemd, cron, ufw)
- Nginx and Apache web servers
- OpenSSL (certificate inspection, s_client)
- systemd timers and journalctl
- Cloudflare DNS plugin (`python3-certbot-dns-cloudflare`)
- Bash scripting (deploy hooks, expiry checks)

## Sources Consulted
- Certbot user guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- Certbot CLI documentation (renew, certonly, dry-run, force-renewal, hooks)
- Let's Encrypt documentation on certificate lifetimes and rate limits: https://letsencrypt.org/docs/
- Certbot DNS plugin docs: https://eff-certbot.readthedocs.io/en/stable/using.html#dns-plugins
- Certbot renewal hooks documentation: https://eff-certbot.readthedocs.io/en/stable/using.html#renewing-certificates
- systemd.timer manpage and Ubuntu systemctl behavior
- OpenSSL `x509` and `s_client` manpages
- UFW manpage for allow/delete syntax

## Issues Found
No technical issues found.

Specific items verified as correct:
- Let's Encrypt certificate validity period of 90 days.
- Certbot's default renewal threshold of 30 days before expiry.
- Standard `certbot.timer` runs twice daily (with a randomized delay).
- Hook directory structure under `/etc/letsencrypt/renewal-hooks/` (`deploy/`, `post/`, `pre/`) and their semantics.
- Environment variables `RENEWED_DOMAINS` and `RENEWED_LINEAGE` are set by Certbot for deploy hooks.
- CLI flags: `--dry-run`, `--cert-name`, `--force-renewal`, `--standalone`, `--staging`, `--dns-cloudflare`, `--dns-cloudflare-credentials`.
- Renewal config file location `/etc/letsencrypt/renewal/<domain>.conf` and `[renewalparams]` section keys (`account`, `authenticator`, `installer`, `server`).
- Log file path `/var/log/letsencrypt/letsencrypt.log`.
- Cloudflare credentials file format using `dns_cloudflare_api_token` and recommended 600 permissions.
- ACME v2 directory URL `https://acme-v02.api.letsencrypt.org/directory`.

## Review Notes
- The command `sudo certbot renew --dry-run --staging` is technically valid but the `--staging` flag is redundant when `--dry-run` is used, since `--dry-run` already exercises the staging endpoint. Not incorrect, just redundant — left as-is to preserve author intent.
- The cross-platform date fallback (`date -j -f ...`) in the expiry-check script is BSD/macOS syntax and won't be exercised on Ubuntu, but it's harmless as a fallback.
- The example `[renewalparams]` block is a simplified excerpt — actual renewal config files also contain top-level keys (`version`, `archive_dir`, `cert`, `privkey`, `chain`, `fullchain`). The excerpt is appropriate for the explanation being made.
- Suggestion for future enhancement (not a correction): mention that on systems using snap-installed Certbot, the timer is provided by the snap and may be named differently; the systemctl examples assume the apt-installed `certbot` package.
