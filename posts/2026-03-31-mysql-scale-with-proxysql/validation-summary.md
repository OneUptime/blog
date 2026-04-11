# Validation Summary: How to Scale MySQL with ProxySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- ProxySQL 2.x
- Read-write splitting / query routing
- Connection pooling / multiplexing

## Sources Consulted
- ProxySQL official documentation (https://proxysql.com/documentation/)
- ProxySQL `mysql_servers` table reference (https://proxysql.com/documentation/main-runtime/#mysql_servers)
- ProxySQL `mysql_query_rules` table reference (https://proxysql.com/documentation/main-runtime/#mysql_query_rules)
- ProxySQL `mysql_users` table reference (https://proxysql.com/documentation/main-runtime/#mysql_users)
- ProxySQL monitoring documentation (https://proxysql.com/documentation/monitor/)
- ProxySQL stats tables reference (https://proxysql.com/documentation/stats-statistics/)

## Issues Found
No technical issues found.

## Review Notes
- The post does not mention adding the ProxySQL APT repository before `apt-get install`, which would be required on a fresh Ubuntu system. This is acceptable for brevity but readers may need to consult the ProxySQL installation docs.
- `SELECT ... FOR SHARE` (MySQL 8.0+) and `SELECT ... LOCK IN SHARE MODE` queries would also need routing to the primary in a production setup. The post only covers `FOR UPDATE`, which is the most common case.
- The monitoring user is granted `REPLICATION CLIENT`, which is sufficient for `SHOW SLAVE STATUS` / `SHOW REPLICA STATUS`. For ProxySQL's read-only check (`read_only` variable monitoring), this privilege is also sufficient.
- Default admin credentials (`admin:admin`) should be changed in production. The post uses them for demonstration purposes, which is standard for tutorials.
