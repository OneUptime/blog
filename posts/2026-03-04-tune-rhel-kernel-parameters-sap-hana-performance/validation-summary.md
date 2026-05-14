# Validation Summary: How to Tune RHEL Kernel Parameters for SAP HANA Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux for SAP Solutions
- SAP HANA
- TuneD and the `sap-hana` profile
- Linux sysctl kernel parameters
- Transparent Huge Pages
- Linux process limits
- CPU frequency scaling

## Sources Consulted
- Red Hat Documentation: Upgrading SAP environments from RHEL 8 to RHEL 9, SAP HANA settings including `vm.max_map_count` and `kernel.pid_max`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/upgrading_sap_environments_from_rhel_8_to_rhel_9/upgrading_sap_environments_from_rhel_8_to_rhel_9
- Red Hat Documentation: Managing transparent hugepages with runtime and kernel command line parameters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/monitoring_and_managing_system_status_and_performance/configuring-huge-pages_monitoring-and-managing-system-status-and-performance
- Red Hat RHEL System Roles for SAP reference, `sap-hana` tuned profile coverage for NUMA balancing, THP, and CPU governor: https://access.redhat.com/sites/default/files/attachments/rhel_system_roles_for_sap_1.pdf
- SAP HANA Troubleshooting and Performance Analysis Guide, Transparent Huge Pages recommendations for RHEL 9.2 and later versus older operating systems: https://help.sap.com/doc/e344ef1295b6433e88fe084c0768e1cd/2.0.07/en-US/SAP_HANA_Troubleshooting_and_Performance_Analysis_Guide_en.pdf
- SAP Help Portal: SAP HANA Linux kernel parameters, including `vm.max_map_count`: https://help.sap.com/docs/SAP_HANA_PLATFORM/6b94445c94ae495c83a19646e7c3fd56/82e4575eec664846a9918e9ed1d90d41.html

## Issues Found
- The THP section stated that THP should always be disabled. SAP's current SAP HANA guidance recommends `madvise` for RHEL 9.2 and later with current SAP HANA revisions, while older operating system releases use `never`. Updated the text and commands to reflect the version-specific guidance.
- The THP runtime commands used shell redirection without root privileges. Replaced them with `sudo tee` so they work when run by an administrative user using `sudo`.
- The sysctl snippet omitted `kernel.pid_max = 4194304`, which Red Hat documents as required for SAP applications including SAP HANA on RHEL 9. Added it to the configuration and verification script.
- The TuneD setup installed the profile package but did not explicitly enable and start the `tuned` service. Added `sudo systemctl enable --now tuned` before activating the profile.

## Review Notes
The networking parameters are SAP HANA tuning values commonly referenced through SAP Note 2382421, but the exact SAP Note content requires SAP support access. Administrators should still validate final settings with the applicable SAP Notes and the RHEL System Roles for SAP assert mode for their SAP HANA revision, RHEL minor version, hardware platform, and subscription channel.
