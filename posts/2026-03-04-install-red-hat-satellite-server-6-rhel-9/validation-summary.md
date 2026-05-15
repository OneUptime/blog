# Validation Summary: How to Install Red Hat Satellite Server 6 on RHEL

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Satellite Server 6
- Red Hat Subscription Management
- DNF
- firewalld
- Hammer CLI
- Satellite maintenance tools

## Sources Consulted
- Red Hat Satellite 6.17: Installing Satellite Server in a connected network environment: https://docs.redhat.com/en/documentation/red_hat_satellite/6.17/html-single/installing_satellite_server_in_a_connected_network_environment/index
- Red Hat Satellite 6.15: Installing Satellite Server in a connected network environment: https://docs.redhat.com/en/documentation/red_hat_satellite/6.15/html-single/installing_satellite_server_in_a_connected_network_environment/index
- Red Hat Satellite 6.17: Managing content, required Red Hat repositories: https://docs.redhat.com/en/documentation/red_hat_satellite/6.17/html/managing_content/required-red-hat-repositories
- Red Hat Satellite 6.17: Managing content, enabling Red Hat repositories: https://docs.redhat.com/en/documentation/red_hat_satellite/6.17/html-single/managing_content/index

## Issues Found
- The post used `satellite-6.15-for-rhel-9-x86_64-rpms` and `satellite-maintenance-6.15-for-rhel-9-x86_64-rpms`. Red Hat Satellite 6.15 documentation supports Satellite Server on RHEL 8, while current Satellite 6.17 documentation supports RHEL 9 and documents the 6.17 RHEL 9 repositories. Updated the repository labels to Satellite 6.17 for RHEL 9.
- The preparation steps instructed users to attach a Satellite pool manually with `subscription-manager attach --pool=...`. Current Red Hat Satellite installation documentation requires registration and an available/current Satellite subscription but does not include a manual attach step, which is often not applicable in Simple Content Access environments. Removed the attach command and kept the subscription availability check.
- The firewall command opened a custom list of ports, including stale or unnecessary ports, and omitted the documented service-based configuration. Replaced it with Red Hat's documented `firewall-cmd` sequence for Satellite Server client access: ports `8000/tcp` and `9090/tcp`, plus `dns`, `dhcp`, `tftp`, `http`, `https`, and `puppetmaster` services, followed by `--runtime-to-permanent`.

## Review Notes
- The guide is a concise installation walkthrough and does not cover every prerequisite in Red Hat's documentation, such as using a freshly provisioned RHEL system with the `@Base` package group, time synchronization, SELinux mode considerations, storage performance guidance, and browser support. These omissions are scope limitations rather than direct technical errors in the commands shown.
- The post uses Satellite 6.17 because, as of the validation date, Red Hat's current Satellite 6.17 documentation supports Satellite Server on RHEL 9. Future Satellite minor releases may require updating the repository labels again.
