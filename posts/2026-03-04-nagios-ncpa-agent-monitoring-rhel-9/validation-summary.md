# Validation Summary: How to Set Up Nagios NCPA Agent Monitoring on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Nagios NCPA
- Nagios RPM repository
- systemd
- firewalld
- NCPA HTTPS API
- Nagios Core/XI monitoring checks

## Sources Consulted
- Nagios NCPA Getting Started Guide: https://www.nagios.org/ncpa/getting-started.php
- Nagios NCPA project and downloads page: https://www.nagios.org/projects/ncpa/
- Nagios RPM repository instructions for RHEL 9 and NCPA: https://repo.nagios.com/?repo=rpm-rhel
- Nagios NCPA 3.x documentation overview and service restart guidance: https://www.nagios.org/ncpa/help/3.x/index.html
- Nagios NCPA 3.x configuration reference: https://www.nagios.org/ncpa/help/3.x/configuration.html
- Nagios NCPA 3.x API reference: https://www.nagios.org/ncpa/help/3.x/api.html
- Nagios NCPA 3.x active checks documentation: https://www.nagios.org/ncpa/help/3.x/active.html
- firewalld documentation for opening ports and services: https://firewalld.org/documentation/howto/open-a-port-or-service.html

## Issues Found
- The original installation command installed PCP, sysstat, and SNMP packages instead of the Nagios NCPA agent. Replaced it with the Nagios RHEL 9 repository package installation and `dnf install ncpa`, matching Nagios repository documentation.
- The original service commands enabled `pmcd`, `pmlogger`, and `sysstat`, which are unrelated to NCPA agent monitoring. Replaced them with `systemctl enable --now ncpa`, consistent with NCPA 3.x using a single service.
- The original configuration section listed PCP, SNMP, Prometheus, and Grafana paths instead of the NCPA configuration path. Replaced it with `/usr/local/ncpa/etc/ncpa.cfg` and the required `[api] community_string` token setting from the official NCPA configuration reference.
- The original firewall commands opened Prometheus, Node Exporter, Grafana, and SNMP ports instead of the NCPA listener port. Replaced them with port `5693/tcp`, the documented default NCPA listener/API port.
- The original verification commands checked PCP, sysstat, and Prometheus endpoints. Replaced them with NCPA API calls for `system/agent_version` and `cpu/percent`, including the required `token` query parameter.
- The alerting note named unrelated alerting options for this NCPA-specific guide. Updated it to refer to Nagios XI's NCPA wizard, Nagios Core active checks with `check_ncpa.py`, and NCPA passive checks through NRDP.

## Review Notes
The corrected post now describes NCPA 3.x behavior, where NCPA uses a single `ncpa` service. Older NCPA 2.x deployments used separate listener and passive services, so that distinction may matter only for legacy environments.
