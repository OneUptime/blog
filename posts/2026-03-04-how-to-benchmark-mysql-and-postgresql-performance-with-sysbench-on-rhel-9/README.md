# How to Benchmark MySQL and PostgreSQL Performance with sysbench on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Performance, Benchmarking, PostgreSQL, MySQL

Description: Step-by-step guide on benchmark mysql and postgresql performance with sysbench on rhel 9 with practical examples and commands.

---

sysbench provides standardized database benchmarks for MySQL and PostgreSQL on RHEL 9.

## Install sysbench

```bash
sudo dnf install -y epel-release
sudo dnf install -y sysbench
```

## MySQL Benchmark

### Prepare the Database

```bash
mysql -u root -p -e "CREATE DATABASE sbtest;"

sysbench oltp_read_write \
  --mysql-host=localhost \
  --mysql-user=root \
  --mysql-password=yourpass \
  --mysql-db=sbtest \
  --tables=10 \
  --table-size=100000 \
  prepare
```

### Run the Benchmark

```bash
sysbench oltp_read_write \
  --mysql-host=localhost \
  --mysql-user=root \
  --mysql-password=yourpass \
  --mysql-db=sbtest \
  --tables=10 \
  --table-size=100000 \
  --threads=16 \
  --time=300 \
  --report-interval=10 \
  run
```

## PostgreSQL Benchmark

### Prepare

```bash
sudo -u postgres createdb sbtest

sysbench oltp_read_write \
  --pgsql-host=localhost \
  --pgsql-user=postgres \
  --pgsql-db=sbtest \
  --tables=10 \
  --table-size=100000 \
  prepare
```

### Run

```bash
sysbench oltp_read_write \
  --pgsql-host=localhost \
  --pgsql-user=postgres \
  --pgsql-db=sbtest \
  --tables=10 \
  --table-size=100000 \
  --threads=16 \
  --time=300 \
  run
```

## Key Metrics

- **Transactions per second (TPS)**: Overall throughput
- **Latency**: Average, P95, P99 response times
- **Read/Write ratio**: Matches your workload pattern

## Clean Up

```bash
sysbench oltp_read_write --mysql-db=sbtest cleanup
```

## Conclusion

sysbench on RHEL 9 provides reproducible database benchmarks for MySQL and PostgreSQL. Use consistent test parameters across environments to make valid performance comparisons.

