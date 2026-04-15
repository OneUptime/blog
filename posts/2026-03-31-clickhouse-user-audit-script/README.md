# How to Write a ClickHouse User Audit Script

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, User Audit, Script, Security, Access Control

Description: Build a ClickHouse user audit script that reports on users, roles, privileges, and recent login activity to support security reviews and compliance.

---

## Why Audit ClickHouse Users?

ClickHouse deployments often accumulate users with overly broad permissions as teams grow. Regular audits ensure that only authorized users have access, that service accounts have minimal privileges, and that inactive accounts are disabled.

## The User Audit Script

```bash
#!/usr/bin/env bash
# clickhouse-user-audit.sh

CH_HOST="${CH_HOST:-localhost}"
CH_PORT="${CH_PORT:-8123}"
CH_USER="${CH_USER:-default}"
CH_PASSWORD="${CH_PASSWORD:-}"

run_query() {
    curl -s "http://${CH_HOST}:${CH_PORT}/" \
        -u "${CH_USER}:${CH_PASSWORD}" \
        --data-binary "$1"
}

echo "=== ClickHouse User Audit Report - $(date) ==="
echo ""

echo "--- All Users and Their Authentication ---"
run_query "
SELECT
    name,
    auth_type,
    host_ip,
    host_names,
    host_names_regexp,
    default_roles_all,
    default_roles_list
FROM system.users
ORDER BY name
FORMAT PrettyCompactMonoBlock
"

echo ""
echo "--- Roles and Their Members ---"
run_query "
SELECT
    user_name,
    role_name,
    granted_role_name,
    with_admin_option
FROM system.role_grants
ORDER BY user_name, role_name, granted_role_name
FORMAT PrettyCompactMonoBlock
"

echo ""
echo "--- Grants Per User ---"
run_query "
SELECT
    user_name,
    access_type,
    database,
    table,
    column,
    is_partial_revoke
FROM system.grants
WHERE user_name != ''
ORDER BY user_name, access_type
FORMAT PrettyCompactMonoBlock
"

echo ""
echo "--- Users Who Have Not Queried in 30 Days ---"
run_query "
SELECT
    u.name AS username,
    max(q.event_time) AS last_query,
    dateDiff('day', max(q.event_time), now()) AS days_inactive
FROM system.users u
LEFT JOIN system.query_log q ON q.user = u.name AND q.type = 'QueryFinish'
GROUP BY u.name
HAVING last_query < now() - INTERVAL 30 DAY
ORDER BY days_inactive DESC
FORMAT PrettyCompactMonoBlock
"

echo ""
echo "--- Recent Login Failures ---"
run_query "
SELECT
    event_time,
    user,
    client_hostname,
    exception
FROM system.query_log
WHERE type = 'ExceptionBeforeStart' AND exception LIKE '%Authentication%'
AND event_time >= now() - INTERVAL 7 DAY
ORDER BY event_time DESC
LIMIT 20
FORMAT PrettyCompactMonoBlock
"
```

## Finding Over-Privileged Users

```bash
run_query "
SELECT user_name, count() AS grant_count
FROM system.grants
WHERE access_type IN ('ALL', 'CREATE', 'DROP', 'SYSTEM')
GROUP BY user_name
ORDER BY grant_count DESC
FORMAT PrettyCompactMonoBlock
"
```

## Scheduling the Audit

```bash
# Weekly audit every Monday at 6 AM
(crontab -l 2>/dev/null; echo "0 6 * * 1 /opt/scripts/clickhouse-user-audit.sh > /var/log/ch-user-audit.log 2>&1") | crontab -
```

## Summary

A ClickHouse user audit script queries `system.users`, `system.grants`, `system.role_grants`, and `system.query_log` to produce a comprehensive view of who has access, what privileges they hold, and how recently they have been active. Running this weekly supports both security reviews and compliance requirements.
