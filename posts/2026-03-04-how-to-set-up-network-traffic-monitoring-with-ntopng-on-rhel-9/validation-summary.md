# Validation Summary: How to Set Up Network Traffic Monitoring with ntopng on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL 9
- ntopng
- EPEL
- DNF/YUM repositories
- systemd
- firewalld
- Redis

## Sources Consulted
- ntop Software Installation: https://www.ntop.org/support/documentation/software-installation/
- ntopng Installation Guide: https://www.ntop.org/guides/ntopng/installation.html
- ntopng Command Line Options: https://www.ntop.org/guides/ntopng/cli_options/cli_options.html
- ntopng Configuration File documentation: https://www.ntop.org/guides/ntopng/how_to_start/configuration_file.html
- ntopng Alert Endpoints documentation: https://www.ntop.org/guides/ntopng/scripts/alert_endpoints.html
- Red Hat EPEL installation guidance for RHEL: https://www.redhat.com/en/blog/install-epel-linux

## Issues Found
- The install commands only enabled EPEL and then installed `ntopng`, but official ntop RPM packages require adding the ntop repository. Updated the install steps to enable CodeReady Builder for RHEL 9, install the official EPEL release RPM, add the ntop stable repository, and then install `ntopng` and `ntopng-data`.
- The ntopng configuration used `--community` without an equals sign. ntopng configuration files require `option=value` format, including flag options. Changed it to `--community=`.
- The start commands omitted Redis, which ntopng uses as a backend for configuration and preferences and must be running before ntopng. Added `sudo systemctl enable --now redis`.
- The alert configuration snippet used unsupported command-line options such as `--alert-smtp-server` and `--alert-recipient`. Replaced it with guidance to configure alert checks and email endpoints in the ntopng web interface.
- The multiple-interface configuration overwrote the config without preserving community mode. Added `--community=` to that example.
- The data retention example used `--dump-flows=logfile`, which is not a valid `--dump-flows` mode. Removed it and corrected the text to describe configuring the ntopng historical data directory with `--data-dir`.

## Review Notes
The post remains a concise RHEL 9 ntopng setup guide. Future improvements could mention that interface names such as `eth0` and `eth1` are examples and may differ on RHEL 9 systems using predictable network interface names.
