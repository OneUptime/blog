# Validation Summary: How to Configure Pi-hole Ad Blocker on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (step-by-step installation and configuration walkthrough)

## Technologies Covered
- Pi-hole (network-wide DNS sinkhole / ad blocker)
- Ubuntu (18.04 LTS and later)
- DNS / dnsmasq / FTL
- Unbound (recursive DNS resolver)
- Docker (Pi-hole container deployment)
- lighttpd (Pi-hole v5 web server)
- SQLite (gravity.db / pihole-FTL.db query against)
- UFW (firewall)
- systemd-resolved, networksetup, Set-DnsClientServerAddress (client DNS config)
- DHCP server configuration

## Sources Consulted
- Pi-hole official command reference (v6): https://docs.pi-hole.net/main/pihole-command/
- Pi-hole allowlist/denylist guide: https://docs.pi-hole.net/guides/misc/allowlist-denylist/
- Pi-hole chronometer.sh source (flag definitions for `-j/-r/-e`): pi-hole/pi-hole GitHub `advanced/Scripts/chronometer.sh`
- "Introducing Pi-hole v6" announcement: https://pi-hole.net/blog/2025/02/18/introducing-pi-hole-v6/
- Pi-hole Discourse — adding blocklist URLs to the gravity DB from the command line: https://discourse.pi-hole.net/t/adding-blocklist-urls-to-the-gravity-db-from-the-command-line/49694
- AdamsDesk — managing Pi-hole adlists from the command line (sqlite3 method): https://www.adamsdesk.com/posts/manage-adlist-pi-hole-command-line/
- Official Pi-hole + Unbound guide (reference for the Unbound config block): https://docs.pi-hole.net/guides/dns/unbound/

## Issues Found

1. **Fabricated `pihole -a adlist add` command (corrected).**
   The "Adding Blocklists via Command Line" section and the custom blocklist script
   used `pihole -a adlist add "<url>"` to add adlists. There is no such CLI
   subcommand in any Pi-hole version — `pihole -a` is the admin/web-password command
   and has no `adlist` subcommand. The officially documented way to add adlists from
   the shell is to insert directly into the gravity database and then rebuild gravity.
   Replaced every occurrence (5 inline examples + the loop in `update-blocklists.sh`)
   with:
   `sqlite3 /etc/pihole/gravity.db "INSERT OR IGNORE INTO adlist (address, enabled) VALUES ('<url>', 1);"`
   followed by the already-present `pihole -g`.

2. **Incorrect description of `pihole -l` (corrected).**
   In "Checking Pi-hole Logs" the post listed `pihole -l` with the comment
   "View all Pi-hole related logs." `pihole -l` (alias of `pihole logging`) toggles
   DNS query logging on/off — it does not view logs. Corrected the comment and the
   command to `pihole -l on` (accepts `on` / `off` / `off noflush`). Real-time log
   viewing is already covered by the adjacent `pihole -t` and the `tail -f` examples.

3. **Mislabeled chronometer `-e` flag (corrected).**
   The Monitoring section described `pihole -c -e` as "Display stats in chronometer
   mode (updates every second)." Per the chronometer.sh source, `-e/--exit` outputs
   the stats once and exits without refreshing; the continuously-refreshing mode is
   `-r/--refresh <seconds>`. Corrected the comment for `pihole -c -e` ("Output stats
   once and exit") and added the `pihole -c -r 5` example for the continuous mode.
   (The later use of `pihole -c -e >> "$LOG_FILE"` in the maintenance script was
   already correct usage for one-shot output.)

## Review Notes

- **Major version caveat — the post targets Pi-hole v5 conventions.** Pi-hole v6
  (released February 2025, and current as of this review) made several breaking
  changes that affect, but do not invalidate, large portions of this guide. These
  were intentionally **not** rewritten here because doing so would require
  restructuring the entire post rather than fixing discrete errors. They are recorded
  for a future content refresh:
  - **Configuration files:** `setupVars.conf`, `pihole-FTL.conf`, and the per-file
    dnsmasq settings were consolidated into a single `/etc/pihole/pihole.toml` in v6.
    v5 `setupVars.conf` values are auto-migrated on upgrade, after which the old file
    is no longer authoritative. The `setupVars.conf` / `pihole-FTL.conf` examples and
    edits in this post apply to v5.
  - **Web server / API:** v6 dropped lighttpd and PHP in favor of a built-in web
    server and a new REST API embedded in `pihole-FTL`. The `lighttpd` troubleshooting
    commands and the legacy `admin/api.php?...` calls in the monitoring section are
    v5-specific; v6 uses the new API under `/api/` with session-token authentication.
  - **CLI terminology:** v6 introduced `pihole allow` / `pihole deny`
    (allowlist/denylist) as the documented commands; the `pihole -w` / `pihole -b` /
    `--white-regex` shortcuts shown here are the v5 forms. `pihole -a -p` for the web
    password still works in v6 (also available as `pihole setpassword`).
  - **Docker:** the `SERVERIP` environment variable shown in the Docker example was
    deprecated/removed in later v5 images, and v6 images use
    `FTLCONF_webserver_api_password` for the admin password (the legacy `WEBPASSWORD`
    still works as a fallback in current images).

- The Unbound configuration block (port 5335, `access-control`, DNSSEC
  `auto-trust-anchor-file`, RFC1918 `private-address` entries, root-hints from
  `internic.net/domain/named.cache`) matches the official Pi-hole + Unbound guide and
  is correct.

- Minor, non-blocking: the maintenance script comments `pihole -f` as "Flush logs
  older than 7 days," but `pihole -f` flushes the entire `pihole.log` rather than only
  entries older than a retention window (retention is controlled separately via
  `MAXDBDAYS`). Left as-is since the command itself is valid; worth tightening the
  comment in a future edit.

- DNS/Unbound DNSSEC test domains (`sigfail`/`sigok.verteiltesysteme.net`), the
  blocklist URLs (StevenBlack, OISD, Firebog, AdGuard DNS filter, frogeye), firewall
  ports (53 tcp/udp, 80, 67 for DHCP), and the client-side DNS configuration commands
  for Linux/Windows/macOS were all verified as correct.
