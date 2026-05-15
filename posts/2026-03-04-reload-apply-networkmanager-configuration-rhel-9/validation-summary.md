# Validation Summary: How to Reload and Apply NetworkManager Configuration Changes on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NetworkManager
- nmcli
- systemd service management
- Linux IP networking commands

## Sources Consulted
- NetworkManager nmcli reference: https://www.networkmanager.dev/docs/api/latest/nmcli.html
- NetworkManager daemon reference: https://www.networkmanager.dev/docs/api/latest/NetworkManager.html
- NetworkManager.conf reference: https://www.networkmanager.dev/docs/api/latest/NetworkManager.conf.html
- Red Hat Enterprise Linux 9 networking documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/index
- Local `nmcli(1)`, `NetworkManager(8)`, and `NetworkManager.conf(5)` manual pages from NetworkManager 1.46.0
- Local `systemctl show NetworkManager.service` output confirming `CanReload=yes` and the D-Bus reload action

## Issues Found
- The reload hierarchy listed `nmcli connection reapply`, but `reapply` is a device command. Changed the diagram to `nmcli device reapply`.
- The first method was titled "Connection Reapply", which was imprecise for the documented command. Changed it to "Device Reapply".
- The post used `nmcli device reapply ens192 --check`, but `nmcli device reapply` does not support a `--check` option. Replaced it with supported inspection commands, `nmcli device show ens192` and `nmcli connection show ens192`, to compare running device state and saved profile data.
- The daemon reload section implied all daemon configuration changes can be applied live. Added the NetworkManager caveat that not every daemon setting can be changed at runtime and noted `nmcli general reload conf` for reloading only `NetworkManager.conf`.
- The restart section said restarting NetworkManager tears down and rebuilds all connections. Modern NetworkManager tries to preserve and restore active connection state across daemon restarts, so this was changed to describe restart as riskier and potentially disruptive instead of always tearing down all connections.
- The remote-change rollback example used `at` to run `nmcli connection up ens192`, which would not revert a bad profile change. Replaced it with `nmcli device checkpoint --timeout 300 ...`, which is the supported NetworkManager rollback mechanism for disruptive remote changes.

## Review Notes
The post assumes the connection profile name and interface name are both `ens192`. That is common in examples, but on real systems admins should verify profile names with `nmcli connection show`.
