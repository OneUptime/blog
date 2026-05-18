# Validation Summary: How to Set Up Maltrail for Malicious Traffic Detection on Ubuntu

## Status
validated

## Post Type
Tutorial / Setup guide

## Technologies Covered
- Maltrail (https://github.com/stamparm/maltrail)
- Ubuntu (apt, systemd)
- Python 3 / pcapy-ng
- BPF capture filters (libpcap)
- systemd unit files

## Sources Consulted
- Maltrail upstream README: https://github.com/stamparm/maltrail/blob/master/README.md
- Maltrail reference config: https://github.com/stamparm/maltrail/blob/master/maltrail.conf
- Maltrail `sensor.py` (CLI options): https://github.com/stamparm/maltrail/blob/master/sensor.py
- Maltrail `server.py` (CLI options): https://github.com/stamparm/maltrail/blob/master/server.py
- Maltrail `core/settings.py` (valid directive names and validation): https://github.com/stamparm/maltrail/blob/master/core/settings.py
- Maltrail `trails/` directory layout: https://github.com/stamparm/maltrail/tree/master/trails
- Maltrail `misc/whitelist.txt`: https://github.com/stamparm/maltrail/blob/master/misc/whitelist.txt
- pcapy-ng on PyPI: https://pypi.org/project/pcapy-ng/

## Issues Found

The configuration and operational commands in the original post were largely fabricated. They did not match Maltrail's actual config syntax, did not use real directive names, and referenced a CLI flag that does not exist. All fixes were verified against the upstream source.

1. **Prerequisites: removed `python3-pcapy` from `apt install`.**
   The Debian/Ubuntu `python3-pcapy` package is the deprecated `pcapy` library that the Maltrail README explicitly warns against (it breaks on Python 3); only `pcapy-ng` from pip should be installed. Aligned the install command with the upstream Ubuntu/Debian quick-start (added `python-is-python3`, `procps`, `schedtool`).

2. **Configuration file: wrong syntax.**
   The post used INI-style `[Section]` headers and `KEY = VALUE` assignments. Maltrail's `maltrail.conf` uses whitespace-separated `KEY VALUE` pairs and `# [Section]` is just a comment. Rewrote the whole example to match the upstream file format. Added a sentence explaining the format so readers don't reintroduce `=`.

3. **Configuration file: invalid directive names.** Several directives in the original post do not exist in `core/settings.py`. Replaced/removed them:
   - `SERVER_ADDR` / `SERVER_PORT` → removed; the real directive for the sensor side is `LOG_SERVER host:port`, only needed for distributed setups. Shown commented out.
   - `UPDATE_SERVER = True` → wrong type and wrong semantics. `UPDATE_SERVER` actually takes a URL pointing at a remote server's `/trails` endpoint. Replaced with `UPDATE_PERIOD 86400` (the real way to control update cadence).
   - `PCAP_FILTER` → real name is `CAPTURE_FILTER`. Used the upstream default value.
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD` → not real directives. Auth is configured via the `USERS` block (`username:sha256(password):UID:filter_netmask(s)`).
   - `MAX_EVENTS` → does not exist. Removed.
   - `DATA_DIR` → does not exist. Removed.
   - `WHITELIST` → real name is `USER_WHITELIST`.

4. **Password hash generation: wrong command.**
   The Python one-liner using `hashlib.sha256` is functionally correct but doesn't match what upstream documents. Replaced with the upstream-documented `echo -n 'password' | sha256sum | cut -d " " -f 1`.

5. **`sudo python3 sensor.py --update` does not exist.**
   Verified against `sensor.py` — the only flags are `-c`, `-r`, `-p`, `-q`, `--console`, `--offline`, `--debug`, `--profile`. There is no `--update`. Removed the call. Updates happen automatically on sensor start and then every `UPDATE_PERIOD` seconds. Mentioned `--offline` as the way to skip an online pull.

6. **Trails directory description was wrong.**
   The post listed `static/` and `dynamic/`. The real layout is `static/` (bundled indicators), `feeds/` (Python modules that pull external lists), and `custom/` (user-provided). Also clarified that the consolidated trail set is written to `~/.maltrail/trails.csv` (overridable via `TRAILS_FILE`).

7. **Custom trails path was wrong.**
   The post wrote to `/opt/maltrail/trails/static/custom.txt`. The real custom-trails location is `CUSTOM_TRAILS_DIR` (default `./trails/custom`), so the file belongs in `/opt/maltrail/trails/custom/`. Also fixed the file format — Maltrail's trail files use `indicator  # comment`, not the CSV-like `indicator,type,info` format the post invented.

8. **Scheduled updates via cron was broken and unnecessary.**
   The cron job invoked the non-existent `sensor.py --update`. Removed the cron section and replaced it with a short note that the sensor handles refresh internally and that `UPDATE_PERIOD` is the knob to turn.

9. **Whitelist section: wrong directive and wrong file location.**
   Replaced `WHITELIST = ...` with the real `USER_WHITELIST` directive. Moved the whitelist file out of `trails/static/` (which is for bundled indicators) and into `misc/`, matching the upstream `misc/whitelist.txt` convention.

10. **Removed the `/var/maltrail` data directory creation step**, since there is no `DATA_DIR` directive and Maltrail does not require that path.

## Review Notes
- The post still uses `User=root` for the systemd units. This is fine for the sensor (it needs `CAP_NET_RAW`/`CAP_NET_ADMIN` to capture packets), and Maltrail's own docs use root in their quick-start, but a hardened deployment would grant capabilities to a dedicated user with `setcap 'CAP_NET_RAW+eip CAP_NET_ADMIN+eip'` and set `DISABLE_CHECK_SUDO true`. Left as-is to preserve the author's setup choice.
- The `awk '{print $9}'` example for counting alerts is a reasonable heuristic but depends on a specific log field layout; it may need adjustment for some event types. Left as-is — it's illustrative, not authoritative.
- The "dashboard auto-refreshes every 30 seconds" claim could not be independently confirmed against the upstream UI source in this review, but it's a minor UX detail and not a setup-blocking error. Left as-is.
- Maltrail's IP-feed events are gated by `IP_MINIMUM_FEEDS` (default 3); operators wondering why a known-bad IP doesn't trigger should check that directive. Not added to the post to avoid scope creep.
