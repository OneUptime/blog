# Validation Summary: How to Configure RHEL Memory and CPU for SAP HANA Best Practices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- SAP HANA
- Linux NUMA configuration
- Linux sysctl memory tuning
- Transparent Huge Pages and HugeTLB pages
- TuneD and CPU frequency governors
- systemd resource control and cgroups
- SAP HANA hardware and cloud measurement tools

## Sources Consulted
- SAP Help Portal: Change the Global Memory Allocation Limit: https://help.sap.com/docs/SAP_HANA_PLATFORM/6b94445c94ae495c83a19646e7c3fd56/c1a774b3bb571014af018d2352f0d757.html
- SAP Help Portal: System Appears to Hang with High System CPU Usage: https://help.sap.com/docs/SAP_HANA_PLATFORM/bed8c14f9f024763b0777aa72b5436f6/dff5d0bdf68e41cf9098f939c5d7a1b1.html
- SAP Help Portal: SAP HANA Hardware and Cloud Measurement Tools: https://help.sap.com/docs/HANA_HW_CLOUD_TOOLS/02bb1e64c2ae4de7a11369f4e70a6394/7e878f6e16394f2990f126e639386333.html
- Red Hat Documentation: RHEL System Roles for SAP on RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/installing_rhel_9_for_sap_solutions/assembly_rhel-system-roles-for-sap_configuring-rhel-9-for-sap-hana2-installation
- Red Hat Documentation: Red Hat Enterprise Linux System Roles for SAP: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/red_hat_enterprise_linux_system_roles_for_sap/red_hat_enterprise_linux_system_roles_for_sap
- Red Hat Documentation: Configuring huge pages in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/configuring-huge-pages_monitoring-and-managing-system-status-and-performance
- Red Hat Documentation: Understanding control groups in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/setting-limits-for-applications_assembly_managing-kernel-command-line-parameters-with-uki
- SAP LinuxLab community.sap_install sap_hana_preconfigure role: https://github.com/sap-linuxlab/community.sap_install/tree/main/roles/sap_hana_preconfigure
- Local man pages: sysctl.d(5), cpupower-frequency-set(1)

## Issues Found
- The memory diagram stated that SAP HANA always uses 90% of physical RAM. Updated it to refer to SAP HANA's global allocation limit because SAP documents the default as 90% of the first 64 GB plus 97% of remaining memory, with other small-system behavior.
- The NUMA section incorrectly recommended enabling automatic NUMA balancing. Updated the commands and expected value to disable `kernel.numa_balancing`, and added stopping `numad`, matching SAP HANA preconfiguration guidance used by Red Hat/SAP roles.
- The THP section incorrectly said THP must always be disabled. Updated it to use `transparent_hugepage=madvise` for SAP HANA on RHEL 9.2 and later, while noting that older supported OS combinations use `never`.
- The overcommit comment said `vm.overcommit_memory = 0` disables overcommit. Corrected the comment because value `0` is Linux's heuristic overcommit mode, not strict no-overcommit mode.
- The CPU cgroup example used a cgroups-v1 cpuset path that is not appropriate for default RHEL 9 cgroups-v2 systems. Replaced it with a systemd `AllowedCPUs` example.
- The static huge pages section recommended reserving a large HugeTLB pool without showing an SAP HANA requirement. Reworked it to avoid unused static HugeTLB reservations unless specifically required by SAP, Red Hat, or the hardware vendor.
- The validation section referenced `/usr/sap/HDB/HDB00/exe/hdbcheck`, which is not the current SAP HANA hardware validation tool. Replaced it with the SAP HANA hardware and cloud measurement tool command `hcmt -v`.

## Review Notes
Some values in the sysctl example, such as `kernel.shmmax` and `kernel.shmall`, are hardware-size examples and must be recalculated for the target host. Production deployments should still prefer Red Hat System Roles for SAP where possible because they encode SAP Note-specific behavior for the exact RHEL and SAP HANA combination.
