# Validation Summary: How to Monitor Remote Hosts with Nagios NRPE on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Fedora EPEL 9
- Nagios NRPE
- Nagios plugins
- systemd
- firewalld

## Sources Consulted
- Nagios NRPE documentation: https://assets.nagios.com/downloads/nagioscore/docs/nrpe/NRPE.pdf
- Nagios NRPE v4 source installation guide: https://support.nagios.com/kb/article.php?id=515
- Red Hat EPEL installation guidance for RHEL 9: https://www.redhat.com/en/blog/install-epel-linux
- Fedora Packages for `nrpe` on EPEL 9: https://packages.fedoraproject.org/pkgs/nrpe/nrpe/epel-9.html
- Fedora Packages for `nagios-plugins-nrpe` on EPEL 9: https://packages.fedoraproject.org/pkgs/nrpe/nagios-plugins-nrpe/epel-9.html
- Fedora Packages for `nagios-plugins-load` on EPEL 9: https://packages.fedoraproject.org/pkgs/nagios-plugins/nagios-plugins-load/epel-9.html
- firewalld `firewall-cmd` manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The original package installation command installed PCP, sysstat, and SNMP packages instead of NRPE and Nagios plugins. Replaced it with RHEL 9 EPEL setup and the relevant `nrpe`, `nagios-plugins-nrpe`, and `nagios-plugins-load` packages.
- The service commands enabled `pmcd`, `pmlogger`, and `sysstat`, which do not start NRPE. Replaced them with `systemctl enable --now nrpe.service`.
- The configuration section listed PCP, SNMP, Prometheus, and Grafana paths instead of NRPE configuration. Replaced it with `/etc/nagios/nrpe.cfg`, `allowed_hosts`, and a `check_load` command definition.
- The firewall section opened Prometheus, Node Exporter, Grafana, and SNMP ports instead of the NRPE port. Replaced it with TCP port 5666.
- The verification section used PCP, sysstat, and Prometheus checks instead of NRPE checks. Replaced it with local and remote `check_nrpe` commands.
- The alerting section referenced several unrelated alerting stacks. Narrowed it to Nagios host and service definitions that call `check_nrpe`.

## Review Notes
The corrected guide uses EPEL packages for RHEL 9. Environments that cannot use EPEL can install NRPE from source using the Nagios source installation guide, but that is a different installation path.
