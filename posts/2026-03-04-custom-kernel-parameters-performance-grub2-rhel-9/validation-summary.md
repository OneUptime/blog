# Validation Summary: How to Add Custom Kernel Parameters for Performance Tuning via GRUB2 on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- GRUB2 and grubby
- Linux kernel command-line parameters
- CPU isolation and CPU frequency scaling
- HugeTLB and transparent huge pages
- NUMA balancing
- IOMMU and virtualization passthrough
- RHEL 9 disk scheduler configuration
- kdump crash kernel reservation

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring kernel command-line parameters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-kernel-command-line-parameters_managing-monitoring-and-updating-the-kernel
- Red Hat Enterprise Linux 9: Setting the disk scheduler: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/setting-the-disk-scheduler_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9: Configuring huge pages: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/configuring-huge-pages_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9: Configuring kdump on the command line: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-kdump-on-the-command-line_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Enterprise Linux 9: Configuring and managing virtualization: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_virtualization/configuring_and_managing_virtualization
- Linux kernel documentation: The kernel's command-line parameters: https://docs.kernel.org/admin-guide/kernel-parameters.html
- Linux kernel 5.14 documentation: The kernel's command-line parameters: https://www.kernel.org/doc/html/v5.14/admin-guide/kernel-parameters.html

## Issues Found
- The Intel P-state example described `intel_pstate=active` as forcing performance mode. Changed the comment to say it explicitly uses the Intel P-state driver in active mode, because the kernel parameter selects driver mode rather than a performance governor.
- The AMD IOMMU example used `amd_iommu=on iommu=pt`. Updated it to `iommu=pt` with a note that RHEL enables IOMMU by default on AMD hosts, matching Red Hat virtualization guidance.
- The I/O scheduler section used `elevator=none` as a GRUB kernel parameter. Replaced it with RHEL 9's documented multi-queue scheduler verification and udev-based persistent configuration approach.
- The `mitigations=off` explanation said it disables all CPU vulnerability mitigations and gave a fixed 5-15% performance range. Changed this to optional CPU mitigations and removed the unsupported fixed percentage.
- The future-kernel persistence section said `grubby --update-kernel=ALL` does not apply to future kernels and showed a UEFI `grub2-mkconfig` output path under `/boot/efi/EFI/redhat/grub.cfg`. Updated it to reflect RHEL 9 behavior: `grubby` normally carries arguments forward to newer kernels, RHEL 9.0 had a known exception, and BLS snippets should be updated with `grub2-mkconfig -o /boot/grub2/grub.cfg --update-bls-cmdline`.
- The wrap-up repeated the outdated `/etc/default/grub` persistence guidance. Updated it to match the corrected RHEL 9 BLS workflow.

## Review Notes
The CPU isolation examples are valid kernel command-line examples, but `isolcpus` is documented by the upstream kernel as deprecated in favor of cpusets for scheduler load-balancing control. The post can still use it as a boot-time tuning example, but a future revision could add that caveat.
