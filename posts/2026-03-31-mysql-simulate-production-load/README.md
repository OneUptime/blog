# How to Simulate Production Load on MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Load Testing, Performance, Benchmarking

Description: Learn how to simulate realistic production-like load on MySQL using replay tools, custom scripts, and workload generators to validate capacity before deploying changes.

---

## Why Simulate Production Load

Benchmarks like sysbench and HammerDB use synthetic workloads that may not match your application's actual query mix. Simulating production load means capturing real queries and replaying them at scale, which reveals how your specific schema and access patterns behave under stress.

## Approach 1 - Capture and Analyze with pt-query-digest

Capture general queries from the production server, then analyze them to understand the workload:

```bash
# Step 1: Enable general query log on production (briefly)
mysql -u root -p -e "
  SET GLOBAL general_log    = ON;
  SET GLOBAL general_log_file = '/tmp/mysql_general.log';
"

# Run your application for a few minutes to collect representative queries

# Step 2: Disable log
mysql -u root -p -e "SET GLOBAL general_log = OFF;"

# Step 3: Analyze the captured workload
pt-query-digest --type=genlog /tmp/mysql_general.log > query_report.txt
```

## Approach 2 - Custom Load Script with Python

Write a script that fires a realistic mix of reads and writes concurrently:

```python
import threading
import random
import pymysql
import time

DB_CONFIG = {
    "host":     "127.0.0.1",
    "port":     3306,
    "user":     "loadtest",
    "password": "loadpass",
    "database": "app_prod_clone",
}

def read_workload(thread_id, duration_seconds=60):
    conn = pymysql.connect(**DB_CONFIG)
    end_time = time.time() + duration_seconds
    queries = 0
    while time.time() < end_time:
        user_id = random.randint(1, 100_000)
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, email FROM users WHERE id = %s", (user_id,)
            )
            cur.fetchone()
        queries += 1
    conn.close()
    print(f"Thread {thread_id} read: {queries} queries")

def write_workload(thread_id, duration_seconds=60):
    conn = pymysql.connect(**DB_CONFIG, autocommit=True)
    end_time = time.time() + duration_seconds
    queries = 0
    while time.time() < end_time:
        user_id = random.randint(1, 100_000)
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET last_seen = NOW() WHERE id = %s",
                (user_id,)
            )
        queries += 1
        time.sleep(0.01)  # 100 writes/sec per thread
    conn.close()
    print(f"Thread {thread_id} write: {queries} queries")

# Launch 20 read threads and 5 write threads (80/20 read-write mix)
threads = []
for i in range(20):
    threads.append(threading.Thread(target=read_workload,  args=(i,)))
for i in range(5):
    threads.append(threading.Thread(target=write_workload, args=(i,)))

for t in threads:
    t.start()
for t in threads:
    t.join()
```

## Approach 3 - Use mysqlslap for Quick Simulations

```bash
# Simulate 50 concurrent users running a mixed workload
mysqlslap \
  --host=127.0.0.1 \
  --user=loadtest \
  --password=loadpass \
  --concurrency=50 \
  --iterations=5 \
  --query="SELECT id, email FROM users WHERE id = FLOOR(1 + RAND() * 100000);
           UPDATE users SET last_seen = NOW() WHERE id = FLOOR(1 + RAND() * 100000);" \
  --create-schema=app_prod_clone \
  --delimiter=";"
```

## Monitoring During Load Test

```sql
-- Active connections and current queries
SELECT id, user, host, db, command, time, state, info
FROM information_schema.PROCESSLIST
WHERE command != 'Sleep'
ORDER BY time DESC;

-- InnoDB buffer pool hit rate
SELECT
  ROUND(
    (1 - (
      (SELECT variable_value FROM performance_schema.global_status WHERE variable_name = 'Innodb_buffer_pool_reads')
      /
      (SELECT variable_value FROM performance_schema.global_status WHERE variable_name = 'Innodb_buffer_pool_read_requests')
    )) * 100, 2
  ) AS buffer_pool_hit_rate_pct;
```

## Collecting Metrics

```bash
# Snapshot key metrics every 5 seconds during the test
while true; do
  mysql -u root -p"rootpass" -N -e "
    SHOW GLOBAL STATUS LIKE 'Queries';
    SHOW GLOBAL STATUS LIKE 'Threads_running';
    SHOW GLOBAL STATUS LIKE 'Innodb_row_lock_waits';
  " 2>/dev/null
  sleep 5
done
```

## Summary

Simulating production load on MySQL requires capturing real query patterns and replaying them with appropriate concurrency. Use Python threading scripts for a realistic read-write mix, `mysqlslap` for quick smoke tests, and `pt-query-digest` to analyze captured production logs. Monitor buffer pool hit rate, active threads, and row lock waits during the test to identify saturation points before they impact real users.
