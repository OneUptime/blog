# Validation Summary: How to Set Up ntopng for Network Traffic Analysis on Ubuntu

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- ntopng (Community Edition)
- nProbe (NetFlow/IPFIX collector)
- PF_RING (kernel-level packet capture)
- MaxMind GeoLite2 / geoipupdate
- Ubuntu 22.04 / 24.04
- Redis (session storage)
- UFW (firewall configuration)
- systemd (service management)
- ntopng REST API v2
- ZMQ (nProbe ↔ ntopng transport)

## Sources Consulted
- ntopng Command Line Options documentation: https://www.ntop.org/guides/ntopng/cli_options/cli_options.html
- ntopng REST API v2 Specification: https://www.ntop.org/guides/ntopng/api/rest/api_v2.html
- nProbe CLI Options documentation: https://www.ntop.org/guides/nprobe/cli_options.html
- ntop Software Installation page: https://www.ntop.org/support/documentation/software-installation/
- Ubuntu manpage for ntopng: https://manpages.ubuntu.com/manpages/jammy/man8/ntopng.8.html
- ntopng User Authentication docs: https://www.ntop.org/guides/ntopng/advanced_features/authentication.html

## Issues Found

1. **`-A=strongpassword` is not a valid way to set the admin password.** The `-A` / `--users-file` flag specifies the path to a users configuration file, not a password literal. ntopng has no CLI option to set the admin password directly; the default `admin/admin` credentials are changed on first login through the web UI, or by editing the users file with an MD5-hashed password.
   - Fix: Removed the `-A=strongpassword` line and its misleading comments from the configuration snippet.

2. **`--lifetime=7` / `--lifetime=3` is not a valid ntopng option.** No such CLI flag exists for controlling data retention in days.
   - Fix: Removed both occurrences from the configuration snippets.

3. **`--cpu-affinity=0,1,2,3` is not a valid ntopng option.** The correct flag for binding ntopng threads to specific CPU cores is `--core-affinity`.
   - Fix: Replaced `--cpu-affinity` with `--core-affinity` and updated the inline comment.

4. **`--geoip-database-path=/var/lib/GeoIP` is not a valid flag.** The correct flag for specifying the GeoIP database directory is `--geoip-dir`.
   - Fix: Replaced `--geoip-database-path` with `--geoip-dir`.

5. **`--local-networks-and-hosts 192.168.1.0/24` is not a valid ntopng option.** No such flag exists; local networks are already configured with the `-m` / `--local-networks` flag earlier in the configuration. The misleading comment ("Set disk usage limit for the data directory") also did not match the flag.
   - Fix: Removed the line entirely from the performance tuning snippet.

6. **nProbe `-P=tcp://127.0.0.1:5556` is wrong.** The nProbe `-P` flag specifies the directory where text-format flows are dumped to disk. To forward flows to ntopng via ZMQ, the correct flag is `--zmq <endpoint>` (or `--ntopng zmq://...`).
   - Fix: Replaced `-P=tcp://127.0.0.1:5556` with `--zmq=tcp://127.0.0.1:5556`.

## Review Notes
- The repository URLs for `apt-ntop-stable.deb` (22.04 and 24.04) match ntop's official package paths.
- ntopng default web port is 3000 over HTTP; the `-w` / `--http-port` flag is correct as documented. HTTPS uses `-W` / `--https-port` (default 3001) — out of scope here.
- The REST API v2 paths (`/lua/rest/v2/get/host/active.lua`, `/lua/rest/v2/get/flow/active.lua`, `/lua/rest/v2/get/interface/data.lua`, `/lua/rest/v2/get/interface/top_hosts.lua`) are kept as-is — these endpoints exist in the ntopng source for Community Edition (Pro/Enterprise variants live under `/lua/pro/rest/v2/`). Future readers on newer ntopng versions should consult the version-matching REST API docs since endpoint surface evolves between releases.
- The `pfring` / `pfring-dkms` packages are correctly named in the ntop apt repository.
- The "Alerts" Community vs. Enterprise note is slightly imprecise — Community Edition does provide alerting features (with limitations on behavioral/threat-intelligence alerts); this is a minor wording nuance, not a technical error, and was left unchanged.
- The "ntopng 6.x documentation" referenced is the current generation; flag names verified above are stable across recent 5.x/6.x releases.
