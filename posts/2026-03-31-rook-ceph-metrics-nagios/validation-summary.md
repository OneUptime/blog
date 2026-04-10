# Validation Summary: How to Set Up Ceph Metrics in Nagios

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nagios Core (monitoring platform)
- Ceph (distributed storage)
- Rook (Ceph Kubernetes operator)
- ceph-nagios-plugins (check_ceph_health, check_ceph_osd, check_ceph_df)
- NRPE (Nagios Remote Plugin Executor)
- check_http (Nagios plugin)
- Prometheus metrics endpoint (Ceph Manager module)

## Sources Consulted
- ceph-nagios-plugins source code on GitHub (https://github.com/ceph/ceph-nagios-plugins) - verified exact argparse flag definitions for check_ceph_health, check_ceph_osd, and check_ceph_df
- Nagios Core 4 Object Definitions documentation (https://assets.nagios.com/downloads/nagioscore/docs/nagioscore/4/en/objectdefinitions.html) - verified service, contact, and command object syntax
- Nagios Plugins check_http manual (https://nagios-plugins.org/doc/man/check_http.html) - verified -H, -p, -u, --string flags
- Nagios Core notifications documentation (https://assets.nagios.com/downloads/nagioscore/docs/nagioscore/4/en/notifications.html) - verified notification option values
- Nagios Core sample configs on GitHub (https://github.com/NagiosEnterprises/nagioscore) - verified check-host-alive command and 24x7 timeperiod exist as standard pre-defined objects
- Ceph documentation for Prometheus module and ceph auth commands

## Issues Found
- **`check_ceph_df` warning flag**: The command used `--warning 70` but the ceph-nagios-plugins `check_ceph_df` plugin defines the warning threshold flag as `-W`/`--warn`, not `--warning`. Since argparse does not match a longer string (`--warning`) to a shorter defined option (`--warn`), this would cause an unrecognized argument error at runtime. Fixed to `-W 70`. The `--critical` flag was already correct.

## Review Notes
- The service definition for `check_ceph_prometheus` in Step 5 is minimal compared to the service definitions in Step 4 - it omits `retry_interval`, `max_check_attempts`, `notification_period`, and `contact_groups`. These directives are practically required unless inherited from a template via `use`. Since the blog does not reference templates, readers may encounter Nagios configuration validation errors. This is a common simplification in tutorials.
- Similarly, the contact definition in Step 6 omits `service_notification_period` and `host_notification_period`, which are needed for functional notifications. Most real deployments inherit these from a `generic-contact` template.
- The `check_ceph_osd` command's `-H $HOSTADDRESS$` flag is correct - the plugin uses `-H`/`--host` (required) to filter OSDs belonging to a specific host in the `ceph osd dump` output. This means the service check is per-host, not cluster-wide, which is worth noting for readers who want cluster-wide OSD monitoring.
- The `--string "ceph_health_status 0"` approach in the check_http command is functional but fragile - it performs a substring match on the Prometheus metrics response. If the health status is non-zero, the check correctly returns CRITICAL. However, it cannot distinguish between WARNING (health_status=1) and CRITICAL (health_status=2) states at the Nagios level.
