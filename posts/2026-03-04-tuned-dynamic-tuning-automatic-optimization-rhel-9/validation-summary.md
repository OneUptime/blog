# Validation Summary: How to Configure TuneD Dynamic Tuning for Auto Optimization on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- TuneD
- TuneD dynamic tuning
- TuneD profiles and plug-ins
- systemd journal commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Monitoring and managing system status and performance": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/monitoring_and_managing_system_status_and_performance/index
- TuneD upstream manual, "Optimizing system throughput, latency, and power consumption": https://tuned-project.org/docs/manual.html
- TuneD upstream source, `tuned-main.conf`: https://github.com/redhat-performance/tuned/blob/master/tuned-main.conf
- TuneD upstream source, CPU plug-in defaults and dynamic update logic: https://github.com/redhat-performance/tuned/blob/master/tuned/plugins/plugin_cpu.py
- TuneD upstream source, disk plug-in dynamic tuning behavior: https://github.com/redhat-performance/tuned/blob/master/tuned/plugins/plugin_disk.py
- TuneD upstream source, profile locator behavior: https://github.com/redhat-performance/tuned/blob/master/tuned/profiles/locator.py

## Issues Found
- The custom profile example created `/etc/tuned/my-dynamic/tuned.conf`. RHEL 9 documentation and current TuneD defaults document custom profiles under `/etc/tuned/profiles`. Updated the `mkdir` and `tee` commands to use `/etc/tuned/profiles/my-dynamic/tuned.conf` so the profile location matches the documented RHEL 9 path.

## Review Notes
The dynamic tuning controls, `dynamic_tuning`, `update_interval`, CPU `load_threshold`, `latency_low`, `latency_high`, disk `apm` and `spindown`, pipe-separated governor fallback syntax, and `tuned-adm profile` usage were verified against Red Hat documentation and upstream TuneD documentation/source. Dynamic disk and network tuning depends on hardware and driver support, so not every system will visibly apply every dynamic setting.
