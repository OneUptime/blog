# Validation Summary: How to Deploy Zeek (Bro) for Network Security Monitoring on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RHEL
- Zeek
- ZeekControl (`zeekctl`)
- DNF
- firewalld
- Linux packet capture

## Sources Consulted
- Zeek official installation documentation: https://docs.zeek.org/en/current/install.html
- Zeek official source build documentation: https://docs.zeek.org/en/current/building-from-source.html
- Zeek official quick start guide: https://docs.zeek.org/en/current/quickstart.html
- ZeekControl official documentation: https://github.com/zeek/zeekctl

## Issues Found
- The original install command used `<package-name>`, which was a placeholder and not a valid Zeek installation command. Replaced it with Zeek's documented RHEL build dependencies and source build commands.
- The original verification command used `rpm -qi <package-name>`, which would not verify a source-built Zeek installation. Replaced it with `zeek --version` and `zeekctl help`.
- The original configuration path `/etc/<service>/config.conf` was not a Zeek configuration path. Replaced it with `/usr/local/zeek/etc/node.cfg` and a valid standalone Zeek node configuration.
- The original service commands used `systemctl enable --now <service>`, but ZeekControl-managed Zeek deployments are started with `zeekctl deploy` and checked with `zeekctl status`. Updated the commands accordingly.
- The original test command `<service> --test` was invalid. Replaced it with `zeekctl check`.
- The original log-checking command used `journalctl -u <service>`, which does not match a source-built ZeekControl deployment. Replaced it with `zeekctl diag` and a check of `/usr/local/zeek/logs/current/`.
- The original firewall example used `--add-service=<service>`, but standalone Zeek is a passive sensor and does not require an inbound firewalld service. Replaced it with guidance to restrict cluster communication only when using a multi-node deployment.
- The original performance commands referenced a systemd service and `<service>` process name. Replaced them with ZeekControl commands for live process and capture statistics.
- The troubleshooting section contained generic service and port-conflict advice. Updated it to use `zeekctl diag` and Zeek-specific interface/log validation.

## Review Notes
The guide now uses the default `/usr/local/zeek` prefix used by Zeek source builds. RHEL environments may require additional repository enablement, such as EPEL or CodeReady Builder, depending on subscription and package availability.
