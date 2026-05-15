# Validation Summary: How to Attach and Manage Subscriptions with subscription-manager on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Subscription Management
- `subscription-manager`
- Simple Content Access (SCA)
- Ansible `community.general.redhat_subscription`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Registering the system and managing subscriptions": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_registering-the-system-and-managing-subscriptions_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation, "Configuring System Purpose using the subscription-manager command-line tool": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_from_installation_media/proc_configuring-system-purpose-using-the-subscription-manager-command-line-tool_rhel-installer
- Red Hat Customer Portal, "Simple Content Access": https://access.redhat.com/articles/simple-content-access
- Ansible community.general `redhat_subscription` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/redhat_subscription_module.html
- `subscription-manager(8)` manual page reference for list, attach, remove, and refresh options: https://man.docs.euro-linux.com/EL%208/subscription-manager/subscription-manager.8.en.html

## Issues Found
- The post described `subscription-manager list --consumed --pool-only` as showing full details. The `--pool-only` option limits output to pool IDs, so the surrounding text and comment were corrected.
- The post implied `subscription-manager attach --auto` is generally applicable after registration. Red Hat's SCA guidance says auto-attach workflows are obsolete when SCA is enabled and can be a no-op or error, so a caveat was added.
- The workflow diagram sent SCA-enabled systems to verification with `list --consumed`. In SCA mode, subscriptions are not attached per host, so the verification label was changed to `subscription-manager status`.
- The expired subscription section did not distinguish entitlement mode from SCA mode. A caveat was added that "Disabled" status under SCA is not an error.

## Review Notes
The Ansible examples use the current `community.general.redhat_subscription` module name and `pool_ids` option. In current Ansible documentation, credentials are required for registration but not necessarily for tweaking subscriptions on an already registered system.
