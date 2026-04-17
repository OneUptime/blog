# Validation Summary: How to Use wondershaper to Limit IPv4 Bandwidth on Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- wondershaper (magnific0 fork)
- Linux `tc` (traffic control) — HTB qdisc, classes, filters, SFQ
- systemd unit files (oneshot service)
- Linux network interfaces (eth0, wg0)
- speedtest-cli, wget (for verification)

## Sources Consulted
- magnific0/wondershaper source — https://github.com/magnific0/wondershaper
  - `wondershaper` script (usage/getopts, modes, classes) — verified `-h -c -s -a <adapter> -d <rate> -u <rate> -p -f <file> -v` flags only
  - `wondershaper.conf` — confirmed default install path `/etc/systemd/wondershaper.conf` and INI-style header with quoted bash variables
  - `wondershaper.service` — confirmed shipped service uses `EnvironmentFile=/etc/systemd/wondershaper.conf` and `ExecStart=/usr/sbin/wondershaper -a $IFACE -d $DSPEED -u $USPEED`
  - `makefile` — confirmed install targets `$(sbindir)/wondershaper` (default `/usr/local/sbin`) and conf at `/etc/systemd/wondershaper.conf`
- `tc(8)` man page — confirmed `kbit` rate suffix means kilobits/second, HTB qdisc semantics, ingress/IFB redirection pattern (matches what the script emits)

## Issues Found
1. **Invalid positional `clear`/`status` syntax.** The post showed `sudo wondershaper clear eth0` and `sudo wondershaper status eth0` as alternatives. The magnific0 fork (which the post explicitly installs from, and which is shipped by current Ubuntu/Debian) parses arguments with `getopts` only and does not accept these positional forms — they fail with the usage message. Removed the `clear eth0` line and replaced `status eth0` with the supported `wondershaper -s -a eth0`.
2. **Wrong conf file path.** The post referenced `/etc/wondershaper.conf`. The magnific0 makefile installs the conf to `/etc/systemd/wondershaper.conf` (and the script reads `CONF="/etc/systemd/wondershaper.conf"`, falling back to the legacy `/etc/conf.d/wondershaper.conf`). Updated path and quoted the values to match the shipped sample, and clarified that the existing `wondershaper.service` already consumes this file via `wondershaper -p`.

## Review Notes
- Rate units: wondershaper documents rates as "Kbps" but internally passes them to `tc` as `kbit`, i.e. kilobits per second (1000 bits/s). The post's "kbps = kilobits per second" framing is correct in the common interpretation. Note that 10240 kbit ≈ 10.24 Mbps (not exactly 10 Mbps); this is a minor rounding nit, not an error, and is unchanged.
- Source-install path: `make install` with the default `prefix=/usr/local` puts the binary at `/usr/local/sbin/wondershaper`, while the apt package installs it at `/sbin/wondershaper` (which on usrmerge systems resolves to `/usr/sbin/wondershaper`). The systemd unit in the post uses `/usr/sbin/wondershaper`, which is correct for the apt install path on modern Ubuntu/Debian; readers who installed from source with the default prefix may need to adjust.
- HTB class description (high/normal/bulk) matches the script's class hierarchy (1:10 high prio, 1:20 default/normal, 1:30 bulk) — accurate.
- The example URL `http://speedtest.wdc01.softlayer.com/downloads/test10.zip` is a long-standing SoftLayer/IBM Cloud speed-test asset; it has been intermittently available historically. Not changed because it remains a plausible representative example, but readers may need an alternative.
