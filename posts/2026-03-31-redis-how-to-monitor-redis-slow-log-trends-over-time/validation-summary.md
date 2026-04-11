# Validation Summary: How to Monitor Redis Slow Log Trends Over Time

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (SLOWLOG command, slow query monitoring)
- Python (redis-py client library)
- PostgreSQL (psycopg2, time-series storage)
- Prometheus (recording rules, alerting rules)
- Grafana (dashboards, PostgreSQL datasource)
- redis_exporter (oliver006/redis_exporter for Prometheus metrics)

## Sources Consulted
- redis-py 7.4.0 installed source code (`redis/_parsers/helpers.py`, `parse_slowlog_get` function) — verified return format of `slowlog_get()`
- Redis SLOWLOG GET documentation: https://redis.io/docs/latest/commands/slowlog-get/
- PostgreSQL documentation for `PERCENTILE_CONT`, `DATE_TRUNC`, `ON CONFLICT` syntax
- Prometheus recording rules and alerting rules documentation
- Grafana PostgreSQL datasource macro documentation (`$__timeGroup`, `$__timeFilter`)

## Issues Found

### Issue 1: `entry['command']` treated as a list instead of a string
- **What was wrong:** The collector code accessed `entry['command']` as if it were a list of arguments (e.g., `command_parts[0]` to get the command name, `command_parts[1:4]` for args). In redis-py, `slowlog_get()` returns the `command` field as a space-joined string (e.g., `"SET mykey myvalue"`), not a list. Indexing a string with `[0]` returns the first character, not the first word.
- **What was changed:** Added `.split()` to convert the command string into a list of parts: `command_parts = entry['command'].split()`. Also removed the unnecessary `list()` wrapper around the args slice since `.split()` already returns a list.
- **Why:** Verified against redis-py 7.4.0 source code (`redis/_parsers/helpers.py`), where `parse_slowlog_get` does `space.join(item[3])` — confirming the command is a space-joined string.

### Issue 2: Wrong dict key `client_addr` instead of `client_address`
- **What was wrong:** The code used `entry.get('client_addr', '')` but redis-py uses `client_address` as the key name.
- **What was changed:** Changed `client_addr` to `client_address` in the `.get()` call.
- **Why:** Verified against redis-py 7.4.0 source code, which sets `result["client_address"] = item[4]`.

### Issue 3: Same string-as-list bug in alerting code
- **What was wrong:** The alerting section had `e['command'][0].upper()` which gets the first character of the command string, not the command name.
- **What was changed:** Changed to `e['command'].split()[0].upper()` to correctly extract the command name.
- **Why:** Same root cause as Issue 1.

## Review Notes
- The `ON CONFLICT DO NOTHING` clause in the INSERT statement has no practical effect since there is no UNIQUE constraint on `redis_entry_id`. It only guards against primary key conflicts on the auto-generated `BIGSERIAL id`, which won't occur in practice. The `last_seen_id` tracking prevents duplicate collection, so this is not a bug, but the ON CONFLICT clause is misleading. A UNIQUE constraint on `redis_entry_id` would make this more robust.
- `datetime.fromtimestamp(entry['start_time'])` creates a naive (timezone-unaware) datetime, but the PostgreSQL column is `TIMESTAMPTZ`. PostgreSQL will assume the session timezone. For production use, `datetime.fromtimestamp(entry['start_time'], tz=datetime.timezone.utc)` would be more explicit, but the current code works correctly when the server timezone is consistent.
- The Prometheus metric names (`redis_slowlog_last_id`, `redis_slowlog_length`) are consistent with what oliver006/redis_exporter exposes.
- The SQL queries are syntactically correct PostgreSQL and the Grafana macros are valid.
