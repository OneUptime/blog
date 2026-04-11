# How to Use pt-stalk for MySQL Diagnostics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Diagnostic, Monitoring, Percona, Performance

Description: Learn how to use pt-stalk to automatically collect MySQL diagnostic data when performance problems occur, capturing the evidence you need for root cause analysis.

---

## What is pt-stalk?

`pt-stalk` is a Percona Toolkit utility that watches MySQL metrics and automatically collects diagnostic snapshots when a problem condition is detected. Instead of manually running diagnostic commands during an incident, pt-stalk runs continuously in the background and triggers a data collection run when a metric crosses a threshold. This captures real-time evidence of the problem that would otherwise be lost by the time you log in.

## Installation

```bash
# Ubuntu/Debian
sudo apt-get install percona-toolkit

# CentOS/RHEL
sudo yum install percona-toolkit
```

## Basic Usage

Trigger collection when `Threads_running` exceeds 50:

```bash
pt-stalk \
  --function=status \
  --variable=Threads_running \
  --threshold=50 \
  --cycles=5 \
  --dest=/var/lib/pt-stalk \
  --host=127.0.0.1 \
  --user=root \
  --password=secret
```

- `--function=status` reads from `SHOW GLOBAL STATUS`
- `--variable` specifies which status variable to watch
- `--threshold=50` triggers when the value exceeds 50
- `--cycles=5` requires the condition to be true for 5 consecutive checks before triggering

## What Data pt-stalk Collects

When triggered, pt-stalk collects a wide snapshot of MySQL state:

```text
SHOW FULL PROCESSLIST
SHOW ENGINE INNODB STATUS
SHOW GLOBAL STATUS
SHOW GLOBAL VARIABLES
SHOW SLAVE STATUS (or SHOW REPLICA STATUS in MySQL 8.0)
OS metrics (vmstat, iostat, netstat, ps, df, top)
Error log snapshot
```

All data is saved to timestamped files in the destination directory.

## Reviewing Collected Data

```bash
ls /var/lib/pt-stalk/
```

```text
2026_03_31_10_45_01-processlist
2026_03_31_10_45_01-innodb-status
2026_03_31_10_45_01-variables
2026_03_31_10_45_01-status
2026_03_31_10_45_01-vmstat
2026_03_31_10_45_01-iostat
```

Review the InnoDB status for lock waits:

```bash
cat /var/lib/pt-stalk/2026_03_31_10_45_01-innodb-status | grep -A20 "LATEST DETECTED DEADLOCK"
```

## Watching a Custom Metric

Watch for a high number of locked threads:

```bash
pt-stalk \
  --function=status \
  --variable=Innodb_row_lock_waits \
  --threshold=1000 \
  --dest=/var/lib/pt-stalk \
  --host=127.0.0.1 \
  --user=root \
  --password=secret
```

## Running as a Background Daemon

```bash
nohup pt-stalk \
  --function=status \
  --variable=Threads_running \
  --threshold=40 \
  --dest=/var/lib/pt-stalk \
  --host=127.0.0.1 \
  --user=root \
  --password=secret \
  --log=/var/log/pt-stalk.log &
```

## Analyzing Results with pt-sift

Percona Toolkit includes `pt-sift` to summarize pt-stalk output:

```bash
pt-sift /var/lib/pt-stalk/2026_03_31_10_45_01
```

This displays a condensed view of all collected metrics for that incident window.

## Summary

`pt-stalk` is one of the most valuable proactive diagnostic tools for MySQL DBAs. Deploy it on production servers watching key metrics like `Threads_running` or `Innodb_row_lock_waits`, point it at a destination directory with sufficient space, and let it silently capture evidence whenever problems occur. The collected data gives you everything needed for root cause analysis after an incident.
