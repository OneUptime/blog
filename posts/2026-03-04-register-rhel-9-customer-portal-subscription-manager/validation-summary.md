# Validation Summary: How to Register RHEL to the Customer Portal with subscription-manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Subscription Manager
- Red Hat Subscription Management
- Simple Content Access
- DNF repositories
- RHSM proxy configuration

## Sources Consulted
- Red Hat Documentation: Register a RHEL system with command line tools: https://docs.redhat.com/en/documentation/subscription_central/1-latest/html/getting_started_with_rhel_system_registration/assembly-basic-reg-rhel-cli
- Red Hat Documentation: Prepare to register RHEL systems / Simple Content Access: https://docs.redhat.com/en/documentation/subscription_central/1-latest/html/getting_started_with_rhel_system_registration/assembly-prep-reg-rhel
- Red Hat Documentation: Registering RHEL by using Subscription Manager: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_from_installation_media/registering-rhel-by-using-subscription-manager_rhel-installer
- Red Hat Documentation: Automatically installing RHEL / subscription-manager registration and SCA status examples: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automatically_installing_rhel/index
- Red Hat Documentation: Red Hat Subscription Manager overview and list options: https://docs.redhat.com/en/documentation/subscription_central/1-latest/html/getting_started_with_rhel_system_registration/assembly-adv-reg-rhel-using-rhsm
- Red Hat Customer Portal: How to access RHSM through a firewall or proxy: https://access.redhat.com/solutions/65300
- subscription-manager manual page: https://man.docs.euro-linux.com/EL%208/subscription-manager/subscription-manager.8.en.html

## Issues Found
- The post recommended `subscription-manager register --token=...` for automation. Red Hat documents the `--token` option as deprecated and unsupported by the default entitlement server after November 2024. Changed the section to recommend activation key registration with `--activationkey` and `--org`.
- The prerequisites only mentioned connectivity to `subscription.rhsm.redhat.com`. Red Hat documents that protected content access also uses `cdn.redhat.com` over HTTPS. Updated the prerequisite to include both endpoints on port 443.
- The registration flow diagram showed `subscription-manager register` going to the Red Hat CDN for credential authentication. Registration is handled by Red Hat Subscription Management, while the CDN provides package content after registration and repository access. Updated the diagram labels accordingly.
- The repository verification statement named x86_64 RHEL 9 repository IDs without noting the architecture dependency. Updated the sentence to scope those examples to x86_64 systems.

## Review Notes
With Simple Content Access enabled, `subscription-manager status` can show disabled subscription status while the registered host still has access to content. The post's SCA explanation is accurate, but future revisions could add this as a troubleshooting note to avoid confusion.
