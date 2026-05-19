# Validation Summary: How to Set Up a Captive Portal with nodogsplash on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- nodogsplash (captive portal daemon)
- ndsctl (control tool)
- hostapd / dnsmasq (referenced as prerequisites)
- iptables
- systemd
- nginx
- HTML/CSS (splash page)
- Python (small json.tool snippets)

## Sources Consulted
- nodogsplash GitHub repository: https://github.com/nodogsplash/nodogsplash
- Default `resources/nodogsplash.conf` from the repo (authoritative list of config directives)
- `src/conf.c` token table (authoritative list of accepted keywords)
- `src/ndsctl.c` usage output (authoritative ndsctl subcommands)
- `src/commandline.c` usage output (authoritative `nodogsplash` flags, e.g. `-v`, `-s`)
- `src/http_microhttpd.c` template-variable table (authoritative list of `$var` names)
- nodogsplash documentation: https://nodogsplash.readthedocs.io/en/latest/

## Issues Found

1. **Non-existent config directives.** The original post listed `ClientIdleTimeout`, `ClientForceTimeout`, `AuthenticationType`, and `Syslog` as nodogsplash directives. None of these are recognized by `src/conf.c`. Replaced with the real directives: `AuthIdleTimeout` (minutes), `SessionTimeout` (minutes), and removed `AuthenticationType` entirely (nodogsplash uses click-to-continue by default; custom auth is handled via `BinAuth`/`PreAuth`, not an "AuthenticationType" enum).

2. **`PreauthIdleTimeout` unit wrong.** Post claimed "seconds"; the directive (correct name `PreAuthIdleTimeout`) is documented in minutes. Fixed comment and used the canonical casing.

3. **`SyslogFacility` value type wrong.** Post used `SyslogFacility LOG_DAEMON`. The parser uses `sscanf("%d", ...)` — it expects a numeric facility value, not a symbolic name. Commented the line out and documented the numeric value (24 = LOG_DAEMON).

4. **`UploadLimit` / `DownloadLimit` ineffective without `TrafficControl`.** The defaults file shows these only take effect when `TrafficControl yes` is set. Added a note and commented them out so the example doesn't silently do nothing.

5. **`nodogsplash --version` flag wrong.** The binary's usage shows `-v` for version; there is no long `--version` flag. Updated.

6. **`ndsctl json status` / `ndsctl json clients` invalid.** The ndsctl `json` subcommand takes an optional `mac|ip|token` argument as a filter, not the literal strings "status" or "clients". Replaced with the correct forms (`ndsctl json` alone, or with a MAC argument).

7. **"Restart" snippet was a no-op.** The post wrote `sudo ndsctl` (no args) under "Restart after stopping" — that just prints usage. Replaced with `sudo systemctl start nodogsplash`, which is the correct way to restart after `ndsctl stop`.

8. **`$remainingtime` template variable doesn't exist.** The template-variable table in `http_microhttpd.c` does not include `$remainingtime`. Removed it from the splash page example and from the variable reference list. Added the variables that do exist (`$authtarget`, `$gatewaymac`, `$nclients`, `$maxclients`, `$uptime`, `$version`, `$token`).

9. **Misleading nginx port comment.** The post said "Configure nginx to serve the portal on port 2050 (nodogsplash default)" while the nginx server block listened on port 80. Clarified that 2050 is the default `GatewayPort` for nodogsplash's own internal server, while the nginx example serves auxiliary assets on port 80.

## Review Notes

- The systemd unit's `PIDFile=/var/run/nodogsplash.pid` is not strictly required — nodogsplash does not write a PID file by default. With `Type=forking` systemd will still track the forked main process, so this works in practice; left untouched to avoid scope creep.
- The post's `make install` workflow assumes the user has `libjson-c-dev` available (needed by the default `ENABLE_STATE_FILE=yes` path in the Makefile). It's not listed in the apt dependencies. A build will fail or silently disable state-file support without it. Worth mentioning in a future revision but kept out of scope here since the change interacts with optional build flags.
- The Architecture Overview claim that "iptables ... only works with HTTP (port 80) by default" is correct for the redirect mechanism; nodogsplash itself relies on OS-level Captive Portal Detection (CPD) probes, which are HTTP, to surface the splash page reliably.
- The whitelist-section comment in the config example shows `FirewallRuleSet preauthenticated-users { ... allow tcp/udp port 53 }` — this matches the default `nodogsplash.conf` shipped with the project, so it's correct.
