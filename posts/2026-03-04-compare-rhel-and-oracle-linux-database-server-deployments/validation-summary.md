# Validation Summary: How to Compare RHEL and Oracle Linux for Database Server Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Oracle Linux
- Oracle Linux Red Hat Compatible Kernel
- Oracle Linux Unbreakable Enterprise Kernel
- Oracle Database 21c preinstallation RPM
- GRUB/grubby
- dnf/yum repositories
- Linux sysctl configuration
- Red Hat Subscription Manager
- RPM package metadata

## Sources Consulted
- Oracle Linux documentation: About Linux Kernels - https://docs.oracle.com/en/operating-systems/oracle-linux/9/boot/boot-about_linux_kernels.html
- Oracle Linux documentation: Changing the Default Kernel - https://docs.oracle.com/en/operating-systems/oracle-linux/8/boot/boot-UsinggrubbyToManageKernels_change_the_default_kernel.html
- Oracle Database 21c documentation: About the Oracle Database Preinstallation RPM - https://docs.oracle.com/en/database/oracle/oracle-database/21/ladbi/about-the-oracle-preinstallation-rpm.html
- Oracle Database 21c documentation: Installing the Oracle Database Preinstallation RPM Using ULN - https://docs.oracle.com/en/database/oracle/oracle-database/21/upgor/installing-oracle-preinstallation-rpm-with-uln-support.html
- Oracle Database 21c documentation: Changing Kernel Parameter Values - https://docs.oracle.com/en/database/oracle/oracle-database/21/ladbi/changing-kernel-parameter-values.html
- Oracle Linux documentation: Available Oracle Linux Yum Servers - https://docs.oracle.com/en/operating-systems/oracle-linux/software-management/sfw-mgmt-OLYumServers.html
- Oracle Linux downloads page - https://www.oracle.com/linux/technologies/oracle-linux-downloads.html
- Oracle Linux product page and support information - https://www.oracle.com/linux/operating-system/
- Oracle Linux blog: What Makes Oracle Linux the Ideal Choice for Running Oracle Database - https://blogs.oracle.com/linux/oracle-linux-the-ideal-choice-for-running-oracle-database
- Oracle Linux DTrace documentation - https://docs.oracle.com/en/operating-systems/oracle-linux/dtrace-v2-guide/AboutDTrace.html
- Red Hat documentation: Registering the system and managing subscriptions - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_registering-the-system-and-managing-subscriptions_configuring-basic-system-settings/
- Red Hat documentation: subscription-manager status verification - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_from_installation_media/proc_configuring-system-purpose-using-the-subscription-manager-command-line-tool_rhel-installer

## Issues Found
- The UEK optimization claim named "better I/O scheduling" specifically, but Oracle's public documentation states UEK includes Oracle-developed optimizations for Oracle Database, middleware, and hardware rather than documenting that exact scheduler claim. Updated the sentence to match Oracle's documented wording and kept the DTrace point.
- The post said RHEL uses only RHCK. RHCK is Oracle Linux's RHEL-compatible kernel, not the name of the kernel shipped by RHEL. Updated the sentence to say RHEL uses Red Hat's own Enterprise Linux kernel.
- The Oracle Database preinstallation RPM comment said it configures `/etc/security/limits.conf`. Oracle documents release-specific sysctl and resource-limit configuration, and examples use files such as `/etc/security/limits.d/oracle-database-preinstall-21c.conf`. Updated the comment to avoid the incorrect file path.
- The manual Oracle Database sysctl example omitted `kernel.shmmni = 4096`, which is included in Oracle Database 21c's documented kernel parameter example. Added the missing parameter.
- The post said Oracle Premier Support for Oracle Linux is included with an Oracle Database support contract at no additional cost. Oracle documents no-additional-cost Oracle Linux Support benefits for Oracle Database deployments on OCI or Oracle Engineered Systems, not as a blanket database support-contract entitlement. Updated the claim to that documented scope.

## Review Notes
The command examples for `uname -r`, `grubby --set-default`, `dnf install oracle-database-preinstall-21c`, `subscription-manager status`, `dnf repolist`, `sysctl --system`, and `rpm -q --queryformat '%{VENDOR}\n' glibc` are syntactically plausible and consistent with the relevant official documentation. Oracle Database prerequisites vary by database version, Linux release, and installation model, so future edits should keep the database version explicit when giving sysctl or preinstall RPM examples.
