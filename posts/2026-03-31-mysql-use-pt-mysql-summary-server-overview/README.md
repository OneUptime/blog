# How to Use pt-mysql-summary for MySQL Server Overview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Diagnostic, Percona, Monitoring, Summary

Description: Learn how to use pt-mysql-summary to generate a comprehensive human-readable overview of a MySQL server's configuration, status, and health.

---

## What is pt-mysql-summary?

`pt-mysql-summary` is a Percona Toolkit utility that connects to a MySQL server and produces a detailed, structured report covering configuration, replication status, schema statistics, InnoDB metrics, and operating system information. It is one of the first tools to run when diagnosing an unfamiliar MySQL server or troubleshooting a production issue, because it consolidates dozens of queries and system commands into a single readable snapshot.

## Basic Usage

```bash
pt-mysql-summary --host=127.0.0.1 --user=root --password=secret
```

You can also use the `--` separator to pass arguments directly to the underlying `mysql` client:

```bash
pt-mysql-summary -- --host=127.0.0.1 --user=root --password=secret
```

Arguments after `--` are forwarded to the `mysql` client that `pt-mysql-summary` invokes internally. For standard connection options like `--host`, `--user`, and `--password`, both forms work equivalently.

## Output Sections

The report is divided into clearly labeled sections:

```text
# Percona Toolkit MySQL Summary Report #######################
# Instances ###################################################
# MySQL Executable ############################################
# Report On Port 3306 #########################################
# Processlist #################################################
# Status Counters #############################################
# Table cache #################################################
# InnoDB #####################################################
# Security ####################################################
# Binary Logging #############################################
# Noteworthy Variables ########################################
# Schema #####################################################
# Noteworthy Technologies #####################################
# Configuration File ##########################################
```

## Key Sections Explained

The `# Report On Port` section highlights key server parameters and replication status:

```text
         Port | 3306
        Socket | /var/run/mysqld/mysqld.sock
       Version | 8.0.36
   Compiled on | Linux x86_64
    Replication | Is not a slave, has 1 slaves connected
```

The `# Binary Logging` section shows binary log details:

```text
              Binlogs | 42
           Zero-Sized | 0
           Total Size | 100.0M
        binlog_format | ROW
   expire_logs_days | 7
         sync_binlog | 1
```

## Saving the Report

Always save the output for future reference and incident documentation:

```bash
pt-mysql-summary -- \
  --host=127.0.0.1 \
  --user=root \
  --password=secret \
  > mysql_summary_$(date +%Y%m%d_%H%M%S).txt
```

## Remote Server Analysis

```bash
pt-mysql-summary -- \
  --host=db.prod.internal \
  --port=3306 \
  --user=dba_admin \
  --password=secret
```

## Analyzing Replication Replicas

Run separately on each replica to capture their individual status:

```bash
# On the primary
pt-mysql-summary -- --host=primary.db --user=root --password=secret > primary_summary.txt

# On the replica
pt-mysql-summary -- --host=replica.db --user=root --password=secret > replica_summary.txt
```

Compare the reports to identify configuration differences that could affect replication performance.

## Schema Statistics Section

The tool also reports on database sizes and table counts:

```text
  Database  Tables   Views  SPs Trigs  Funcs    FKs  Partn
    mydb      142       8    12     5      3     89      0
    archive    18       0     0     0      0      5      0
```

This is useful for capacity planning and understanding schema complexity.

## Using with pt-variable-advisor

For a complete server review, combine both tools:

```bash
pt-mysql-summary -- --host=127.0.0.1 --user=root --password=secret
echo "---VARIABLE ADVISOR---"
pt-variable-advisor --host=127.0.0.1 --user=root --password=secret
```

## Summary

`pt-mysql-summary` is the first tool to run on any MySQL server you need to understand quickly. It generates a complete health snapshot in seconds, covering everything from buffer pool settings to replication status to schema statistics. Keep saved reports from regular runs to track how the server changes over time and to provide baseline context during incident response.
