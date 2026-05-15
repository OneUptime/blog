# Validation Summary: How to Monitor and Troubleshoot a Pacemaker Cluster on RHEL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Pacemaker
- pcs
- Corosync
- STONITH / fencing
- systemd journal
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing high availability clusters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/
- pcs(8) manual page: https://www.mankier.com/8/pcs
- crm_mon(8) manual page from ClusterLabs: https://clusterlabs.org/projects/pacemaker/man/crm_mon.8.html
- stonith_admin(8) manual page: https://www.mankier.com/8/stonith_admin
- Red Hat Enterprise Linux 9 documentation: Configuring basic system settings, journalctl usage: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/configuring_basic_system_settings/

## Issues Found
- `pcs status --brief` is not a valid RHEL 9 `pcs status` option. Changed it to `pcs status --hide-inactive`, which is supported by the `pcs` status command and matches a compact status use case by omitting inactive resources.
- `pcs status --watch` is not a valid RHEL 9 `pcs status` option. Changed it to `watch -n 2 sudo pcs status` for real-time repeated monitoring.
- `pcs resource show WebServer` uses older/deprecated `pcs resource show` syntax. Changed it to `pcs resource config WebServer`, the RHEL 9 command for displaying a resource configuration and meta attributes.
- `pcs property show stonith-enabled` uses older/deprecated property syntax. Changed it to `pcs property config stonith-enabled`, the RHEL 9 command for querying a specific cluster property.

## Review Notes
The remaining `pcs`, `crm_mon`, Corosync, fencing, journalctl, and firewalld commands are consistent with RHEL 9 or upstream Pacemaker command documentation. Testing fence devices with `pcs stonith fence node --off` is intentionally disruptive and should be run only in a controlled maintenance/test window.
