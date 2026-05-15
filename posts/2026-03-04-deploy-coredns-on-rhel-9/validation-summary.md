# Validation Summary: How to Deploy CoreDNS on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder tutorial

## Technologies Covered
- CoreDNS
- Red Hat Enterprise Linux 9
- systemd
- Linux command line

## Sources Consulted
- CoreDNS configuration manual: https://coredns.io/manual/configuration/
- CoreDNS project site: https://coredns.io/
- Red Hat Enterprise Linux 9 systemd documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings

## Issues Found
- The post is a generic service-management placeholder, not a CoreDNS deployment guide. It uses `/etc/<service>/config.conf`, `<service-name>`, and `<package-name>` placeholders instead of CoreDNS-specific installation commands, a `Corefile`, or a real `coredns.service` unit.
- The configuration guidance is inaccurate for CoreDNS. CoreDNS is configured with a `Corefile`; the official CoreDNS manual documents server blocks and plugins rather than a generic `/etc/<service>/config.conf` file.
- The operational commands cannot be executed as written because `<service-name>` is not a valid systemd unit name. Red Hat's systemd documentation requires an actual systemd unit, such as `name.service`, for `systemctl` commands.
- The post omits the actual installation step and has no valid CoreDNS configuration example, making it unsalvageable without rewriting it into a substantially different article.

## Review Notes
This post should be removed or replaced with a real CoreDNS-on-RHEL guide that covers installing the CoreDNS binary or package, creating a valid `Corefile`, defining a systemd unit, opening the required firewall port if applicable, and verifying DNS responses with tools such as `dig`.
