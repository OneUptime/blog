# How to Use pt-kill to Manage MySQL Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query, Kill, Percona, Performance

Description: Learn how to use pt-kill to automatically identify and kill long-running or problematic MySQL queries based on flexible matching criteria.

---

## What is pt-kill?

`pt-kill` is a Percona Toolkit utility that monitors the MySQL processlist and kills connections or queries that match specified criteria. It is useful for automatically terminating runaway queries, preventing long-running transactions from blocking other work, and protecting databases from query storms without manual intervention.

## Basic Usage

Kill queries running longer than 60 seconds:

```bash
pt-kill \
  --host=127.0.0.1 \
  --user=root \
  --password=secret \
  --busy-time=60 \
  --kill \
  --interval=10
```

`--interval=10` checks the processlist every 10 seconds.

## Print Mode - Preview Without Killing

Always test with `--print` first to see which queries would be killed:

```bash
pt-kill \
  --host=127.0.0.1 \
  --user=root \
  --password=secret \
  --busy-time=30 \
  --print \
  --interval=5
```

Output example:

```text
2026-03-31T10:00:05 KILL 1234 (Query 45 sec) SELECT * FROM orders WHERE ...
2026-03-31T10:00:05 KILL 1235 (Query 62 sec) UPDATE products SET price=...
```

## Killing Queries from Specific Users

Kill only queries from the `report_user` account running longer than 10 seconds:

```bash
pt-kill \
  --host=127.0.0.1 \
  --user=root \
  --password=secret \
  --match-user=report_user \
  --busy-time=10 \
  --kill \
  --interval=5
```

## Killing Queries Matching a Pattern

Kill any query containing a full table scan pattern:

```bash
pt-kill \
  --host=127.0.0.1 \
  --user=root \
  --password=secret \
  --match-info="SELECT \* FROM" \
  --busy-time=20 \
  --kill \
  --interval=10
```

`--match-info` accepts a Perl regex that is matched against the query text in the processlist.

## Killing Connections in a Specific Database

```bash
pt-kill \
  --host=127.0.0.1 \
  --user=root \
  --password=secret \
  --match-db=reporting_db \
  --busy-time=120 \
  --kill \
  --interval=15
```

## Protecting the DBA User

Use `--ignore-user` to ensure your own connection is never killed:

```bash
pt-kill \
  --host=127.0.0.1 \
  --user=root \
  --password=secret \
  --busy-time=60 \
  --ignore-user=root \
  --kill \
  --interval=10
```

## Running Once Instead of Continuously

For a one-shot check rather than a continuous daemon:

```bash
pt-kill \
  --host=127.0.0.1 \
  --user=root \
  --password=secret \
  --busy-time=60 \
  --kill \
  --run-time=1
```

`--run-time=1` makes pt-kill run for 1 second and then exit. It checks the processlist once at startup and stops after the specified duration elapses.

## Logging Killed Queries

```bash
pt-kill \
  --host=127.0.0.1 \
  --user=root \
  --password=secret \
  --busy-time=60 \
  --kill \
  --daemonize \
  --log=/var/log/pt-kill.log \
  --interval=10
```

`--log` requires `--daemonize` because it only captures output when pt-kill runs as a background daemon.

## Summary

`pt-kill` is an essential safety valve for MySQL environments where runaway queries can block production workloads. Always prototype with `--print` before enabling `--kill`, use `--ignore-user` to protect administrative connections, and log all kills to a file for audit purposes. Run it as a background daemon on production servers to provide automatic query termination without operator intervention.
