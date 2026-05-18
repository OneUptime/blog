# Validation Summary: How to Set Up ProxySQL for MySQL Load Balancing on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ProxySQL 2.x
- MySQL (primary-replica replication)
- Ubuntu (apt package management, systemd)
- SQL (ProxySQL admin interface)

## Sources Consulted
- ProxySQL official documentation: https://proxysql.com/documentation/
- Installing ProxySQL: https://proxysql.com/documentation/installing-proxysql/
- The Admin Schemas / Stats: https://www.proxysql.com/documentation/the-admin-schemas/stats/stats-mysql
- MySQL Monitor Variables: https://proxysql.com/documentation/global-variables/mysql-monitor-variables/
- MySQL Variables: https://proxysql.com/documentation/global-variables/mysql-variables/
- Admin Variables: https://proxysql.com/documentation/global-variables/admin-variables/
- sysown/proxysql GitHub wiki

## Issues Found

1. **Outdated/incorrect ProxySQL repository URL and key install method.** The post used `https://repo.proxysql.com/ProxySQL/proxysql-2.x-repo/proxysql_pub_key` (not a current valid path) and the deprecated `apt-key add`. Replaced with the current version-specific scheme from the official docs: download the keyring directly to `/etc/apt/trusted.gpg.d/` using `https://repo.proxysql.com/ProxySQL/proxysql-2.7.x/repo_pub_key.gpg`, and pull the apt sources from `proxysql-2.7.x` (with a note that the user can substitute another release series).

2. **Wrong column names in `stats_mysql_connection_pool` query.** The post used `hostgroup_id, hostname, port, connections_used, connections_free`. The actual columns are `hostgroup, srv_host, srv_port, ConnUsed, ConnFree` (per the official admin schema). Corrected the SELECT to use the real column names.

3. **`stats_mysql_query_rules` query referenced columns that do not exist.** That stats table only has `rule_id` and `hits`; `match_digest` and `destination_hostgroup` live in the configuration table `mysql_query_rules`. Rewrote the query as a JOIN between the two tables and added a short comment explaining why.

## Review Notes

- The remaining technical content (hostgroup model, weight semantics, `transaction_persistent`, `REPLICATION CLIENT` grant for monitor user, `OFFLINE_SOFT` state, default `admin:admin` credentials, ports 6032/6033, `mysql-monitor_*` and `mysql-connection_max_age_ms` global variable names, `mysql_users` and `mysql_query_rules` schemas) all match the official ProxySQL documentation.
- The query-rule "transactions" comment for `^SELECT.*FOR UPDATE$` is slightly loose — `FOR UPDATE` is a row-locking construct rather than something inherent to transactions — but the SQL itself is correct, so I left the wording alone per the scope of this review.
- `apt-key add` is deprecated on modern Ubuntu; the rewritten install instructions sidestep this entirely by writing the keyring directly under `/etc/apt/trusted.gpg.d/`, which is the approach the current upstream docs recommend.
