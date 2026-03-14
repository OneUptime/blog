# How to Benchmark MySQL and PostgreSQL Performance with sysbench on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Sysbench, MySQL, PostgreSQL, Benchmarking, Database

Description: Learn how to use sysbench on RHEL to benchmark MySQL and PostgreSQL databases, measuring throughput and latency under various workloads.

---

sysbench is a multi-threaded benchmark tool commonly used to evaluate database performance. It supports MySQL and PostgreSQL out of the box and can simulate OLTP workloads.

## Installing sysbench

```bash
# Install sysbench from EPEL
sudo dnf install -y epel-release
sudo dnf install -y sysbench
```

## Benchmarking MySQL

First, create a test database and user:

```bash
# Log into MySQL and create a benchmark database
mysql -u root -p -e "CREATE DATABASE sbtest;"
mysql -u root -p -e "CREATE USER 'sbuser'@'localhost' IDENTIFIED BY 'sbpass';"
mysql -u root -p -e "GRANT ALL ON sbtest.* TO 'sbuser'@'localhost';"
```

Prepare, run, and clean up the benchmark:

```bash
# Prepare the test data (10 tables, 100000 rows each)
sysbench /usr/share/sysbench/oltp_read_write.lua \
  --mysql-host=localhost \
  --mysql-user=sbuser \
  --mysql-password=sbpass \
  --mysql-db=sbtest \
  --tables=10 \
  --table-size=100000 \
  prepare

# Run the benchmark for 60 seconds with 8 threads
sysbench /usr/share/sysbench/oltp_read_write.lua \
  --mysql-host=localhost \
  --mysql-user=sbuser \
  --mysql-password=sbpass \
  --mysql-db=sbtest \
  --tables=10 \
  --table-size=100000 \
  --threads=8 \
  --time=60 \
  run

# Clean up test data
sysbench /usr/share/sysbench/oltp_read_write.lua \
  --mysql-host=localhost \
  --mysql-user=sbuser \
  --mysql-password=sbpass \
  --mysql-db=sbtest \
  --tables=10 \
  cleanup
```

## Benchmarking PostgreSQL

```bash
# Create a test database
sudo -u postgres createdb sbtest
sudo -u postgres psql -c "CREATE USER sbuser WITH PASSWORD 'sbpass';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sbtest TO sbuser;"

# Prepare the test data
sysbench /usr/share/sysbench/oltp_read_write.lua \
  --pgsql-host=localhost \
  --pgsql-user=sbuser \
  --pgsql-password=sbpass \
  --pgsql-db=sbtest \
  --tables=10 \
  --table-size=100000 \
  --db-driver=pgsql \
  prepare

# Run the benchmark
sysbench /usr/share/sysbench/oltp_read_write.lua \
  --pgsql-host=localhost \
  --pgsql-user=sbuser \
  --pgsql-password=sbpass \
  --pgsql-db=sbtest \
  --tables=10 \
  --table-size=100000 \
  --threads=8 \
  --time=60 \
  --db-driver=pgsql \
  run
```

The output includes transactions per second (TPS), queries per second (QPS), and latency percentiles. Compare results across different configurations to find optimal settings.
