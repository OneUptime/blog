# How to Configure Query Rules in ProxySQL for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, ProxySQL, Query Rule, Routing, Performance

Description: Learn how to configure query rules in ProxySQL to route MySQL queries to specific backends, enabling read-write splitting and traffic shaping.

---

## What Are ProxySQL Query Rules

ProxySQL uses a rules engine to inspect incoming SQL queries and route them to the correct backend hostgroup. Rules are evaluated by ascending `rule_id` order and matched against the query text using regular expressions. When a rule matches, ProxySQL applies the configured action - routing to a hostgroup, caching the result, rewriting the query, or blocking it entirely.

## Setting Up Hostgroups

Before creating rules you need at least two hostgroups: one for the primary (writes) and one for replicas (reads).

```sql
INSERT INTO mysql_servers (hostgroup_id, hostname, port) VALUES (10, '192.168.1.10', 3306);
INSERT INTO mysql_servers (hostgroup_id, hostname, port) VALUES (20, '192.168.1.11', 3306);
INSERT INTO mysql_servers (hostgroup_id, hostname, port) VALUES (20, '192.168.1.12', 3306);
LOAD MYSQL SERVERS TO RUNTIME;
SAVE MYSQL SERVERS TO DISK;
```

## Creating Basic Read-Write Rules

Add a rule to send `SELECT` statements to the read hostgroup and all other queries to the write hostgroup.

```sql
-- Route SELECT queries to replicas (hostgroup 20)
INSERT INTO mysql_query_rules (
  rule_id, active, match_pattern, destination_hostgroup, apply
) VALUES (1, 1, '^SELECT', 20, 1);

-- Route everything else to primary (hostgroup 10)
INSERT INTO mysql_query_rules (
  rule_id, active, match_pattern, destination_hostgroup, apply
) VALUES (2, 1, '.*', 10, 1);

LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL QUERY RULES TO DISK;
```

## Handling SELECT FOR UPDATE

`SELECT ... FOR UPDATE` acquires row locks and must run on the primary. Add a higher-priority rule before the generic `SELECT` rule.

```sql
INSERT INTO mysql_query_rules (
  rule_id, active, match_pattern, destination_hostgroup, apply
) VALUES (0, 1, '^SELECT.*FOR UPDATE', 10, 1);

LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL QUERY RULES TO DISK;
```

## Routing by Schema or User

You can scope rules to a specific schema or username by setting `schemaname` or `username` columns.

```sql
INSERT INTO mysql_query_rules (
  rule_id, active, username, match_pattern, destination_hostgroup, apply
) VALUES (5, 1, 'analytics_user', '^SELECT', 20, 1);
```

This sends all queries from `analytics_user` that start with `SELECT` to replicas, leaving other users unaffected.

## Query Rewriting

ProxySQL can rewrite queries before forwarding them, which is useful for adding hints or stripping unsupported syntax.

```sql
INSERT INTO mysql_query_rules (
  rule_id, active, match_pattern, replace_pattern, destination_hostgroup, apply
) VALUES (10, 1,
  '^SELECT (.*) FROM orders',
  'SELECT SQL_NO_CACHE \1 FROM orders',
  20, 1
);

LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL QUERY RULES TO DISK;
```

## Blocking Dangerous Queries

Rules without a `destination_hostgroup` and with `error_msg` set will return an error to the client instead of forwarding the query.

```sql
INSERT INTO mysql_query_rules (
  rule_id, active, match_pattern, error_msg, apply
) VALUES (100, 1, '^DROP TABLE', 'DROP TABLE not allowed through proxy', 1);

LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL QUERY RULES TO DISK;
```

## Verifying Rule Hits

Check how many times each rule has matched since the last reset:

```sql
SELECT s.rule_id, s.hits, r.match_pattern, r.destination_hostgroup
FROM stats_mysql_query_rules s
JOIN mysql_query_rules r ON s.rule_id = r.rule_id
ORDER BY s.rule_id;
```

A `hits` value of 0 for an active rule usually means the pattern never matched, which is a good way to catch misconfigured regex.

## Summary

ProxySQL query rules give you fine-grained control over MySQL traffic routing. By combining `match_pattern` with `username`, `schemaname`, and `destination_hostgroup`, you can implement read-write splitting, per-user routing, query blocking, and rewriting - all without changing application code. Always verify rule activity using `stats_mysql_query_rules` and keep `rule_id` values well-spaced so you can insert new rules without renumbering.
