# Validation Summary: How to Use tuna to Manage Thread Priorities and CPU Pinning on RHEL Real-Time

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux for Real Time
- tuna CLI
- Linux CPU affinity
- Linux thread scheduling policies
- Linux IRQ affinity
- systemd services

## Sources Consulted
- Red Hat Enterprise Linux for Real Time 10, "Improving latency using the tuna CLI": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_real_time/10/html/optimizing_rhel_for_real_time_for_low_latency_operation/improving-latency-using-the-tuna-cli
- Red Hat Enterprise Linux 10, "Reviewing a system by using the tuna interface": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/monitoring_and_managing_system_status_and_performance/reviewing-a-system-by-using-the-tuna-interface
- Red Hat Enterprise Linux 9, "Monitoring and managing system status and performance": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/monitoring_and_managing_system_status_and_performance/monitoring_and_managing_system_status_and_performance
- Red Hat Enterprise Linux 7, "Tuning IRQs with Tuna": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/performance_tuning_guide/sec-tuna-irq-tuning
- tuna(8) manual page: https://www.mankier.com/8/tuna
- Red Hat Enterprise Linux 7 System Administrator's Guide, "Managing Services with systemd": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/pdf/system_administrators_guide/chap-managing_services_with_systemd

## Issues Found
- The IRQ example used `--irqs=eth0`, which implies an exact IRQ user/name match. Red Hat documentation and the tuna manual describe IRQ lists as IRQ numbers or user-name patterns, and Ethernet devices often expose queue-specific IRQ names. The example was changed to `--irqs='eth0*'` so it correctly demonstrates matching IRQs associated with an Ethernet device name prefix.
- The example systemd unit used `After=multi-user.target` while also installing the unit into `multi-user.target`. For a boot-time tuning service, that ordering can apply the tuna profile after the target is reached. It was changed to `Before=multi-user.target` so the profile is applied before the normal multi-user boot target completes.

## Review Notes
The post uses the newer tuna subcommand syntax documented for current RHEL 9/10 releases. Older RHEL documentation, especially RHEL 7 and some RHEL 8 material, also shows the legacy option-action syntax such as `tuna --cpus=0,1 --isolate`; readers on older systems should confirm syntax with `tuna -h` and `tuna <command> -h`.
