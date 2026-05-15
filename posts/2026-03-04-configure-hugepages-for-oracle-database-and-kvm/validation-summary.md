# Validation Summary: How to Configure HugePages for Oracle Database and KVM on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Linux HugeTLB / HugePages
- Oracle Database SGA HugePages configuration
- KVM / QEMU virtualization
- libvirt domain XML
- hugetlbfs

## Sources Consulted
- Linux kernel HugeTLB documentation: https://docs.kernel.org/admin-guide/mm/hugetlbpage.html
- Red Hat Enterprise Linux Performance Tuning Guide, Configuring HugeTLB Huge Pages: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/performance_tuning_guide/sect-red_hat_enterprise_linux-performance_tuning_guide-memory-configuring-huge-pages
- Oracle Database 19c documentation, Configuring HugePages on Linux: https://docs.oracle.com/en/database/oracle/oracle-database/19/cwlin/configure-hugepages.html
- libvirt Domain XML format, Memory Backing: https://libvirt.org/formatdomain.html
- QEMU invocation documentation: https://www.qemu.org/docs/master/system/invocation.html

## Issues Found
- The introduction and conclusion described static HugePages as boot-only and required by Oracle Database and KVM virtual machines. Static HugePages can be configured explicitly and are optional for many KVM and Oracle deployments, although they are commonly recommended or required for particular workloads and configurations. Updated the wording to avoid overstatement.
- The Oracle sizing example added an arbitrary 10 percent overhead and configured 2253 pages for a 4 GB SGA. Oracle documentation recommends sizing from actual SGA requirements and leaving sufficient standard memory available, not a universal 10 percent overhead. Updated the example to use 2048 2 MB pages for the 4 GB SGA example.
- The 1 GB HugePages boot example did not set the default huge page size. Updated the `grubby` arguments to include `default_hugepagesz=1G` with `hugepagesz=1G hugepages=16`, matching kernel and Red Hat documentation for selecting and reserving a 1 GB HugeTLB pool.
- The libvirt XML used generic `<hugepages/>`, which is valid but ambiguous on systems with multiple HugePage sizes. Updated the KVM example to request 1 GB pages explicitly with `<page size="1" unit="G"/>`.
- The direct QEMU command used legacy `-mem-path`. It is still documented, but QEMU now recommends memory backend objects for more control. Updated the example to use `memory-backend-file` with `-machine memory-backend=...`.
- The monitoring note said `HugePages_Free` at 0 always means more pages are needed. Updated it to say more pages are needed when new HugePage allocations fail.

## Review Notes
- The `memlock unlimited` example is accepted by Linux PAM limits configuration, but Oracle documentation usually shows a KB value sized for the system and notes `unlimited` specifically for Exadata. The post now mentions that a sufficiently large KB value can be used instead.
