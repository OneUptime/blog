# Validation Summary: How to Attach and Remove Subscriptions on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Subscription Management
- subscription-manager CLI
- Red Hat CDN repositories
- Simple Content Access

## Sources Consulted
- Red Hat Subscription Central, Getting Started with RHEL System Registration: https://docs.redhat.com/en/documentation/subscription_central/1-latest/html-single/getting_started_with_rhel_system_registration/index
- Red Hat Enterprise Linux 7 System Administrator's Guide, Registering the System and Managing Subscriptions: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/chap-subscription_and_support-registering_a_system_and_managing_subscriptions
- Red Hat Enterprise Linux 6 Deployment Guide, Removing Subscriptions: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/deployment_guide/sect-subscription_and_support-registering_a_system_and_managing_subscriptions-removing_subscriptions
- Red Hat Customer Portal, Simple Content Access: https://access.redhat.com/articles/simple-content-access
- Red Hat Customer Portal, attach commands ignored with Simple Content Access: https://access.redhat.com/solutions/7016176
- Red Hat Satellite documentation examples for `subscription-manager list --available --matches`: https://docs.redhat.com/en/documentation/red_hat_satellite/6.4/html/installing_satellite_server_from_a_connected_network/installing_satellite_server

## Issues Found
- The post stated that after registration you need to attach subscriptions to access repositories. This is accurate for entitlement-based Red Hat Subscription Management, but it is not accurate for organizations using Simple Content Access, where attaching subscriptions is no longer required and attach commands can be ignored. Updated the introduction and closing paragraph to scope the attach workflow to entitlement-based mode and added a Simple Content Access caveat.
- The auto-attach command comment did not clarify that the command applies to entitlement-based mode. Updated the comment to avoid implying that `subscription-manager attach --auto` is required or effective in Simple Content Access environments.

## Review Notes
The listed `subscription-manager` commands for `attach --auto`, `attach --pool`, `list --available`, `list --available --matches`, `list --consumed`, `remove --serial`, `remove --all`, `status`, `identity`, `repos --list-enabled`, `refresh`, and `unregister` are valid commands. In Simple Content Access environments, subscription status and attach/remove behavior can differ from entitlement-based workflows, so the updated post now calls out that caveat.
