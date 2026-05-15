# Validation Summary: How to Fix 'Cannot Find a Valid Baseurl for Repo' Error on RHEL 9

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF
- Red Hat Subscription Manager
- NetworkManager and nmcli
- DNS and proxy configuration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Registering the system and managing subscriptions - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_registering-the-system-and-managing-subscriptions_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation: Configuring an Ethernet connection by using nmcli - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-an-ethernet-connection_configuring-and-managing-networking
- DNF Command Reference - https://dnf.readthedocs.io/en/stable/command_ref.html
- subscription-manager manual page - https://www.mankier.com/8/subscription-manager
- Local nmcli command help for `connection show`, `connection modify`, and `connection up`

## Issues Found
- The DNS repair commands used the hard-coded NetworkManager connection name `"System eth0"`. This name is not guaranteed on RHEL 9 systems, and `nmcli connection modify` requires an existing connection profile name, UUID, or path. I added `nmcli con show --active` and changed the following commands to use `"<connection-name>"` so readers first identify the active profile and then modify the correct connection.

## Review Notes
The remaining commands are technically valid for the described troubleshooting flow. `nslookup` and `dig` may require the `bind-utils` package on minimal installations, but the commands themselves are current and appropriate for DNS troubleshooting.
