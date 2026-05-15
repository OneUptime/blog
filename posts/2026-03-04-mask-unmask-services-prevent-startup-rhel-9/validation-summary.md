# Validation Summary: How to Mask and Unmask Services to Prevent Accidental Startup on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- systemd
- systemctl
- Linux service units
- firewalld, nftables, and iptables service management

## Sources Consulted
- systemctl(1) man page, local systemd documentation: verified `mask`, `unmask`, `is-enabled`, `list-unit-files`, `list-dependencies`, `--now`, and `--runtime` behavior.
- systemd.unit(5) man page, local systemd documentation: verified `Wants=` and `Requires=` dependency semantics.
- systemd upstream manual, systemctl: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- systemd upstream manual, systemd.unit: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- Red Hat Enterprise Linux 9 firewall documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_firewalls_and_packet_filters/index

## Issues Found
- The post said that after unmasking a service, the service is in a disabled state. This is not always correct. If the service was enabled before masking, unmasking restores access to the unit while the previous enablement links can still remain. Changed the text to tell readers to check `systemctl is-enabled` after unmasking.
- The post said the `status` output would show the link to `/dev/null`, but the shown output only indicates the unit is masked. Changed the wording to say the `Loaded` line shows the masked state.
- The command for listing masked service unit files only used `--state=masked`, which omits runtime masks reported as `masked-runtime`. Updated the command to use `--state=masked,masked-runtime`.
- The firewalld conflict example mentioned nftables but only masked `iptables` and `ip6tables`. Added `sudo systemctl mask nftables` to match the claim and Red Hat guidance to avoid running multiple firewall services.
- The dependency section said a unit with `Requires=` always fails to start if the required masked unit cannot start. systemd documents the common failure behavior when the requiring unit also has `After=` ordering on the failed required unit. Updated the explanation and example to include that ordering caveat.
- The audit script only checked `/etc/systemd/system`, so it did not correctly report runtime masks in `/run/systemd/system`. Updated it to list both `masked` and `masked-runtime` states and check both mask locations.

## Review Notes
The remaining examples use valid `systemctl` commands and flags. `systemctl mask` expects unit names, and omitting the `.service` suffix is valid for service units. The examples are appropriate for RHEL-style systems, though availability of example services such as `bluetooth`, `cups`, `avahi-daemon`, `iptables`, and `nftables` depends on installed packages and host role.
