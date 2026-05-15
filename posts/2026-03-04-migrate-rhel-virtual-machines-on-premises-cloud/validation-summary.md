# Validation Summary: How to Migrate RHEL Virtual Machines Between On-Premises and Cloud

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux (RHEL)
- Leapp in-place upgrades
- Convert2RHEL
- RHEL virtual machines and cloud migration planning
- DNF/YUM package management
- Red Hat Subscription Management

## Sources Consulted
- Red Hat Documentation: Upgrading from RHEL 8 to RHEL 9, preparing for the upgrade - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/assembly_preparing-for-the-upgrade_upgrading-from-rhel-8-to-rhel-9/
- Red Hat Documentation: Upgrading from RHEL 8 to RHEL 9, reviewing the pre-upgrade report - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/reviewing-the-pre-upgrade-report_upgrading-from-rhel-8-to-rhel-9
- Red Hat Documentation: Upgrading from RHEL 8 to RHEL 9, performing the upgrade - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/performing-the-upgrade_upgrading-from-rhel-8-to-rhel-9
- Red Hat Documentation: Upgrading from RHEL 8 to RHEL 9, post-upgrade tasks - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/upgrading_from_rhel_8_to_rhel_9/performing-post-upgrade-tasks-on-the-rhel-9-system_upgrading-from-rhel-8-to-rhel-9/
- Red Hat Documentation: Converting from a Linux distribution to RHEL using the Convert2RHEL utility - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/converting-using-the-command-line_converting-from-a-linux-distribution-to-rhel
- Red Hat Documentation: Preparing and uploading cloud images by using RHEL image builder - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/composing_a_customized_rhel_system_image/creating-cloud-images-with-composer_composing-a-customized-rhel-system-image
- Red Hat Documentation: Introducing RHEL on public cloud platforms - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/deploying_rhel_8_on_microsoft_azure/introducing-rhel-on-public-cloud-platforms_cloud-content-azure

## Issues Found
- The post described Leapp and Convert2RHEL steps as though they performed on-premises/cloud VM migration. Leapp performs RHEL in-place upgrades, and Convert2RHEL converts supported RHEL-like distributions to RHEL; neither exports or imports a VM image. Updated the overview and summary to clarify that these are OS-level preparation steps and that the actual VM move requires provider-specific image migration tooling.
- The Leapp install command installed both `leapp` and `leapp-upgrade`. Red Hat's RHEL 8 to RHEL 9 documentation instructs installing `leapp-upgrade`, which pulls the required Leapp components. Updated the command to `sudo dnf install -y leapp-upgrade`.
- The Convert2RHEL install command omitted the required Red Hat GPG key and Convert2RHEL repository setup. Added the official repository setup sequence and used `yum -y install convert2rhel`, matching Red Hat's documented flow.
- The Leapp preupgrade and upgrade commands did not specify a target OS version. Red Hat documents `--target <target_os_version>` for RHEL 8 to RHEL 9 upgrades, with defaults depending on supported upgrade paths. Updated both commands to include the placeholder target version.
- The post said `leapp upgrade` reboots into the upgrade initramfs. Red Hat documents that a manual `reboot` is required after `leapp upgrade`, unless `--reboot` is used. Added `sudo reboot` and mentioned the `--reboot` option.
- The cleanup command removed `leapp` and `leapp-upgrade` directly. Red Hat's RHEL 8 to RHEL 9 post-upgrade cleanup removes remaining Leapp dependency packages such as `leapp-deps-el9` and `leapp-repository-deps-el9`. Updated the cleanup command accordingly.

## Review Notes
The post remains a high-level checklist and does not provide complete provider-specific VM import/export procedures for AWS, Azure, Google Cloud, OpenStack, VMware, or other platforms. Future revisions should either focus the title on RHEL in-place upgrade/conversion preparation or add platform-specific image migration steps.
