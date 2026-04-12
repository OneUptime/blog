# How to Read and Interpret MongoDB Log Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Log, Troubleshooting, Diagnostic, Slow Query

Description: Learn how to read MongoDB log files, understand the key fields in JSON log entries, and use logs to diagnose slow queries, replication issues, and errors.

---

## Log File Location and Format

By default, MongoDB writes logs to `/var/log/mongodb/mongod.log`. Since MongoDB 4.4, each line is a JSON document. Older versions used a text format with a fixed prefix pattern.

Check your current log destination:

```javascript
db.adminCommand({ getCmdLineOpts: 1 }).parsed.systemLog
```

## Anatomy of a Log Entry

Every MongoDB 4.4+ log line contains these top-level fields:

```json
{
  "t": { "$date": "2026-03-31T08:15:30.412+00:00" },
  "s": "I",
  "c": "COMMAND",
  "id": 51803,
  "ctx": "conn987",
  "msg": "Slow query",
  "attr": { "ns": "shop.orders", "durationMillis": 2145 }
}
```

- `t` - ISO timestamp with millisecond precision
- `s` - severity: F (fatal), E (error), W (warning), I (informational), D1–D5 (debug verbosity levels)
- `c` - component: COMMAND, QUERY, REPL, NETWORK, STORAGE, INDEX, etc.
- `id` - stable numeric message ID, useful for searching documentation
- `ctx` - thread/connection context
- `attr` - message-specific attributes

## Finding Slow Queries

Slow queries are logged as COMMAND entries with `durationMillis` above the `slowms` threshold (default 100ms):

```bash
# Extract slow queries sorted by duration
grep '"c":"COMMAND"' /var/log/mongodb/mongod.log | \
  python3 -c "
import sys, json
lines = []
for line in sys.stdin:
    try:
        d = json.loads(line)
        ms = d.get('attr',{}).get('durationMillis', 0)
        if ms > 100:
            lines.append((ms, d['attr'].get('ns',''), d['t'].get('\$date','')))
    except: pass
for ms, ns, ts in sorted(lines, reverse=True)[:20]:
    print(f'{ms}ms  {ns}  {ts}')
"
```

## Identifying Connection and Network Events

```bash
# Count connection events
grep '"c":"NETWORK"' /var/log/mongodb/mongod.log | \
  python3 -c "
import sys, json
from collections import Counter
c = Counter()
for line in sys.stdin:
    try:
        d = json.loads(line)
        c[d.get('msg','')] += 1
    except: pass
for msg, n in c.most_common(10): print(n, msg)
"
```

Common network messages include `connection accepted`, `connection ended`, and `Error receiving request from client`.

## Reading Replication Log Entries

Replication events appear under component `REPL`:

```bash
grep '"c":"REPL"' /var/log/mongodb/mongod.log | tail -50 | \
  python3 -c "
import sys, json
for line in sys.stdin:
    try:
        d = json.loads(line)
        print(d['t']['\$date'], d['s'], d['msg'], json.dumps(d.get('attr',{}))[:120])
    except: pass
"
```

Look for messages about `election`, `optime`, `rollback`, and `sync source` to diagnose replication lag or failover events.

## Using mloginfo for Log Summary

The `mtools` Python package provides `mloginfo` for quick log analysis:

```bash
pip install mtools

# Summary of slow queries by namespace
mloginfo /var/log/mongodb/mongod.log --queries

# Connection count over time
mloginfo /var/log/mongodb/mongod.log --connections

# Restarts detected in the log
mloginfo /var/log/mongodb/mongod.log --restarts
```

## Log Rotation and Retention

Rotate logs without restarting mongod:

```bash
# Signal mongod to close and reopen the log file
kill -SIGUSR1 $(pidof mongod)
# Or via the shell
mongosh --eval "db.adminCommand({ logRotate: 1 })"
```

Configure logrotate for automatic daily rotation:

```text
/var/log/mongodb/mongod.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        /usr/bin/mongosh --quiet --eval "db.adminCommand({ logRotate: 1 })" > /dev/null 2>&1
    endscript
}
```

## Summary

MongoDB JSON logs contain stable fields (`t`, `s`, `c`, `id`, `ctx`, `attr`) that make programmatic analysis straightforward. Use `grep` and Python for ad hoc filtering, `mloginfo` from mtools for summaries, and ship logs to a central platform for long-term analysis. Focus on `COMMAND` entries for slow queries, `REPL` entries for replication health, and `NETWORK` entries for connection churn. Combine with regular log rotation to prevent disk exhaustion.
