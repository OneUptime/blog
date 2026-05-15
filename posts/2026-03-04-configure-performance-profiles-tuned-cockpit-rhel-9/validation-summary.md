# Validation Summary: How to Configure Performance Profiles with TuneD Using the RHEL Web Console

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- TuneD and tuned-adm
- RHEL web console / Cockpit
- Linux sysctl, sysfs, CPU governor, disk readahead, transparent huge pages
- systemd service management

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Getting started with TuneD: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/getting-started-with-tuned_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Customizing TuneD profiles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/customizing-tuned-profiles_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Optimizing the system performance using the web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/using-the-web-console-for-selecting-performance-profiles_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Configuring huge pages: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/configuring-huge-pages_monitoring-and-managing-system-status-and-performance
- TuneD upstream manual: https://tuned-project.org/docs/manual.html
- tuned-adm man page reference: https://www.mankier.com/8/tuned-adm
- TuneD upstream profile definitions: https://github.com/redhat-performance/tuned

## Issues Found
- The post said standard Cockpit profile changes never need a reboot. This was too broad because TuneD profiles that change kernel boot parameters require a reboot for those settings to take effect. Updated the sentence to qualify the claim.
- The post described the `performance` CPU governor as "max frequency always." That overstates behavior on modern systems, where the governor requests performance-oriented frequency selection. Removed the parenthetical.
- The `virtual-guest` profile details said it reduces disk readahead. Red Hat's RHEL 9 documentation describes `virtual-guest` as increasing disk readahead values. Updated this to "Increased disk readahead."
- The custom script example did not handle TuneD's documented `start` and `stop` arguments and would run the same actions during both activation and deactivation. Updated the script to handle `start` and `stop` explicitly.
- The script plug-in example used `script=script.sh`. Red Hat's documented example uses `${i:PROFILE_DIR}` for scripts stored in the profile directory. Updated it to `script=${i:PROFILE_DIR}/script.sh`.

## Review Notes
The tutorial is technically relevant and the remaining commands and TuneD profile snippets match the documented RHEL 9 workflow. Some profile behavior can vary by installed TuneD package version, hardware, and available plug-ins, so production tuning should still be validated with workload-specific benchmarks.
