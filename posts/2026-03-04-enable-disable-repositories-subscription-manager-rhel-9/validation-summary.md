# Validation Summary: How to Enable/Disable Repositories with subscription-manager on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Subscription Management
- `subscription-manager`
- DNF repositories
- Ansible `community.general.rhsm_repository`

## Sources Consulted
- Red Hat Customer Portal: Simple Content Access, https://access.redhat.com/articles/simple-content-access
- Red Hat Documentation: Getting Started with RHEL System Registration, https://docs.redhat.com/en/documentation/subscription_central/1-latest/html/getting_started_with_rhel_system_registration/
- Red Hat Documentation: Managing software with the DNF tool in RHEL 9, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/managing_software_with_the_dnf_tool/
- Red Hat Documentation: RHEL 9 repositories for upgrades, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/upgrading_from_rhel_8_to_rhel_9/
- Red Hat Documentation: Configuring and managing high availability clusters in RHEL 9, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/
- Red Hat Customer Portal: Enabling or disabling a repository using Red Hat Subscription Management, https://access.redhat.com/solutions/265523
- Red Hat Documentation: RHEL package manifest, Supplementary repository, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/package_manifest/
- Ansible documentation: `community.general.rhsm_repository`, https://docs.ansible.com/ansible/latest/collections/community/general/rhsm_repository_module.html
- `subscription-manager` manual page reference, https://www.mankier.com/8/subscription-manager

## Issues Found
- Updated the opening sentence to account for Simple Content Access. Red Hat documents that attachment commands are no longer required when SCA is enabled, so the post should not imply that every registered RHEL system must attach a subscription.
- Corrected the Supplementary repository description. Red Hat describes Supplementary as proprietary-licensed packages not included in the open source RHEL repositories, not as a generic third-party package repository.
- Fixed the troubleshooting command for "Repository not found". Counting all `Repo ID` lines does not verify whether the missing repository is available, so the example now greps for the specific repository ID.

## Review Notes
Most commands and repository IDs were accurate for RHEL 9 on x86_64, including BaseOS, AppStream, CodeReady Linux Builder, High Availability, Resilient Storage, wildcard disabling, repo overrides, and the Ansible module states. Repository IDs are architecture-specific, so users on architectures other than x86_64 must use the matching repository IDs.
