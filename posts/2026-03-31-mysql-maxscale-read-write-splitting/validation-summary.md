# Validation Summary: How to Set Up Read-Write Splitting with MaxScale for MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MariaDB MaxScale (proxy / load balancer)
- MySQL replication (primary-replica topology)
- readwritesplit router
- mariadbmon monitor module
- maxctrl CLI

## Sources Consulted
- MariaDB MaxScale ReadWriteSplit Router documentation (https://mariadb.com/docs/maxscale/reference/maxscale-routers/maxscale-readwritesplit)
- MariaDB MaxScale Installation Guide (https://mariadb.com/docs/maxscale/maxscale-quickstart-guides/mariadb-maxscale-installation-guide)
- MariaDB Monitor configuration documentation (https://mariadb.com/docs/maxscale/mariadb-maxscale-tutorials/configuring-the-mariadb-monitor)
- MaxScale Common Monitor Parameters (https://mariadb.com/docs/maxscale/reference/maxscale-monitors/common-monitor-parameters)
- MaxScale Hintfilter documentation (https://mariadb.com/kb/en/mariadb-maxscale-24-hintfilter/)
- MaxScale Listener and Protocol documentation (https://mariadb.com/docs/maxscale/reference/maxscale-listeners)
- MariaDB Package Repository Setup (https://mariadb.com/kb/en/mariadb-package-repository-setup-and-usage/)

## Issues Found
1. **Invalid `slave_selection_criteria` value `RANDOM`**: In the "Tuning Replica Selection" section, `RANDOM` was listed as a valid `slave_selection_criteria` option. This is not a recognized value in MaxScale. Valid options include `LEAST_CURRENT_OPERATIONS` (default), `LEAST_BEHIND_MASTER`, `ADAPTIVE_ROUTING`, `LEAST_GLOBAL_CONNECTIONS`, and `LEAST_ROUTER_CONNECTIONS`. Replaced `RANDOM` with `LEAST_ROUTER_CONNECTIONS` and updated the description accordingly.

## Review Notes
- The `SUPER` grant given to the MaxScale user is overly permissive for basic monitoring. For MySQL, `REPLICATION CLIENT` (already granted) is sufficient to run `SHOW MASTER STATUS` and `SHOW SLAVE STATUS`. The `SUPER` privilege is not strictly needed for read-write splitting monitoring and could be removed as a security best practice. Not changed since it is functional, just not minimal.
- `max_slave_connections=100%` works but percentage-based values for this parameter are deprecated as of MaxScale 2.5.0. Future versions may remove support. Users should consider migrating to a numeric value (e.g., `max_slave_connections=255`). Not changed since the current value still functions correctly.
- The routing hint syntax `/* maxscale route to master */` is valid C-style comment hint syntax for MaxScale when placed inline before the semicolon, which the post does correctly. However, the post does not mention that the hintfilter may need to be configured in the service for hints to be processed in older MaxScale versions. In MaxScale 23.x, the readwritesplit router has built-in hint support.
- The installation uses the Enterprise repo setup script. Users without a MariaDB Enterprise subscription may need to use the community MaxScale packages instead.
