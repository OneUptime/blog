# How to Configure Max Concurrent Queries Per User in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Concurrency, User Profile, max_concurrent_queries, Resource Quota, Settings Profile

Description: Limit the number of simultaneous queries each user can run in ClickHouse to prevent individual users from exhausting cluster resources.

---

In a multi-user ClickHouse cluster, a single user running many concurrent heavy queries can exhaust CPU and memory, degrading performance for everyone. Per-user concurrent query limits enforce fair resource usage without requiring complex scheduling systems.

## Setting max_concurrent_queries_for_user

In `users.xml`, define settings profiles with per-user concurrency limits, then assign them to users:

```xml
<!-- users.xml -->
<profiles>
  <alice_profile>
    <max_concurrent_queries_for_user>5</max_concurrent_queries_for_user>
  </alice_profile>
  <reporting_bot_profile>
    <max_concurrent_queries_for_user>2</max_concurrent_queries_for_user>
  </reporting_bot_profile>
</profiles>

<users>
  <alice>
    <profile>alice_profile</profile>
  </alice>
  <reporting_bot>
    <profile>reporting_bot_profile</profile>
  </reporting_bot>
</users>
```

Or apply it via SQL user management:

```sql
CREATE SETTINGS PROFILE analyst_profile
  SETTINGS max_concurrent_queries_for_user = 5;

ALTER USER alice ADD PROFILES 'analyst_profile';
```

## Global Fallback with max_concurrent_queries

The global limit acts as an upper bound regardless of per-user settings. Set it in `config.xml`:

```xml
<!-- config.xml -->
<max_concurrent_queries>200</max_concurrent_queries>
```

A user cannot exceed their per-user limit even if the global capacity is available.

## Checking Current Per-User Query Count

```sql
SELECT
    user,
    count()           AS active_queries,
    max(elapsed)      AS longest_elapsed_sec
FROM system.processes
GROUP BY user
ORDER BY active_queries DESC;
```

## Setting Limits via SQL (ClickHouse 22.4+)

```sql
ALTER USER bob
  SETTINGS max_concurrent_queries_for_user = 3 MAX;
```

The `MAX` keyword means the user cannot override this limit in their session.

## Per-Role Limits

Assign roles with different concurrency allowances:

```sql
CREATE ROLE heavy_analyst SETTINGS max_concurrent_queries_for_user = 10;

CREATE ROLE light_reader SETTINGS max_concurrent_queries_for_user = 2;

GRANT heavy_analyst TO data_science_team;
GRANT light_reader  TO marketing_team;
```

## Handling Rejected Queries

When a user exceeds their limit, ClickHouse throws:

```text
Code: 202. DB::Exception: Too many simultaneous queries for user.
```

Applications should implement retry logic with exponential backoff:

```python
import time, clickhouse_connect

def query_with_retry(client, sql, max_retries=3):
    for attempt in range(max_retries):
        try:
            return client.query(sql)
        except Exception as e:
            if 'Too many simultaneous queries' in str(e):
                time.sleep(2 ** attempt)
            else:
                raise
    raise RuntimeError("Query failed after retries")
```

## Summary

Per-user concurrent query limits in ClickHouse are set via `max_concurrent_queries_for_user` in settings profiles or user definitions. Combine per-user limits with a global `max_concurrent_queries` ceiling, use roles for team-level policies, and implement retry logic in client applications to handle temporary rejections gracefully.
