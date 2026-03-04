# How to Use pgbench for PostgreSQL Load Testing on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, PostgreSQL

Description: Step-by-step guide on use pgbench for postgresql load testing on rhel 9 with practical examples and commands.

---

pgbench is the standard PostgreSQL benchmarking tool, available on RHEL 9 for database performance testing.

## Install PostgreSQL and pgbench

```bash
sudo dnf install -y postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql
```

## Initialize the Test Database

```bash
sudo -u postgres createdb pgbench_test
sudo -u postgres pgbench -i -s 100 pgbench_test
```

The scale factor (-s 100) creates approximately 1.5 GB of test data.

## Run a Standard Benchmark

```bash
sudo -u postgres pgbench -c 10 -j 4 -T 300 pgbench_test
```

Parameters:
- `-c 10`: 10 concurrent clients
- `-j 4`: 4 threads
- `-T 300`: Run for 300 seconds

## Read-Only Benchmark

```bash
sudo -u postgres pgbench -c 20 -j 8 -T 300 -S pgbench_test
```

## Custom Workload

```sql
-- custom.sql
\set aid random(1, 100000 * :scale)
SELECT abalance FROM pgbench_accounts WHERE aid = :aid;
```

```bash
sudo -u postgres pgbench -c 10 -j 4 -T 300 -f custom.sql pgbench_test
```

## Key Metrics

- **TPS (Transactions Per Second)**: Overall throughput
- **Latency**: Average and standard deviation
- **Connection time**: Overhead of establishing connections

## Conclusion

pgbench on RHEL 9 provides standardized PostgreSQL benchmarks. Use consistent parameters across tests to measure the impact of configuration changes, hardware upgrades, or kernel tuning.

