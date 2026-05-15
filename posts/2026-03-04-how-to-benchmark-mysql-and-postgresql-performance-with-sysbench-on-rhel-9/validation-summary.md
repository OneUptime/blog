# Validation Summary: How to Benchmark MySQL and PostgreSQL Performance with sysbench on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- EPEL
- sysbench
- MySQL
- PostgreSQL

## Sources Consulted
- sysbench upstream README and usage documentation: https://github.com/akopytov/sysbench
- sysbench OLTP benchmark source options: https://github.com/akopytov/sysbench/blob/master/src/lua/oltp_common.lua
- Red Hat blog guidance for installing EPEL on RHEL 9: https://www.redhat.com/en/blog/install-epel-linux
- Fedora Packages entry for sysbench in EPEL 9: https://packages.fedoraproject.org/pkgs/sysbench/sysbench/
- PostgreSQL createdb documentation: https://www.postgresql.org/docs/current/app-createdb.html
- MySQL command-line option documentation: https://dev.mysql.com/doc/refman/8.4/en/command-line-options.html
- MySQL CREATE DATABASE documentation: https://dev.mysql.com/doc/refman/8.4/en/create-database.html

## Issues Found
- The RHEL 9 EPEL installation command used `sudo dnf install -y epel-release`, which is not the documented stock RHEL 9 setup path. Updated it to enable CodeReady Linux Builder and install the EPEL 9 release RPM from Fedora's official permalink.
- The PostgreSQL sysbench commands omitted `--db-driver=pgsql`. sysbench uses MySQL as the default database driver for database benchmarks, so the PostgreSQL examples needed the driver option to use the `--pgsql-*` connection settings.
- The cleanup command only included `--mysql-db=sbtest`, which would not reliably connect with the same credentials and would clean only the default one table rather than the ten prepared tables. Updated cleanup to include matching connection options and `--tables=10`, and added the corresponding PostgreSQL cleanup command.
- The latency metric bullet listed P95 and P99 together, but sysbench reports a configured percentile controlled by `--percentile` rather than both percentiles at once by default. Updated the wording to describe the configured percentile.

## Review Notes
The examples assume MySQL and PostgreSQL servers are already installed, initialized, running, and configured to allow the shown local users to authenticate. A future improvement could add setup and authentication prerequisites, but the benchmark commands are now technically consistent with sysbench and RHEL 9 documentation.
