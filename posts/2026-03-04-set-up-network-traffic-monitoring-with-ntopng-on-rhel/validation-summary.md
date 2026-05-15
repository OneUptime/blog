# Validation Summary: How to Set Up Network Traffic Monitoring with ntopng on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux and RHEL-compatible distributions
- ntopng
- nDPI
- PF_RING
- firewalld
- systemd
- curl

## Sources Consulted
- ntop Software Installation: https://www.ntop.org/support/documentation/software-installation/
- ntopng Installation documentation: https://www.ntop.org/guides/ntopng/installation.html
- ntopng Configuration File documentation: https://www.ntop.org/guides/ntopng/how_to_start/configuration_file.html
- ntopng Command Line Options: https://www.ntop.org/guides/ntopng/cli_options/cli_options.html
- ntopng RESTful API v2 Examples: https://www.ntop.org/guides/ntopng/api/rest/examples_v2.html
- ntopng RESTful API v2 Specification: https://www.ntop.org/guides/ntopng/api/rest/api_v2.html
- ntopng User Interface Guide: https://www.ntop.org/guides/ntopng/user_interface/index.html
- Red Hat EPEL installation guidance: https://www.redhat.com/en/blog/install-epel-linux
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_firewalls_and_packet_filters/index
- Red Hat Enterprise Linux 9 systemd documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings

## Issues Found
- The repository snippet manually created a single `ntop` repo entry with an outdated GPG key path and no `noarch` repo. Replaced it with the current official ntop stable repository file download command, which includes both architecture-specific and noarch repositories.
- The install command used `nDPI`, while ntop packages publish the RPM package as `ndpi`. Updated the package name.
- The install instructions skipped EPEL, which ntop's RPM installation instructions require on RHEL-compatible systems. Added RHEL-specific CodeReady Builder and EPEL enablement steps.
- The configuration used `-w=3000`. Current ntopng documentation shows `--http-port=:3000` for the HTTP listener. Updated the setting while keeping the same port.
- The commented `--disable-login` option lacked the required `=value` form for daemon configuration files. Updated it to `#--disable-login=1`.
- The API examples omitted the required `ifid` query parameter shown in the ntopng REST API examples and specification. Added `?ifid=0` to both curl commands.
- The DNS mode comment described mode 1 as "decode" and mode 0 as "no decode", but current ntopng options define mode 0 as the default DNS-response decoding mode and mode 1 as decoding plus resolving all numeric IPs. Updated the comment.

## Review Notes
The interface name `ens192` and local network ranges are examples and must be adjusted for the target RHEL host. The `pfring` package exists in the ntop repositories, while `pfring-dkms` is used in ntop's broader installation examples when kernel modules are needed.
