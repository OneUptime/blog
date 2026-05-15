# Validation Summary: How to Configure Huge Pages for KVM Virtual Machine Performance on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- KVM/QEMU virtualization
- libvirt domain XML
- virt-install
- Linux HugeTLB huge pages and hugetlbfs
- grubby kernel command-line configuration
- sysctl huge page configuration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring huge pages: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/configuring-huge-pages_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Configuring virtual machines to use huge pages: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/optimizing-virtual-machine-performance-in-rhel_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 9 documentation: Configuring kernel command-line parameters with grubby: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-kernel-command-line-parameters_managing-monitoring-and-updating-the-kernel
- libvirt Domain XML format: memoryBacking and hugepages: https://libvirt.org/formatdomain.html
- Linux kernel documentation: HugeTLB Pages: https://docs.kernel.org/admin-guide/mm/hugetlbpage.html
- Linux kernel documentation: kernel command-line parameters for hugepages and hugepagesz: https://docs.kernel.org/admin-guide/kernel-parameters.html
- virt-install manual page: https://manpages.ubuntu.com/manpages/focal/man1/virt-install.1.html

## Issues Found
- The verification guidance said `HugePages_Free` should decrease by the VM's memory allocation. Red Hat's RHEL 9 virtualization documentation verifies huge page use by checking that `HugePages_Total - (HugePages_Free + HugePages_Rsvd)` represents the pages used by the running VM. Updated the comment to use this calculation.
- The hugetlbfs mount example only showed the default mount. For non-default sizes such as 1 GiB huge pages, Red Hat documentation shows mounting hugetlbfs with an explicit `pagesize=1G` option. Added a 1 GiB mount example and matching `/etc/fstab` line.

## Review Notes
The remaining commands and configuration snippets are technically consistent with the consulted documentation. Runtime allocation through `/proc/sys/vm/nr_hugepages` applies to the default huge page size, which is 2 MiB on x86_64 RHEL 9 systems unless changed with boot parameters.
