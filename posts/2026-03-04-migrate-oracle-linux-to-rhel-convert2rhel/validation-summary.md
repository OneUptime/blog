# Validation Summary: How to Migrate from Oracle Linux to RHEL Using Convert2RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Oracle Linux
- Convert2RHEL
- Red Hat Subscription Manager
- Oracle Linux UEK and RHCK kernels
- yum/dnf package management
- GRUB boot kernel management with grubby

## Sources Consulted
- Red Hat documentation: Converting from a Linux distribution to RHEL using the Convert2RHEL utility, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/index
- Red Hat documentation: Converting using the command-line, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/converting-using-the-command-line_converting-from-a-linux-distribution-to-rhel
- Red Hat Customer Portal: Convert2RHEL FAQ, https://access.redhat.com/articles/5941531
- Oracle Linux documentation: Changing the Default Kernel, https://docs.oracle.com/en/operating-systems/oracle-linux/8/boot/boot-UsinggrubbyToManageKernels_change_the_default_kernel.html
- Oracle Linux documentation: Checking Available Kernels on the System, https://docs.oracle.com/en/operating-systems/oracle-linux/8/boot/boot-UsinggrubbyToManageKernels_check_available_kernels.html

## Issues Found
- The post stated broad Oracle Linux 7, 8, and 9 support without noting that Red Hat documents supported conversion paths by specific minor release. Updated the wording to say supported minor releases convert to the corresponding supported RHEL minor release.
- The Oracle Linux and RHEL examples used 8.9. Current Red Hat documentation lists Oracle Linux 8.10 to RHEL 8.10 as the supported Oracle Linux 8 conversion path, so the examples were updated to 8.10.
- The prerequisite update command used only dnf even though the post mentions Oracle Linux 7. Added a note to use yum on Oracle Linux 7.
- The RHCK grubby command could select an arbitrary last installed kernel package rather than filtering out UEK kernels. Replaced it with Oracle's documented pattern for selecting the latest non-UEK kernel in /boot.
- The Convert2RHEL repository URL used an outdated ftp.redhat.com path and omitted the documented Red Hat GPG key download. Updated it to the current cdn-public.redhat.com repository URL and added the GPG key command.
- The conversion flow skipped the documented pre-conversion analysis and used inline RHSM credentials. Updated it to configure /etc/convert2rhel.ini, run convert2rhel analyze, and then run convert2rhel.
- The Oracle Instant Client compatibility statement was too absolute. Changed it to state that it should continue to work if required dependencies remain present.
- The troubleshooting command still passed inline RHSM credentials after the conversion flow was changed to use /etc/convert2rhel.ini. Updated the example to focus on the --disablerepo option.

## Review Notes
The article remains an Oracle Linux 8-oriented example. Future improvements could add separate repository commands and package-manager notes for Oracle Linux 7 and 9, plus a stronger backup and rollback warning before using the -y option.
