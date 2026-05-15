# Validation Summary: How to Unregister and Re-register a RHEL System with subscription-manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Subscription Manager
- Red Hat Subscription Management
- Red Hat Satellite
- DNF
- Ansible community.general.redhat_subscription

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Changing a subscription service": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/changing-a-subscripton-service_rhel-installer
- Red Hat Subscription Central, "Getting Started with RHEL System Registration": https://docs.redhat.com/en/documentation/subscription_central/1-latest/html-single/getting_started_with_rhel_system_registration/index
- Red Hat Satellite documentation, host registration with katello-ca-consumer and subscription-manager: https://docs.redhat.com/en/documentation/red_hat_satellite/6.10/html-single/quick_start_guide
- Red Hat Satellite documentation, restoring CDN registration configuration after Satellite registration: https://docs.redhat.com/en/documentation/red_hat_satellite/6.3/html/upgrading_and_updating_red_hat_satellite/upgrading_red_hat_satellite
- Ansible community.general.redhat_subscription module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/redhat_subscription_module.html

## Issues Found
- The Satellite-to-CDN example restored only selected Subscription Manager configuration keys with `subscription-manager config`. Red Hat's documented procedure restores the saved default `/etc/rhsm/rhsm.conf` file because Satellite registration can modify additional RHSM configuration. Changed the example to move the Satellite config aside and restore `rhsm.conf.kat-backup` as `rhsm.conf`.

## Review Notes
- The `subscription-manager register`, `unregister`, `clean`, `status`, `identity`, `list --consumed`, `repos --list-enabled`, and `register --force` usage is consistent with Red Hat Subscription Manager behavior.
- For current direct registration of RHEL 8.8 and later systems to Red Hat-hosted services, Red Hat documentation recommends `rhc connect` as the simplified path, while `subscription-manager register` remains required for Satellite registration and is still documented in RHEL installation workflows.
