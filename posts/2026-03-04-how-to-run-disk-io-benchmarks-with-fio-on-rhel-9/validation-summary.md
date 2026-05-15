# Validation Summary: How to Run Disk I/O Benchmarks with fio on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF package installation
- fio disk I/O benchmarking
- Linux asynchronous I/O with libaio

## Sources Consulted
- fio official documentation: command-line examples, `time_based`, `runtime`, `rw`, `ioengine`, `numjobs`, and `group_reporting` options - https://fio.readthedocs.io/en/master/fio_doc.html
- Red Hat Enterprise Linux 9 documentation: Managing software with the DNF tool - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- Red Hat Enterprise Linux 9 Package Manifest: confirms the `fio` package is included for RHEL 9 - https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/package_manifest/Red_Hat_Enterprise_Linux-9-Package_manifest-en-US.pdf

## Issues Found
1. **Benchmark commands used `--runtime=60` without `--time_based`.** In fio, `runtime` alone can act as a maximum run time and the job may stop when the configured file size is exhausted. Added `--time_based` to each benchmark command so the workload loops for the specified 60-second runtime.

## Review Notes
- The commands assume `/mnt/test` exists and has enough free space for the configured test file. That is an operational prerequisite rather than a command syntax issue.
- The examples reuse the same `--filename=/mnt/test/fio-test`. This is technically valid, but users should avoid pointing these write tests at important data because fio write workloads overwrite the target.
