# Validation Summary: How to Handle SHA-1 Deprecation When Upgrading to RHEL 9

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- SHA-1 deprecation
- System-wide cryptographic policies
- Leapp in-place upgrades
- Convert2RHEL
- DNF

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Re-enabling SHA-1": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Enterprise Linux 9.0 Release Notes, "Major changes in RHEL 9.0": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.0_release_notes/overview
- Red Hat Enterprise Linux 9, "Planning an upgrade to RHEL 9": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/planning-an-upgrade-to-rhel-9_upgrading-from-rhel-8-to-rhel-9
- Red Hat Enterprise Linux 9, "Preparing for the upgrade": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/assembly_preparing-for-the-upgrade_upgrading-from-rhel-8-to-rhel-9
- Red Hat Enterprise Linux 9, "Reviewing the pre-upgrade report": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/reviewing-the-pre-upgrade-report_upgrading-from-rhel-8-to-rhel-9
- Red Hat Enterprise Linux 9, "Performing the upgrade": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/performing-the-upgrade_upgrading-from-rhel-8-to-rhel-9
- Red Hat Enterprise Linux 9, "Performing post-upgrade tasks": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/performing-post-upgrade-tasks-on-the-rhel-9-system_upgrading-from-rhel-8-to-rhel-9
- Red Hat Enterprise Linux 8, "Converting from a Linux distribution to RHEL using the Convert2RHEL utility": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/index

## Issues Found
- The post title and description promised SHA-1 deprecation guidance, but the body only described a generic migration flow. Added Red Hat-documented SHA-1 context: RHEL 9 restricts SHA-1 signatures in the DEFAULT crypto policy, RSA/SHA-1-signed packages can inhibit upgrades, and the `DEFAULT:SHA1` subpolicy is a compatibility workaround.
- The Leapp install command included both `leapp` and `leapp-upgrade`. Red Hat documents installing `leapp-upgrade`, which provides the upgrade tooling and dependencies, so the command was updated.
- The Convert2RHEL install command omitted the required Convert2RHEL repository file. Added the Red Hat public repository setup command before installing `convert2rhel`.
- The upgrade step implied `leapp upgrade` reboots automatically. Red Hat documents a manual `reboot` after `leapp upgrade`, unless `leapp upgrade --reboot` is used. Added the reboot command and clarified the alternative.
- The cleanup command removed `leapp` and `leapp-upgrade` directly. Red Hat documents first clearing the DNF exclude list and then removing remaining Leapp dependency packages on RHEL 9. Updated the commands.
- The rollback plan suggested booting the old kernel. That does not reliably roll back a major-version userspace upgrade, so it was replaced with log investigation before retrying.

## Review Notes
The guide is intentionally concise. In a future revision, it could include environment-specific upgrade paths, supported source RHEL minor versions, Satellite/RHUI handling, and explicit instructions for replacing third-party SHA-1-signed RPMs with vendor-provided SHA-256-signed packages.
