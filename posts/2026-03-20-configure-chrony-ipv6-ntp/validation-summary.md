# Validation Summary: How to Configure chrony for IPv6 NTP

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- chrony / chronyd
- chronyc
- NTP
- IPv6
- systemd
- Linux time synchronization

## Sources Consulted
- chrony documentation index: https://chrony-project.org/documentation.html
- chrony `chrony.conf(5)`: https://chrony-project.org/doc/4.6/chrony.conf.html
- chrony `chronyc(1)`: https://chrony-project.org/doc/4.6/chronyc.html
- chrony `chronyd(8)`: https://chrony-project.org/doc/4.6/chronyd.html
- chrony FAQ: https://chrony-project.org/faq
- NTP Pool usage guidance: https://www.ntppool.org/use.html
- Cloudflare Time Services NTP usage: https://developers.cloudflare.com/time-services/ntp/usage/
- Google Public NTP FAQ: https://developers.google.com/time/faq
- Ubuntu Server documentation for chrony: https://documentation.ubuntu.com/server/how-to/networking/chrony-client/
- systemd `timedatectl(1)`: https://www.freedesktop.org/software/systemd/man/latest/timedatectl.html
- systemd `systemd-timesyncd.service(8)`: https://www.freedesktop.org/software/systemd/man/devel/systemd-timesyncd.html

## Issues Found
- The post used invalid IPv6 example addresses like `2001:db8:ntp::1`, `2001:db8::ntp1`, and `2001:db8:internal::/48`. I replaced them with syntactically valid documentation-prefix IPv6 examples.
- The post said `pool pool.ntp.org` "supports IPv6". The NTP Pool guidance says IPv6 is exposed via numbered pool zones such as `2.pool.ntp.org`, so I updated the pool examples accordingly.
- The post said the `-6` flag is used in `server` and `pool` directives and showed `version 4` as an IPv6-forcing example. In chrony, the correct per-source option is `ipv6`, while `version 4` only selects the NTP protocol version. I corrected those examples.
- The original examples mixed `time.google.com` with non-smeared sources. Google Public NTP documents leap smearing and advises against mixing smeared and non-smeared servers, so I removed that mixed-source example.
- The systemd override example hard-coded `chronyd.service`, assumed a portable `ExecStart`, and used a command line that was not valid cross-distribution as written. I changed that guidance to explicitly inspect the installed unit and append `-6` to the existing `ExecStart`.
- The post used `/etc/chrony.conf` and `chronyd` service commands as if they were universal. Ubuntu documents `/etc/chrony/chrony.conf` and `chrony.service`, so I made those distro differences explicit where relevant.
- `chronyc -h <addr> sources` was described as querying an NTP server, but it actually talks to a remote `chronyd` control endpoint. I corrected the explanation.
- `chronyc clients` was shown without `sudo`, but that command requires privileged local access via the Unix socket. I updated it to `sudo chronyc clients`.
- `timedatectl show-timesync --all` was presented as a generic chrony troubleshooting command, but systemd documents it as status for `systemd-timesyncd`. I replaced it with chrony-relevant status commands.
- `ntpdate -q` was used for manual testing even though the rest of the article is about chrony. I replaced it with a `chronyd -Q` example backed by chrony’s documented one-shot query mode.
- Several verification commands needed small fixes to match their stated purpose, including using `chronyc -n sources -v`, adding `sudo` for `ss -p` and `tcpdump`, and checking AAAA records against `2.pool.ntp.org` rather than plain `pool.ntp.org`.

## Review Notes
- The systemd override remains intentionally generic because the exact unit name and `ExecStart` differ across distributions; the post now tells readers to inspect the installed unit first.
- The article is now technically correct for current chrony behavior, but distro defaults around which time-sync service ships enabled can continue to change over time.
