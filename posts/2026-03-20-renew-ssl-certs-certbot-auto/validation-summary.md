# Validation Summary: How to Renew SSL/TLS Certificates Automatically with Certbot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Certbot
- Let's Encrypt
- SSL/TLS certificates
- systemd timers and cron
- Bash shell scripting
- OpenSSL

## Sources Consulted
- Certbot User Guide: Renewing certificates, hooks, automated renewals, and reconfiguration — https://eff-certbot.readthedocs.io/en/latest/using.html
- Certbot command reference / man page — https://eff-certbot.readthedocs.io/en/latest/man/certbot.html
- Certbot installation instructions — https://certbot.eff.org/instructions
- Let's Encrypt: Why ninety-day lifetimes? — https://letsencrypt.org/2015/11/09/why-90-days
- Let's Encrypt: Decreasing Certificate Lifetimes to 45 Days — https://letsencrypt.org/2025/12/02/from-90-to-45

## Issues Found

1. **Renewal timing was described too absolutely.** The original text said Certbot "runs twice daily and renews certificates 30 days before expiry." Current Certbot behavior is that packaging determines the schedule, and Certbot 4.0+ renews when less than one-third of the certificate lifetime remains. Updated the wording to describe scheduled renewal more accurately and to scope the "~30 days" statement to current 90-day certificates.

2. **The timer verification commands were too package-specific and the cron check was incomplete.** Official Certbot guidance recommends checking `systemctl list-timers` and common cron locations rather than assuming a specific timer name or root crontab entry. Updated Step 1 to use the documented generic checks.

3. **The hook file creation commands would fail as written on a normal shell.** `cat > /etc/...` performs the redirection in the current shell, so it would not be elevated by `sudo`, and one `chmod` command also lacked `sudo`. Replaced these with `sudo tee ... << 'EOF'` and `sudo chmod +x ...`.

4. **The renewal failure hook used the wrong signal for failure detection.** `$?` at the start of a hook script does not represent the renewal result. Certbot documents `FAILED_DOMAINS` and `RENEWED_DOMAINS` for post-renewal hooks. Updated the script to check `FAILED_DOMAINS`, added the missing post-hook directory creation, and kept the alert logic intact.

5. **The renewal configuration section implied manual editing as the normal way to change renewal behavior.** Current Certbot documentation recommends `certbot reconfigure` and explicitly warns that editing files under `/etc/letsencrypt/renewal/` can break renewals. Changed the example from "edit" to "view" and added a note to prefer `certbot reconfigure`.

6. **The OpenSSL expiry-check snippet could block waiting for stdin.** Added `</dev/null` to the `openssl s_client` pipeline so the example works more reliably in shell usage.

## Review Notes
- The post is accurate as of April 23, 2026, for standard Let's Encrypt 90-day certificates. Let's Encrypt has announced shorter certificate lifetimes beginning May 13, 2026 for the opt-in `tlsserver` ACME profile, with broader lifetime reductions scheduled later, so the opening lifetime guidance may need another update in the future.
- The alerting examples assume supporting tools such as `mail` and `curl` are installed and configured on the host.
- The expiry-monitoring script uses GNU `date -d`, so the example is Linux-oriented rather than portable to all Unix-like systems.
