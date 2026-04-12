# How to Use LATENCY DOCTOR in Redis for Automated Diagnosis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, LATENCY DOCTOR, Latency, Performance, Diagnostic

Description: Learn how to use LATENCY DOCTOR in Redis to get an automated human-readable analysis of latency events and actionable tuning recommendations.

---

`LATENCY DOCTOR` analyzes the latency events recorded by Redis and generates a human-readable report with explanations and actionable recommendations. It is the easiest entry point for diagnosing latency spikes in Redis without deep expertise in Redis internals.

## Syntax

```text
LATENCY DOCTOR
```

Returns a formatted text report. Requires `latency-monitor-threshold` to be configured.

## Enabling Latency Monitoring

Before `LATENCY DOCTOR` can provide useful output, enable the latency monitor:

```bash
# Set threshold to 100ms - events slower than this are recorded
redis-cli CONFIG SET latency-monitor-threshold 100

# Alternatively in redis.conf:
# latency-monitor-threshold 100
```

## Running LATENCY DOCTOR

```bash
redis-cli LATENCY DOCTOR
```

If no latency events have been recorded, the output is:

```text
Dave, no latency spike was observed during the lifetime of this Redis instance, not in the slightest bit. I honestly think you ought to sit down calmly, take a stress pill, and think things over.
```

With recorded events, you get a detailed report like:

```text
Dave, I have observed latency spikes in this Redis instance.
You don't mind talking about it, do you Dave?

1. fast-command: 3 latency spikes (average 200ms, mean deviation 50ms,
    period 120.00 sec). Worst all time event 300ms.

I have a few advices for you:

- Check your Slow Log to understand what are the commands you are
    running which are too slow to execute.
```

## Common Latency Events and Their Causes

| Event | Common Cause |
|-------|-------------|
| `aof-fstat` | AOF fstat call taking too long - often due to slow disk |
| `fast-command` | Slow commands blocking the event loop |
| `fork` | Forking for background RDB or AOF save impacting performance |
| `expire-cycle` | Key expiration scan taking too long |
| `eviction-cycle` | Key eviction under memory pressure taking too long |

## Combining with LATENCY HISTORY

Get more detail by checking history for a specific event:

```bash
# See all recorded occurrences of aof-fstat latency
redis-cli LATENCY HISTORY aof-fstat
```

## Combining with LATENCY LATEST

See the most recent latency reading for each event:

```bash
redis-cli LATENCY LATEST
```

## Responding to DOCTOR Recommendations

Example remediation for common recommendations:

```bash
# High AOF latency - rewrite AOF to reduce file size
redis-cli BGREWRITEAOF

# Slow commands detected - check slowlog
redis-cli SLOWLOG GET 10

# Too many expired keys causing expiry cycle latency
redis-cli CONFIG SET hz 20  # Increase expiry scan frequency
```

## Resetting Latency History

After addressing issues, reset latency history to start fresh:

```bash
redis-cli LATENCY RESET
```

## Summary

`LATENCY DOCTOR` provides a quick, automated diagnosis of Redis latency issues with plain-English explanations and specific recommendations. Enable `latency-monitor-threshold` to start recording events, then run `LATENCY DOCTOR` when you observe performance degradation. Pair it with `LATENCY HISTORY` and `SLOWLOG` for deeper investigation.
