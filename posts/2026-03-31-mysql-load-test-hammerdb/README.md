# How to Load Test MySQL with HammerDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Load Test, HammerDB, Performance

Description: Learn how to load test MySQL using HammerDB with the TPC-C and TPC-H workloads, interpret results, and identify performance bottlenecks under realistic concurrent load.

---

## What Is HammerDB

HammerDB is an open-source load testing tool for databases that implements industry-standard TPC-C (OLTP) and TPC-H (analytic) workloads. It is more realistic than raw benchmark tools because it simulates real transaction patterns such as new orders, payments, and order status lookups, rather than simple insert or select loops.

## Installing HammerDB

```bash
# Download and extract HammerDB on Linux
wget https://github.com/TPC-Council/HammerDB/releases/download/v4.9/HammerDB-4.9-Linux.tar.gz
tar -xzf HammerDB-4.9-Linux.tar.gz
cd HammerDB-4.9
```

Start the CLI:

```bash
./hammerdbcli
```

## Creating the TPC-C Schema

HammerDB uses a Tcl scripting interface. Create a build script:

```tcl
# build_tpcc.tcl
dbset db mysql
dbset bm TPC-C

# Connection settings
diset connection mysql_host     127.0.0.1
diset connection mysql_port     3306
diset tpcc mysql_user           hammerdb
diset tpcc mysql_pass           hammerpass
diset tpcc mysql_dbase          tpcc

# Warehouse count (1 warehouse = ~100 MB)
diset tpcc mysql_count_ware  10
diset tpcc mysql_num_vu      4

buildschema
waittocomplete
exit
```

Run the build:

```bash
./hammerdbcli auto build_tpcc.tcl
```

## Running the TPC-C Load Test

```tcl
# run_tpcc.tcl
dbset db mysql
dbset bm TPC-C

diset connection mysql_host  127.0.0.1
diset connection mysql_port  3306
diset tpcc mysql_user        hammerdb
diset tpcc mysql_pass        hammerpass
diset tpcc mysql_dbase       tpcc

# Test duration: 2-minute ramp + 5-minute measurement
diset tpcc mysql_rampup   2
diset tpcc mysql_duration 5

# Number of virtual users (concurrent threads)
vuset vu 16

loadscript
vucreate
vurun
waittocomplete
exit
```

```bash
./hammerdbcli auto run_tpcc.tcl
```

## Interpreting Results

HammerDB reports NOPM (New Orders Per Minute) and TPM (Transactions Per Minute):

```text
Vuser 1:TEST RESULT : System achieved 12450 NOPM from 28312 MySQL TPM
```

Higher NOPM means more throughput. Compare results before and after configuration changes.

## Running the TPC-H Analytic Workload

```tcl
# run_tpch.tcl
dbset db mysql
dbset bm TPC-H

diset connection mysql_host   127.0.0.1
diset connection mysql_port   3306

diset tpch mysql_scale_fact   1
diset tpch mysql_tpch_user    hammerdb
diset tpch mysql_tpch_pass    hammerpass
diset tpch mysql_tpch_dbase   tpch

buildschema
waittocomplete

loadscript
vucreate
vurun
waittocomplete
exit
```

## MySQL Configuration for Load Testing

Tune MySQL to handle high concurrency before running the benchmark:

```ini
[mysqld]
innodb_buffer_pool_size     = 4G
innodb_log_file_size        = 512M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method         = O_DIRECT
max_connections             = 500
innodb_io_capacity          = 2000
innodb_io_capacity_max      = 4000
```

## Monitoring During the Test

```bash
# Watch InnoDB status during the test
watch -n 2 "mysql -u root -prootpass -e 'SHOW ENGINE INNODB STATUS\G' 2>/dev/null | grep -A5 'TRANSACTIONS'"

# Track connections and queries per second
mysqladmin -u root -prootpass extended-status | grep -E "Threads_running|Questions|Com_"
```

## Summary

HammerDB provides realistic TPC-C and TPC-H workloads for MySQL load testing. Build the schema with the desired warehouse count, run the test with the appropriate virtual user count and duration, and read the NOPM result to measure throughput. Combine HammerDB results with MySQL's `SHOW ENGINE INNODB STATUS` and slow query log to identify bottlenecks before they appear in production.
