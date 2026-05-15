# Validation Summary: How to Perform an In-Place Upgrade from RHEL 7 to RHEL 8 Using Leapp

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 7
- Red Hat Enterprise Linux 8
- Leapp
- Red Hat Subscription Manager
- yum / dnf package management
- GRUB2
- PAM
- Linux kernel modules

## Sources Consulted
- Red Hat Documentation: Upgrading from RHEL 7 to RHEL 8 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/upgrading_from_rhel_7_to_rhel_8/upgrading_from_rhel_7_to_rhel_8
- Red Hat Documentation: Performing the upgrade from RHEL 7 to RHEL 8 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/upgrading_from_rhel_7_to_rhel_8/performing-the-upgrade-from-rhel-7-to-rhel-8_upgrading-from-rhel-7-to-rhel-8
- Red Hat Customer Portal: How to Upgrade from RHEL 7 to RHEL 8 using Leapp - https://access.redhat.com/articles/how-to-upgrade-rhel-7
- Red Hat Customer Portal: Leapp upgrade fail with removed RHEL 8 kernel drivers - https://access.redhat.com/solutions/5436131

## Issues Found
- The prerequisites did not enable the RHEL 7 Base repository or unset the Subscription Manager release lock. Added `subscription-manager release --unset` and `subscription-manager repos --enable rhel-7-server-rpms`, matching Red Hat's preparation steps.
- The pre-upgrade and upgrade commands omitted the currently documented target release. Updated them to use `--target 8.10` for the supported RHEL 7.9 to RHEL 8.10 path.
- The upgrade command implied that `leapp upgrade` reboots automatically. Updated it to use `--reboot`, which matches Red Hat's documented behavior.
- Red Hat documents a temporary open-file-descriptor workaround before pre-upgrade and upgrade runs. Added `ulimit -n 16384` before both Leapp commands.
- The report classification omitted medium and low risk levels and described high risk as non-blocking. Updated the list to include High, Medium, Low, Info, and Inhibitor accurately.
- The Leapp answer example was labeled as a VDO-device answer but used the PAM PKCS#11 answerfile section. Corrected the comment and set the documented `confirm=False` value.
- The GRUB remediation was too generic for all boot modes. Clarified that the shown `grub2-install /dev/sda` approach applies to BIOS systems and the correct boot disk must be used.
- The post-upgrade package check and cleanup commands were less precise than Red Hat's documented commands. Updated them to use the documented `.el[67]` check and `yum remove kernel-workaround ...` cleanup pattern.
- The example post-upgrade release output used a generic `8.x`. Updated it to `8.10` to match the current supported target release.

## Review Notes
The guide is technically relevant and now aligns with Red Hat's current RHEL 7.9 to RHEL 8.10 Leapp documentation. It remains a concise overview; production upgrades should still follow the full Red Hat documentation for architecture, Satellite, RHUI, custom repository, SELinux, and application-specific caveats.
