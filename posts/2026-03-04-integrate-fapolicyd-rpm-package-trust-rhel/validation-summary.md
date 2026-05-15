# Validation Summary: How to Integrate fapolicyd with RPM Package Trust on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- fapolicyd
- RPM database trust backend
- DNF and RPM package management
- fapolicyd integrity checking

## Sources Consulted
- Red Hat Enterprise Linux 8 Security hardening documentation: Blocking and allowing applications by using fapolicyd: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/security_hardening/assembly_blocking-and-allowing-applications-using-fapolicyd_security-hardening
- Red Hat Enterprise Linux 10 Security hardening documentation: Blocking and allowing applications by using fapolicyd: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/security_hardening/blocking-and-allowing-applications-by-using-fapolicyd
- fapolicyd-cli(8) man page: https://www.mankier.com/8/fapolicyd-cli
- fapolicyd.conf(5) man page: https://www.mankier.com/5/fapolicyd.conf
- Upstream fapolicyd README: https://github.com/linux-application-whitelisting/fapolicyd
- Fedora package information for the historical fapolicyd-dnf-plugin package: https://packages.fedoraproject.org/pkgs/fapolicyd/fapolicyd-dnf-plugin

## Issues Found
- The post said any software installed through DNF or RPM is automatically trusted. Red Hat documents RPM database trust, but direct `rpm` installs may require `fapolicyd-cli --update`; I changed the wording to say RPM-registered package-manager software can be trusted by policy.
- The post said all binaries and libraries in a DNF-installed package are automatically added to the trust database. Upstream fapolicyd documentation says RPM trust entries are filtered, so I changed this to refer to RPM-installed binaries, scripts, and other files included by fapolicyd's trust filters.
- The command labeled "Count trusted entries from RPM" counted all trust sources. I changed it to count entries whose trust source is `rpmdb`.
- The post described a DNF plugin and used `fapolicyd-dnf-plugin`. Current Red Hat documentation describes the fapolicyd RPM plugin, and RHEL 9.1 replaced the DNF plugin with `rpm-plugin-fapolicyd`; I updated the section heading, package name, and verification command.
- The description and conclusion implied trust only applied to official channels or that all third-party binaries require manual trust. I revised these to distinguish RPM-registered packages from custom or non-RPM third-party binaries.

## Review Notes
The commands and configuration examples are otherwise consistent with the documented `trust = rpmdb,file`, `fapolicyd-cli --dump-db`, `fapolicyd-cli --update`, and `integrity = sha256` behavior. The exact plugin package can vary on older RHEL minor releases, where the historical DNF plugin existed before the RPM plugin replacement.
