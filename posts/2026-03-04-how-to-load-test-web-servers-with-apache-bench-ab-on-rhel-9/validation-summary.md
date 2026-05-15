# Validation Summary: How to Load Test Web Servers with Apache Bench (ab) on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache HTTP Server benchmarking tool (`ab`)
- `dnf`
- HTTP load testing

## Sources Consulted
- Apache HTTP Server 2.4 official `ab` manual: https://httpd.apache.org/docs/current/en/programs/ab.html
- Red Hat Enterprise Linux 9 Package Manifest: https://docs.redhat.com/pt/documentation/red_hat_enterprise_linux/9/html-single/package_manifest/index

## Issues Found
No technical issues found.

## Review Notes
The `ab` command examples use valid options for total requests, concurrency, POST body files, content type, and HTTP keep-alive. The RHEL package name `httpd-tools` is present in the RHEL 9 package manifest. The sample output is illustrative and consistent with how `ab` reports throughput, per-request timing, transfer rate, and percentile latency distribution.
