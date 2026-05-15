# Validation Summary: How to Use tuned Storage Profiles for Automated Performance Tuning on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- TuneD and tuned-adm
- Linux block device tuning
- Linux sysctl and sysfs settings
- TuneD profile configuration
- Bash scripting for TuneD script plug-ins

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Getting started with TuneD: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/getting-started-with-tuned_monitoring-and-managing-system-status-and-performance
- TuneD upstream manual: https://tuned-project.org/docs/manual.html
- TuneD upstream profile source for throughput-performance: https://raw.githubusercontent.com/redhat-performance/tuned/master/profiles/throughput-performance/tuned.conf
- TuneD upstream profile source for latency-performance: https://raw.githubusercontent.com/redhat-performance/tuned/master/profiles/latency-performance/tuned.conf
- tuned-adm manual reference: https://man.archlinux.org/man/tuned-adm.8.en

## Issues Found
No technical issues found.

## Review Notes
The post uses the RHEL-style profile locations under `/usr/lib/tuned/` and `/etc/tuned/`, which match Red Hat's RHEL 9 documentation. Upstream TuneD documentation for newer releases also documents `/usr/lib/tuned/profiles/` and `/etc/tuned/profiles/`; this may be worth mentioning in a future revision if the article is broadened beyond RHEL.
