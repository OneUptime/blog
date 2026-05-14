# Validation Summary: How to Transfer a RHEL Subscription Between Systems

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Subscription Manager
- Red Hat Simple Content Access
- Red Hat Hybrid Cloud Console inventory
- Red Hat Satellite
- Red Hat virt-who
- Ansible community.general.redhat_subscription
- dnf

## Sources Consulted
- Red Hat Simple Content Access: https://access.redhat.com/articles/simple-content-access
- Red Hat Subscription Central, Getting Started with RHEL System Registration: https://docs.redhat.com/en/documentation/subscription_central/1-latest/html-single/getting_started_with_rhel_system_registration/getting_started_with_rhel_system_registration
- Red Hat Enterprise Linux 9 documentation, registering with Subscription Manager: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/registering-rhel-by-using-subscription-manager_rhel-installer
- Red Hat Enterprise Linux 7 documentation, removing subscriptions: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/chap-subscription_and_support-registering_a_system_and_managing_subscriptions
- Red Hat Satellite 6.18 documentation, removing hosts: https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/managing_hosts/managing-host-records-in-project
- Red Hat Satellite virtual instances guide: https://docs.redhat.com/en/documentation/red_hat_satellite/6.4/single/virtual_instances_guide/virt_who_installation_and_configuration_overview
- Ansible community.general.redhat_subscription module: https://docs.ansible.com/projects/ansible/latest/collections/community/general/redhat_subscription_module.html

## Issues Found
- The SCA description implied unregistering frees a registration slot. In SCA, systems do not attach per-system entitlements; unregistering removes the system from subscription management services and local certificates. Updated the wording to match Red Hat's SCA and registration documentation.
- The stale-system cleanup instructions referenced the older Customer Portal subscription systems flow and said it frees a subscription slot. Updated the instructions to use the Red Hat Hybrid Cloud Console inventory path and clarified the effect for traditional entitlement reporting.
- The Satellite deletion wording did not match current Satellite UI documentation. Updated it to reflect selecting a host and using the options or action menu to delete hosts.
- The virtual machine subscription bullets overstated what per-socket subscriptions cover and underspecified host-based VDC behavior. Updated the text to distinguish physical socket/core coverage from VDC hypervisor/guest coverage with host-guest reporting.
- The transfer workflow and summary still implied that SCA unregistration returns a subscription to a pool and referenced Customer Portal cleanup. Updated those references so SCA and traditional entitlement behavior remain distinct throughout the post.

## Review Notes
The subscription-manager commands, activation key registration syntax, removal by serial number, attach by pool, auto-attach, repository listing, dnf check-update, and Ansible community.general.redhat_subscription examples are consistent with official documentation for entitlement-based environments. In SCA environments, Red Hat documents attach commands as obsolete and unnecessary, which the post now distinguishes from the traditional entitlement workflow.
