# Validation Summary: How to Manage Subscriptions and Repos with subscription-manager on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Subscription Manager
- Simple Content Access
- Red Hat CDN repositories
- DNF/YUM repository configuration
- Kickstart post-install automation

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Registering the system and managing subscriptions: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_registering-the-system-and-managing-subscriptions_configuring-basic-system-settings
- Red Hat Subscription Central: Getting Started with RHEL System Registration: https://docs.redhat.com/en/documentation/subscription_central/1-latest/html-single/getting_started_with_rhel_system_registration/index
- Red Hat Subscription Central: Getting Started with Simple Content Access: https://docs.redhat.com/en/documentation/subscription_central/1-latest/html/getting_started_with_simple_content_access/assembly-about-simplecontent_simplecontentaccess_guide
- Red Hat Enterprise Linux 9.5 Release Notes: Deprecated subscription-manager modules and token registration: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.5_release_notes/deprecated-functionalities
- Red Hat Enterprise Linux for SAP Solutions 9 documentation: repository IDs and release locking examples: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/rhel_for_sap_subscriptions_and_repositories/asmb_enable_repo_rhel-for-sap-subscriptions-and-repositories-9

## Issues Found
- The Simple Content Access section described SCA as a recent optional mode without noting that Red Hat Subscription Management accounts have moved to SCA as the default workflow. Updated the wording to reflect current Red Hat guidance.
- The non-SCA attachment section presented `subscription-manager attach` and `attach --auto` as a normal current workflow. Updated it to identify the workflow as legacy and to note that `attach` and `auto-attach` are deprecated in current RHEL 9 releases.
- The release-lock example said "RHEL.2" instead of "RHEL 9.2". Corrected the text and command comment.
- The `subscription-manager clean` explanation implied it only regenerated a local cache. Updated it to explain that it removes local subscription and identity data without removing the system profile from the subscription management service.
- The unregistering section said unregistering always frees a subscription entitlement. Updated it to distinguish system removal from legacy entitlement release behavior under non-SCA workflows.
- The troubleshooting section unconditionally ran `subscription-manager attach --auto` after registration. Updated the example to make that step specific to legacy entitlement mode.
- The activation key section said activation keys can pre-assign subscriptions, repositories, and service levels without qualifying the legacy entitlement behavior. Updated it to mention repositories and system purpose attributes generally, with subscription and service-level attachment scoped to legacy entitlement mode.

## Review Notes
The local review environment did not have `subscription-manager` installed, so command syntax was checked against Red Hat documentation rather than local `subscription-manager --help` output. The repository IDs and `repos --enable`, `release --set`, registration, activation key, status, refresh, facts, config, unregister, and Kickstart usage are otherwise consistent with Red Hat's documented RHEL 9 workflows.
