# How to Monitor Redis Command Stats with INFO commandstats

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Monitoring, Command, Performance, INFO

Description: Learn how to use the INFO commandstats section to see call counts and per-command execution times, identifying which commands consume the most CPU.

---

`INFO commandstats` gives you per-command call counts and cumulative execution time, making it easy to find which commands your application uses most and where time is being spent.

## Retrieve commandstats

```bash
redis-cli INFO commandstats
```

Sample output:

```text
cmdstat_get:calls=482930,usec=1254832,usec_per_call=2.60,rejected_calls=0,failed_calls=0
cmdstat_set:calls=93210,usec=428564,usec_per_call=4.60,rejected_calls=0,failed_calls=0
cmdstat_hgetall:calls=1420,usec=982100,usec_per_call=691.62,rejected_calls=0,failed_calls=0
cmdstat_keys:calls=3,usec=48200,usec_per_call=16066.67,rejected_calls=0,failed_calls=0
```

## Understanding the Fields

| Field | Meaning |
|---|---|
| `calls` | Total times this command was called since startup or last RESET |
| `usec` | Total microseconds spent executing this command |
| `usec_per_call` | Average microseconds per invocation |
| `rejected_calls` | Calls rejected before execution (e.g., wrong number of arguments, ACL denials) |
| `failed_calls` | Calls that returned an error to the client |

## Find the Most Expensive Commands

Sort by `usec_per_call` to find slow commands:

```bash
redis-cli INFO commandstats | \
  awk -F'[:,=]' '{print $1, $7}' | \
  sort -k2 -rn | head -10
```

In the sample above, `KEYS` averages 16ms per call - a clear problem.

## Find the Most Used Commands

Sort by `calls` to see your workload profile:

```bash
redis-cli INFO commandstats | \
  awk -F'[:,=]' '{print $1, $3}' | \
  sort -k2 -rn | head -10
```

## Reset Stats for a Baseline

Before benchmarking or after a deployment, reset command stats:

```bash
redis-cli CONFIG RESETSTAT
```

Wait 5-10 minutes, then run `INFO commandstats` again for a clean sample.

## Script for Periodic Monitoring

```python
import redis

r = redis.Redis(host="127.0.0.1", port=6379)

def get_top_commands(top_n=10):
    info = r.info("commandstats")
    commands = []
    for cmd, stats in info.items():
        name = cmd.replace("cmdstat_", "")
        commands.append({
            "command": name,
            "calls": stats["calls"],
            "usec_per_call": stats["usec_per_call"]
        })
    return sorted(commands, key=lambda x: x["usec_per_call"], reverse=True)[:top_n]

for cmd in get_top_commands():
    print(f"{cmd['command']:20s} avg={cmd['usec_per_call']:.2f}us calls={cmd['calls']}")
```

## Alerting Thresholds

Monitor these conditions:
- `usec_per_call` > 1000 (1ms): investigate for blocking behavior
- `keys` appearing in commandstats at all: replace with `SCAN`
- `failed_calls` increasing: type errors or permission violations

## Summary

`INFO commandstats` shows per-command call counts and average execution time in microseconds. Use `usec_per_call` to find slow commands like `KEYS` or large `HGETALL` calls, and use `calls` to understand your workload profile. Reset stats with `CONFIG RESETSTAT` before taking a baseline measurement.
