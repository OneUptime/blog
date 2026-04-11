# Validation Summary: How to Configure Query Rules in ProxySQL for MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- ProxySQL (query rules, hostgroups, read-write splitting, query rewriting)
- SQL (ProxySQL admin interface dialect)

## Sources Consulted
- ProxySQL official documentation: mysql_query_rules table schema (https://proxysql.com/documentation/main-runtime/)
- ProxySQL stats tables documentation (https://proxysql.com/documentation/stats-statistics/)
- ProxySQL query rewrite documentation (https://proxysql.com/documentation/query-rewrite/)
- ProxySQL global variables documentation for regex engine and re_modifiers (https://proxysql.com/documentation/global-variables/mysql-variables/)
- RE2 regex library header for backreference syntax (https://github.com/google/re2/blob/main/re2/re2.h)

## Issues Found

### 1. Incorrect query on `stats_mysql_query_rules` table
- **What was wrong:** The query in the "Verifying Rule Hits" section selected `match_pattern` and `destination_hostgroup` directly from `stats_mysql_query_rules`. That table only contains two columns: `rule_id` and `hits`. The query as written would fail with an unknown column error.
- **What was changed:** Replaced the simple `SELECT ... FROM stats_mysql_query_rules` with a JOIN between `stats_mysql_query_rules` and `mysql_query_rules` to pull in `match_pattern` and `destination_hostgroup` from the rules definition table.
- **Why:** The stats table is deliberately minimal (only rule_id and hits). The rule metadata lives in the `mysql_query_rules` table in the main schema, so a JOIN is required to display both stats and rule details together.

## Review Notes
- ProxySQL's default `re_modifiers` value is `CASELESS`, meaning `match_pattern` matching is case-insensitive by default. The post's patterns like `'^SELECT'` will correctly match `select`, `Select`, etc. This is not an error but readers expecting case-sensitive matching should be aware.
- Since ProxySQL v1.4.0, the default regex engine is PCRE (not RE2). The patterns used in this post are basic enough to work identically with both engines, so no practical issue exists.
- The `\1` backreference syntax in the query rewriting example is correct for SQL string literals passed to ProxySQL's regex engine.
