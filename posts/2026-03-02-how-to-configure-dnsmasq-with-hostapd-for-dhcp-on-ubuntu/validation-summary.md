# Validation Summary: How to Configure dnsmasq with hostapd for DHCP on Ubuntu

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Ubuntu
- dnsmasq
- hostapd
- hostapd_cli
- DHCP
- DNS
- systemd-resolved

## Sources Consulted
- dnsmasq official man page: https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- Local dnsmasq 2.90 man page and `dnsmasq --help`
- systemd-resolved man page: https://www.freedesktop.org/software/systemd/man/latest/systemd-resolved.service.html
- Ubuntu hostapd_cli man page: https://manpages.ubuntu.com/manpages/noble/man1/hostapd_cli.1.html
- Debian hostapd sample configuration: https://sources.debian.org/src/wpa/2%3A2.10-25/hostapd/hostapd.conf
- Debian hostapd_cli source for action script invocation: https://sources.debian.org/src/wpa/2%3A2.4-1%2Bdeb9u6/hostapd/hostapd_cli.c

## Issues Found
- The basic install section disabled `systemd-resolved` before explaining alternatives. Removed those commands from the basic install flow so conflict handling is kept in the dedicated section.
- The `systemd-resolved` conflict explanation said dnsmasq needs to bind to all interfaces. Revised it to state the actual conflict case: dnsmasq listening on loopback or all addresses can conflict with the resolved stub listener.
- The `no-negcache` comment said it enabled negative caching. Corrected it to say it disables caching of NXDOMAIN responses.
- The `dhcp-lease-max` comment described a maximum lease time. Corrected it to maximum active DHCP leases.
- The Ubuntu security example used `group=dnsmasq`, but the packaged `dnsmasq` user commonly has primary group `nogroup`. Changed it to `group=nogroup`.
- The multi-subnet tag examples used tag names in `dhcp-option` without setting corresponding range tags. Updated the ranges to use `set:<tag>` and interface match tags where appropriate.
- The lease blocking example used `systemctl reload dnsmasq` after adding/removing a config file. dnsmasq SIGHUP does not reread its main configuration files, so this was changed to `systemctl restart dnsmasq`.
- The hostapd event section used an unsupported `ap_event_script` setting. Replaced it with the documented `hostapd_cli -a` action script approach and corrected the script argument order.
- The event script `chmod` command needed root permissions because the file is under `/etc/hostapd`. Added `sudo`.
- The performance tuning append command wrote to `/etc/dnsmasq.conf` without elevated redirection. Changed it to `sudo tee -a`.

## Review Notes
The corrected dnsmasq configuration snippets were syntax-checked with `dnsmasq --test`, and the hostapd event shell snippet was checked with `bash -n`. The `hostapd_cli -a` command runs the event watcher in the background; a production setup would normally make that persistent with a systemd unit.
