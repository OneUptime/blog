# Validation Summary: How to Deploy IS-IS Routing Protocol on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- FRRouting (FRR)
- IS-IS routing protocol
- systemd
- DNF

## Sources Consulted
- Red Hat Enterprise Linux 9 package manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/package_manifest/Red_Hat_Enterprise_Linux-9-Package_manifest-en-US.pdf
- Red Hat Enterprise Linux 9 DNF package installation documentation: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/managing_software_with_the_dnf_tool/red_hat_enterprise_linux-9-managing_software_with_the_dnf_tool-en-us.pdf
- Red Hat Enterprise Linux 9.2 release notes for the `frr` dynamic routing package: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/9.2_release_notes/index
- FRRouting 8.3 basic setup documentation: https://docs.frrouting.org/en/stable-8.3/setup.html
- FRRouting 8.3 IS-IS documentation: https://docs.frrouting.org/en/stable-8.3/isisd.html
- FRRouting 10.0 IS-IS documentation for current integrated configuration guidance: https://docs.frrouting.org/en/stable-10.0/isisd.html

## Issues Found
- The post used placeholder paths such as `/etc/<service>/config.conf` and placeholder systemd unit names such as `<service-name>`. These would not deploy IS-IS on RHEL. Replaced them with FRRouting-specific commands using the `frr` package, `/etc/frr/daemons`, `vtysh`, and the `frr` systemd unit.
- The post omitted the package installation, service startup, and daemon enablement needed before IS-IS can run. Added `sudo dnf install frr`, enabled both `zebra` and `isisd`, and started `frr` before using `vtysh`, because FRR documentation states that `isisd` requires `zebra` interface information.
- The post did not include any valid IS-IS configuration. Added a minimal FRR IS-IS configuration using `router isis`, `net`, `ip router isis`, `metric-style wide`, `log-adjacency-changes`, and IS-IS area authentication.
- The verification and troubleshooting commands referenced placeholder package and service names. Replaced them with `systemctl status frr`, `journalctl -u frr`, `rpm -qa | grep frr`, and FRR IS-IS show commands documented by FRRouting.

## Review Notes
The sample NET, interface name, and password are examples and must be changed for a real deployment. RHEL 9 minor releases ship different FRR versions, so production deployments should check the installed `frr` package version and use the matching FRRouting documentation.
