# Validation Summary: What Is MaxScale for MySQL

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- MariaDB MaxScale (database proxy)
- MySQL / MariaDB (backend databases)
- mariadbmon (MaxScale replication monitor module)
- readwritesplit (MaxScale router module)
- qlafilter (MaxScale query log filter)
- MaxCtrl CLI
- MaxScale REST API

## Sources Consulted
- MariaDB MaxScale official documentation (mariadb.com/kb/en/maxscale/)
- MariaDB MaxScale mariadbmon module documentation (mariadb.com/kb/en/mariadb-monitor/)
- MariaDB MaxScale readwritesplit router documentation (mariadb.com/kb/en/readwritesplit/)
- MariaDB MaxScale service user grant requirements (mariadb.com/kb/en/mariadb-maxscale-6-setting-up-mariadb-maxscale/)
- MariaDB MaxScale qlafilter documentation (mariadb.com/kb/en/mariadb-maxscale-6-query-log-all-filter/)
- MariaDB MaxScale REST API documentation (mariadb.com/kb/en/mariadb-maxscale-6-rest-api/)
- BSL (Business Source License) details (mariadb.com/bsl-faq-mariadb/)

## Issues Found

### 1. Description incorrectly called MaxScale "open-source"
- **What was wrong:** The post description (line 7) described MaxScale as "an open-source database proxy." MaxScale 2.x and later uses the Business Source License (BSL), which is source-available but not OSI-approved open-source. The comparison table within the post itself correctly identified the license as BSL.
- **What was changed:** Changed "open-source" to "source-available" in the description.
- **Why:** BSL restricts production use and is not recognized as open-source by the Open Source Initiative. Using "source-available" is the accurate term.

### 2. Router/service user SQL grants were incomplete
- **What was wrong:** The service user (`maxscale_router`) was only granted SELECT on `mysql.user`, `mysql.db`, and `mysql.tables_priv`. MaxScale's authentication module needs to query additional mysql system tables to properly authenticate and authorize users.
- **What was changed:** Added grants for `mysql.columns_priv`, `mysql.procs_priv`, `mysql.proxies_priv`, and `mysql.roles_mapping`.
- **Why:** Without these grants, the service user cannot properly load authentication data for users with column-level privileges, stored procedure privileges, proxy user configurations, or role-based access. This would cause authentication failures in production.

### 3. Monitor user was missing PROCESS privilege
- **What was wrong:** The monitor user (`maxscale_monitor`) was granted `REPLICATION CLIENT, SUPER, RELOAD` but was missing the `PROCESS` privilege.
- **What was changed:** Added `PROCESS` to the monitor user's GRANT statement.
- **Why:** The `PROCESS` privilege is required by the mariadbmon module to inspect the processlist for proper failover operation, particularly when auto_failover is enabled.

## Review Notes
- The installation section references MaxScale 2.5 on CentOS 7. MaxScale has since moved to year-based versioning (22.08, 23.02, 23.08, 24.02, etc.) and CentOS 7 reached EOL in June 2024. Readers installing MaxScale today should use the MariaDB repository setup for their current OS and the latest MaxScale version.
- The REST API failover endpoint shown (`POST /v1/monitors/<name>/failover`) may use a simplified path. The canonical documented form in some MaxScale versions is `POST /v1/maxscale/modules/mariadbmon/failover?<monitor-name>`. The shown format works in recent MaxScale versions.
- The ProxySQL comparison table states ProxySQL "Requires external tools" for topology awareness. ProxySQL 2.x has built-in replication hostgroup management and Galera support, making this claim somewhat oversimplified, though MaxScale's built-in monitoring is more comprehensive.
- For MariaDB 10.5+, the monitor user should ideally use `REPLICATION SLAVE ADMIN` instead of `SUPER`, as granular privileges are preferred over the broad `SUPER` privilege. The current grants work but follow an older pattern.
- The `mysql.roles_mapping` grant for the router user is MariaDB-specific. If readers use MaxScale with MySQL (not MariaDB), they should omit that grant and may need `mysql.global_priv` instead.
