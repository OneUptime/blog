# Validation Summary: How to Install Mailcow Dockerized on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Mailcow Dockerized (mail server suite)
- Postfix, Dovecot, SOGo, Rspamd, ClamAV, Nginx, Redis, MariaDB, Unbound, ACME, Netfilter
- Docker / Docker Compose
- Ubuntu 22.04 / 24.04 LTS
- UFW firewall
- DNS records (A, MX, SPF, DKIM, DMARC, PTR, CNAME, SRV)
- Let's Encrypt / ACME
- IMAP/POP3/SMTP protocols

## Sources Consulted
- Mailcow Dockerized GitHub repository — helper-scripts directory: https://github.com/mailcow/mailcow-dockerized/tree/master/helper-scripts
- Mailcow system prerequisites documentation: https://docs.mailcow.email/getstarted/prerequisite-system/
- Mailcow Advanced SSL documentation: https://docs.mailcow.email/post_installation/firststeps-ssl/
- Mailcow 2025-01 release notes (Solr → Flatcurve migration): https://mailcow.email/posts/2025/release-2025-01/
- Mailcow full-text search documentation: https://docs.mailcow.email/manual-guides/Dovecot/u_e-dovecot-fts/
- Docker official install docs for Ubuntu: https://docs.docker.com/engine/install/ubuntu/

## Issues Found
1. **Incorrect RAM requirement.** The post stated "RAM: 4 GB minimum (6+ GB recommended)". Official mailcow prerequisites specify a minimum of 6 GiB + 1 GiB swap. Updated to "6 GB minimum + 1 GB swap (8+ GB recommended for production)".

2. **Wrong admin-reset helper script name.** The post referenced `./helper-scripts/admin_reset_password.sh`, which does not exist. The actual script is `mailcow-reset-admin.sh`. Corrected.

3. **Outdated Solr / `SKIP_SOLR` configuration.** Solr was removed from mailcow in the 2025-01 release and replaced by Flatcurve (integrated into Dovecot). The `SKIP_SOLR` variable no longer exists in `mailcow.conf`; the relevant variable is now `SKIP_FTS`. Updated both occurrences (the main config section and the memory-optimization section) to use `SKIP_FTS` and Flatcurve terminology.

4. **Incorrect ACME certificate renewal/status commands.** The post used `docker compose exec acme-mailcow /etc/cron.daily/acme` with `--status` and `--force` flags, which do not exist in mailcow's acme container. The documented method to force renewal is `touch data/assets/ssl/force_renew` followed by `docker compose restart acme-mailcow`. Status is checked via the acme-mailcow container logs. Updated all three affected commands (Section 8 force-renewal, Section 8 status check, Section 12 SSL troubleshooting).

5. **Minor descriptive fixes.**
   - "Netfilter: Fail2ban integration" reworded to "Built-in fail2ban-like brute-force protection" — mailcow uses its own netfilter-based implementation rather than the Fail2ban package.
   - The UFW comment header that labeled port 4190 as "SOGo/CalDAV/CardDAV" was corrected to "ManageSieve", since 4190 is ManageSieve (CalDAV/CardDAV run over 443).

## Review Notes
- The remaining content is technically accurate: the Docker repository install steps, DNS record examples (including the correct reverse PTR `10.113.0.203.in-addr.arpa` for `203.0.113.10` and the `v=DKIM1` selector), the default admin credentials (`admin` / `moohoo`), the `generate_config.sh` workflow, `mailcow.conf` options, container names (e.g. `mysql-mailcow` despite running MariaDB), the `backup_and_restore.sh` usage, `update.sh` flags, Rspamd controller port (11334), and the mail client port/security settings all check out against current mailcow documentation.
- Version caveat: mailcow tracks a rolling `master` branch, so UI navigation paths and exact `mailcow.conf` variables can shift over time. The config snippet was current as of the 2025/2026 mailcow releases at review time.
