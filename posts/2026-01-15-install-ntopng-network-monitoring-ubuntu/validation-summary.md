# Validation Summary: How to Install ntopng for Network Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation and configuration guide

## Technologies Covered
- ntopng (network traffic monitoring)
- nDPI (deep packet inspection)
- nProbe (NetFlow/sFlow/IPFIX flow collector)
- Ubuntu (apt, systemd, UFW, ethtool, ip/promiscuous mode)
- InfluxDB 2.x (time-series storage, Flux)
- SNMP (device monitoring)
- HTTPS/SSL (OpenSSL, Let's Encrypt/Certbot)
- LDAP / Active Directory authentication
- ntopng REST API v2 (Python + Bash clients)

## Sources Consulted
- ntopng command-line options — https://www.ntop.org/guides/ntopng/cli_options/cli_options.html
- ntopng man page (full option list) — https://raw.githubusercontent.com/ntop/ntopng/dev/ntopng.8
- ntopng Timeseries documentation — https://www.ntop.org/guides/ntopng/basic_concepts/timeseries.html
- ntopng InfluxDB documentation — https://www.ntop.org/guides/ntopng/user_interface/system_interface/health/influxdb.html
- ntopng SSL/HTTPS documentation — https://www.ntop.org/guides/ntopng/advanced_features/ssl.html
- ntop apt-stable repository — https://packages.ntop.org/apt-stable/
- nProbe command-line options — https://www.ntop.org/guides/nprobe/cli_options.html

## Issues Found
The post was technically detailed but repeatedly presented ntopng/nProbe **features that are configured through the web interface as if they were command-line / configuration-file flags**. Many of those flags do not exist. Each was corrected against the official ntopng man page and documentation:

1. **Repository setup** — The first download pulled the Debian `bookworm` repository package inside an Ubuntu guide, and the comment called the `.deb` a "GPG key." Removed the Debian entry, fixed the comment (the `.deb` is the repository-definition package that includes the signing key), and switched to `sudo apt install ./apt-ntop-stable.deb` (which also resolves dependencies) instead of `dpkg -i`.

2. **Ubuntu version claim** — Changed "supports Ubuntu 20.04, 22.04, and 24.04" to "22.04 and 24.04," matching what the official `apt-stable` repository actually ships.

3. **`-G` comment** — Was labeled "Community edition settings"; `-G` is `--pid-path`. Corrected the comment.

4. **Application detection** — `--enable-tls-quic-hosts-detection` does not exist; removed it. `--protocols-file` is not a valid flag; the correct option for a custom nDPI protocol file is `-p` / `--ndpi-protocols`. Also corrected the custom-protocols file format: the post used `protocol_name host:port`, but nDPI uses `<matcher>@<ProtocolName>` (e.g. `ip:192.168.1.100@internal_erp`).

5. **Email/SMTP alerts** — `--smtp-server`, `--smtp-port`, `--smtp-username`, `--smtp-password`, `--sender-address` are not ntopng options. Email is set up via Notifications > Endpoints/Recipients in the web UI. Rewrote the block accordingly.

6. **InfluxDB integration** — `--ts-driver`, `--ts-host`, `--ts-organization`, `--ts-bucket`, `--ts-token`, and the `--enable-*-timeseries` / `--enable-users-login` flags do not exist. InfluxDB timeseries export is configured under Settings > Preferences > Timeseries in the web UI. Rewrote the block.

7. **SNMP** — `--snmp-community` and `--snmp-default-version` are not ntopng options; SNMP is configured per device in the web UI. Rewrote the block.

8. **nProbe NetFlow collector** — Removed `--netflow-version=9` (the collector auto-detects the NetFlow/IPFIX version) and `--dont-drop-unknown-template` (not a valid option). Kept the valid `-i=none`, `--collector-port`, `--zmq`, and `-G`.

9. **nProbe sFlow collector** — Removed `--collector-protocol=sflow` and `--sflow-sample-rate=1024` (neither exists); nProbe auto-detects sFlow on the collector port.

10. **HTTPS / certificates** — ntopng does not accept `--https-cert` / `--https-key`. It reads a **single combined PEM file** (private key + certificate) named `ntopng-cert.pem` from `httpdocs/ssl/` under the share directory. Rewrote the self-signed and Let's Encrypt steps to produce/install that combined file at `/usr/share/ntopng/httpdocs/ssl/ntopng-cert.pem`, removed the non-existent `--http-redirect-https`, and replaced the cert-path flags with the note that `-W` alone enables HTTPS (plus `-w=0` to disable HTTP). Updated the troubleshooting section to reference the corrected certificate path.

11. **LDAP authentication** — `--ldap-*` flags do not exist; LDAP/AD auth is configured in the web UI (and requires an ntopng Enterprise license). Rewrote the block and added the licensing caveat.

12. **Session management** — `--user-session-timeout`, `--max-sessions-per-user`, `--enable-login-tracking` do not exist. Session/idle timeout is set in the web UI; the one valid related flag, `-q` / `--disable-autologout`, is now shown instead.

13. **Troubleshooting: config validation** — `ntopng --check-config -F /etc/ntopng/ntopng.conf` is invalid (`--check-config` does not exist and `-F` is `--dump-flows`). Replaced with running ntopng in the foreground against the config file to surface errors.

14. **Troubleshooting: High CPU** — `--disable-dns-resolution`, `--disable-host-name-resolution`, `--disable-minute-timeseries`, `--host-idle-timeout`, `--flow-idle-timeout` are not valid flags. Replaced the DNS items with `--dns-mode=3` and pointed timeseries-resolution / idle-timeout tuning to the web UI.

## Review Notes
- The valid ntopng flags used elsewhere in the post were verified and left intact: `-i`, `-w`, `-W`, `-d`, `-m`/`--local-networks`, `-n`/`--dns-mode`, `-l`/`--disable-login`, `-G`/`--pid-path`, `-X`/`--max-num-flows`, `-x`/`--max-num-hosts`, `-p`/`--ndpi-protocols`, `-q`/`--disable-autologout`, and `-v`/`--verbose`. The ntopng config-file syntax (`-flag=value` per line) is correct, as are the default ports (HTTP 3000, HTTPS 3001), default credentials (admin/admin), and the ZMQ flow-collection interface syntax (`-i=tcp://...`).
- The REST API v2 examples, Python client, Bash client, and Lua callback are syntactically reasonable and the endpoint paths (`/lua/rest/v2/...`) follow ntopng conventions. Exact endpoint names (e.g. `get/host/top_talkers.lua`) can vary slightly between ntopng versions and should be confirmed against the running build, but they were left as-is since they are plausible and illustrative.
- The InfluxData repository install commands (archive key + Debian `stable` repo, which is what Ubuntu uses) and the `influx setup` / `influx auth create` / `influx bucket` CLI usage for InfluxDB 2.x are current and correct. The Flux downsample task is syntactically valid.
- General Linux commands (apt, systemd, UFW, `setcap`, `ip link`, `tcpdump`, `ethtool -K`, `lsof`, `netstat`) are all correct.
- Version caveat: ntopng historically supported InfluxDB 1.x; 2.x support is more recent. The post targets InfluxDB 2.x via the web UI, which is correct for current ntopng releases, but readers on older ntopng versions should confirm 2.x support.
