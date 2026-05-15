# Validation Summary: How to Attach and Remove Subscriptions on RHEL 9

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Subscription Manager
- Red Hat Simple Content Access
- System purpose management

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Registering the system and managing subscriptions": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_registering-the-system-and-managing-subscriptions_configuring-basic-system-settings
- Red Hat Enterprise Linux for SAP Solutions 9 documentation, "RHEL for SAP Subscriptions and Repositories": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/rhel_for_sap_subscriptions_and_repositories/index
- Red Hat Subscription Central documentation, "Preparing to register RHEL systems": https://docs.redhat.com/en/documentation/subscription_central/1-latest/html/getting_started_with_rhel_system_registration/assembly-prep-reg-rhel_assembly-prep-reg-rhel
- Red Hat Enterprise Linux 9 documentation, "Considerations in adopting RHEL 9": https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/considerations_in_adopting_rhel_9/considerations-in-adopting-rhel-9.pdf
- Red Hat Customer Portal, "Simple Content Access": https://access.redhat.com/articles/simple-content-access

## Issues Found
- The "View Subscription Details" section used `subscription-manager list --consumed --pool-only`, which outputs only consumed pool IDs rather than full subscription details. Changed the heading to "View Consumed Pool IDs" so the explanation matches the command behavior.

## Review Notes
The attach and remove commands are valid for entitlement-based subscription management. Simple Content Access is now the default subscription mode for new Red Hat accounts and removes the need to attach subscriptions at the system level, so the post's SCA caveat is important and technically accurate.
