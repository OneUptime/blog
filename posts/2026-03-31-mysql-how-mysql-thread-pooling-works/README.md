# How MySQL Thread Pooling Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Thread Pool, Performance, Scalability, Database Administration

Description: Learn how MySQL thread pooling manages connection threads to improve scalability and reduce context switching overhead under high concurrency.

---

## What Is Thread Pooling in MySQL

By default, MySQL creates one thread per client connection (one-thread-per-connection model). This works well for hundreds of connections but degrades under thousands due to OS context switching overhead and memory usage.

Thread pooling assigns a fixed pool of worker threads to handle many connections. Connections are queued when all threads are busy, reducing context switching and improving throughput under high concurrency.

## Thread Pool Availability

- **MySQL Enterprise Edition** - includes the Thread Pool plugin.
- **MariaDB** - includes thread pooling as a built-in feature.
- **Percona Server** - includes a thread pool plugin.
- **Community Edition** - does not include thread pooling; use ProxySQL or connection poolers like PgBouncer-equivalent tools.

## Loading the Thread Pool Plugin (Enterprise)

```sql
INSTALL PLUGIN thread_pool SONAME 'thread_pool.so';
```

Or configure at startup in `my.cnf`:

```text
[mysqld]
plugin-load-add=thread_pool.so
```

## Thread Pool Architecture

The thread pool divides connections into **thread groups**. Each group has:
- A queue of waiting statements.
- A set of worker threads that pick up and execute statements.

A single background timer thread monitors all thread groups and adds extra threads to any group where statements appear stalled.

```text
Connection 1 ---\                    /--> Worker Thread 1
Connection 2 ---->  Thread Group 1  -|
Connection 3 ---/   (queue)          \--> Worker Thread 2

Connection 4 ---\                    /--> Worker Thread 3
Connection 5 ---->  Thread Group 2  -|
Connection 6 ---/   (queue)          \--> Worker Thread 4
```

## Key Configuration Variables

```sql
SHOW VARIABLES LIKE 'thread_pool%';
```

| Variable | Description | Default |
|----------|-------------|---------|
| `thread_pool_size` | Number of thread groups (usually set to CPU cores) | 16 |
| `thread_pool_max_threads` | Max total threads across all groups | 100000 |
| `thread_pool_stall_limit` | Milliseconds before a statement is considered stalled | 60 |
| `thread_pool_prio_kickup_timer` | Time before low-priority statements get promoted | 1000 |
| `thread_pool_high_prio_mode` | How high-priority queue is used | transactions |

### Set Thread Pool Size to CPU Count

```text
[mysqld]
thread_pool_size = 16
```

## Priority Queuing

The thread pool uses two priority levels:
- **High priority** - transactions that are already started (to prevent lock starvation).
- **Low priority** - new transactions.

This ensures that in-flight transactions complete quickly rather than holding locks while waiting in a queue behind new transactions.

```sql
SHOW VARIABLES LIKE 'thread_pool_high_prio_mode';
-- 'transactions': in-flight transactions get high priority
-- 'statements': all statements in a started transaction get high priority
-- 'none': no high-priority queue
```

## Monitoring the Thread Pool

```sql
-- View thread group status
SELECT * FROM information_schema.TP_THREAD_GROUP_STATS\G

-- View individual thread state
SELECT * FROM information_schema.TP_THREAD_STATE;
```

Key metrics from `TP_THREAD_GROUP_STATS`:
- `QUERIES_QUEUED` - number of statements placed in the queue.
- `STALLED_QUERIES_EXECUTED` - number of stalled queries that were executed.
- `THREADS_STARTED` - number of threads started.

## Thread Pool vs Default Thread Model

```text
Default (one-thread-per-connection):
- 1000 connections = 1000 OS threads
- High memory and context switching overhead
- Degrades above ~300-500 active queries

Thread Pool:
- 1000 connections may use only 16-32 OS threads
- Low context switching overhead
- Scales to thousands of connections with minimal degradation
```

## Using ProxySQL as a Connection Pool (Community Edition Alternative)

Without the Enterprise thread pool, use ProxySQL:

```bash
# Install ProxySQL
sudo apt install proxysql

# Configure in /etc/proxysql.cnf
```

```text
mysql_servers =
(
  {
    address="127.0.0.1"
    port=3306
    hostgroup=0
    max_connections=100
  }
)
```

ProxySQL maintains a fixed pool of backend connections and multiplexes thousands of client connections over them.

## Summary

MySQL thread pooling replaces the one-thread-per-connection model with a fixed pool of worker threads organized into groups. This dramatically reduces OS context switching overhead and memory usage under high concurrency, allowing MySQL to handle thousands of connections efficiently. Use the Enterprise thread pool plugin for MySQL CE alternatives like Percona Server, or deploy ProxySQL as a connection pooler in front of MySQL Community Edition.
