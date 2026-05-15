# Validation Summary: How to Monitor Remote Hosts with Nagios NRPE on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Fedora EPEL
- Nagios Core
- Nagios NRPE
- Nagios Plugins
- systemd
- firewalld

## Sources Consulted
- Red Hat EPEL installation guidance: https://www.redhat.com/en/blog/install-epel-linux
- Fedora package metadata for nrpe: https://packages.fedoraproject.org/pkgs/nrpe/nrpe/
- Fedora package metadata for nagios-plugins-nrpe: https://packages.fedoraproject.org/pkgs/nrpe/nagios-plugins-nrpe/
- Fedora package metadata for nagios-plugins-all: https://packages.fedoraproject.org/pkgs/nagios-plugins/nagios-plugins-all/
- Official NRPE documentation: https://assets.nagios.com/downloads/nagioscore/docs/nrpe/NRPE.pdf
- Nagios Core object definitions documentation: https://assets.nagios.com/downloads/nagioscore/docs/nagioscore/4/en/objectdefinitions.html
- Nagios Core main configuration documentation: https://assets.nagios.com/downloads/nagioscore/docs/nagioscore/4/en/configmain.html
- Nagios Plugins check_load manual: https://nagios-plugins.org/doc/man/check_load.html
- Nagios Plugins check_disk manual: https://nagios-plugins.org/doc/man/check_disk.html
- Nagios Plugins check_swap manual: https://nagios-plugins.org/doc/man/check_swap.html
- Nagios Plugins check_procs manual: https://nagios-plugins.org/doc/man/check_procs.html
- Nagios Plugins check_users manual: https://nagios-plugins.org/doc/man/check_users.html

## Issues Found
- The EPEL setup command used `sudo dnf install -y epel-release`, which is not the documented installation method for RHEL. Updated both remote-host and Nagios-server examples to enable the RHEL 9 CodeReady Builder repository and install the Fedora EPEL release RPM by URL.
- The custom command labeled "Check memory usage" used `check_swap`, which checks local swap space rather than RAM usage. Updated the label and command name to describe it as a swap check.

## Review Notes
- The article is written for RHEL-style paths and packages from EPEL. For RHEL 8 or RHEL 10, readers should use the matching CodeReady Builder repository name and matching `epel-release-latest-N.noarch.rpm` package.
- The Nagios command and object definition syntax is consistent with Nagios Core documentation.
