# Validation Summary: How to Configure Networking for systemd-nspawn Containers on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RHEL
- systemd-nspawn
- systemd `.nspawn` configuration files
- Linux virtual Ethernet interfaces
- NetworkManager `nmcli`
- firewalld
- Linux IP routing

## Sources Consulted
- systemd-nspawn manual, Networking Options: https://www.freedesktop.org/software/systemd/man/systemd-nspawn.html
- systemd.nspawn manual, Network section: https://www.freedesktop.org/software/systemd/man/systemd.nspawn.html
- RHEL 9 Configuring and managing networking, Configuring a network bridge by using nmcli: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-a-network-bridge_configuring-and-managing-networking
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Local `nmcli connection add help` output for supported bridge connection syntax.

## Issues Found
- The post stated that containers share the host network stack by default without qualifying the startup path. This is correct for direct `systemd-nspawn` invocations, but the `systemd-nspawn@.service` template used by `machinectl` defaults to `--network-veth`. Updated the wording in the introduction and Host Networking section to make that distinction.
- The bridge example used older `bridge-slave` syntax. It is still recognized by some NetworkManager versions, but current RHEL 9.4+ documentation uses `type ethernet port-type bridge ... controller ...` and recommends `connection.autoconnect-ports`. Updated the example to match current RHEL documentation.

## Review Notes
The remaining examples are technically valid. The firewalld commands shown apply runtime configuration only; administrators who need settings to survive reboot should add `--permanent` and reload firewalld.
