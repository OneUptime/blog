# Validation Summary: How to Set System Purpose Attributes (Role, SLA, Usage) on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Subscription Manager
- RHEL system purpose attributes
- Kickstart
- Simple Content Access
- Ansible community.general.redhat_subscription module

## Sources Consulted
- Red Hat Enterprise Linux 9 docs, "Configuring System Purpose using the subscription-manager command-line tool": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_from_installation_media/proc_configuring-system-purpose-using-the-subscription-manager-command-line-tool_rhel-installer
- Red Hat Enterprise Linux 9 docs, "Considerations in adopting RHEL 9 - Subscription management": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_subscription-management_considerations-in-adopting-rhel-9
- Red Hat Subscription Central docs, "System purpose with Red Hat Subscription Manager": https://docs.redhat.com/en/documentation/subscription_central/1-latest/html/getting_started_with_rhel_system_registration/assembly-adv-reg-rhel-using-rhsm
- Red Hat Customer Portal, "Simple Content Access": https://access.redhat.com/articles/simple-content-access
- Red Hat Customer Portal, "Subscription-Manager for the former RHN user, part 13: System Purpose": https://access.redhat.com/articles/system-purpose
- Ansible Community Documentation, community.general.redhat_subscription module: https://docs.ansible.com/ansible/latest/collections/community/general/redhat_subscription_module.html

## Issues Found
- The post said RHEL supports three system purpose attributes, but Red Hat documents `addons` as an additional system purpose subcommand. Changed the wording to describe role, SLA, and usage as the three primary/common attributes while preserving the article focus.
- The post described a separate `syspurpose` tool as part of `subscription-manager`. In RHEL 9, Red Hat moved system purpose management under `subscription-manager syspurpose` and removed the separate `python3-syspurpose` command-line tool. Updated the wording accordingly.
- The registration example used unsupported `subscription-manager register --service-level` and `--usage` options. Replaced it with setting purpose attributes before registration, then running `subscription-manager register` with username and password.
- The add-ons section showed likely incorrect `addons --set` examples and implied add-ons enable product content. Red Hat documents add-ons as organization-specific system purpose metadata, and `addons --list` may not return fixed values. Replaced the section with safe show/list commands and directed readers to the installed command help for setting organization-specific add-ons.
- The SCA section implied normal compliance/status tracking. Red Hat documents that, in SCA mode, subscription and system purpose status are displayed as disabled while purpose attributes remain useful for subscriptions service data. Updated the wording.
- The Customer Portal navigation was outdated. Updated it to refer to Red Hat Hybrid Cloud Console subscription inventory/subscriptions service views.

## Review Notes
The remaining command examples for `subscription-manager syspurpose role`, `service-level`, `usage`, `--list`, `--show`, and `--unset` match Red Hat's RHEL 9 documentation. The Ansible `community.general.redhat_subscription` `syspurpose` keys match the current Ansible community module documentation.
