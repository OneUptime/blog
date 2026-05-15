# Validation Summary: How to Use nmcli Offline Mode to Generate Network Configuration Files on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NetworkManager
- nmcli offline mode
- NetworkManager keyfile connection profiles
- Kickstart `%post` scripts
- Containerfile/Dockerfile provisioning
- Bash scripting

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Using nmcli to create keyfile connection profiles in offline mode": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/assembly_networkmanager-connection-profiles-in-keyfile-format_configuring-and-managing-networking
- Red Hat Enterprise Linux image mode documentation, "Generating a NetworkManager keyfiles by using nmcli": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_image_mode_for_rhel_to_build_deploy_and_manage_operating_systems/system-configuration
- NetworkManager 1.40 release announcement, "`nmcli` Offline Commands": https://networkmanager.dev/blog/networkmanager-1-40/
- NetworkManager 1.40 nmcli reference manual: https://www.networkmanager.dev/docs/api/1.40/nmcli.html
- CentOS Git NetworkManager package release import showing `NetworkManager-1.40.0-2.el9_1`: https://git.centos.org/rpms/NetworkManager/releases
- Local NetworkManager 1.46.0 `nmcli(1)` and `nm-settings-keyfile(5)` man pages.

## Issues Found
- The post said offline mode writes `.nmconnection` files to a specified directory. Official documentation states that `nmcli --offline connection add` produces keyfile content on standard output. Updated the description and Basic Usage wording to say stdout, with redirection used to create files.
- The post implied RHEL generally included NetworkManager 1.40. Updated the version note to RHEL 9.1 and later, because RHEL 9.0 shipped an older NetworkManager stream while RHEL 9.1 introduced the 1.40 stream.
- Examples that deploy files under `/etc/NetworkManager/system-connections` only set mode `600`. NetworkManager's keyfile plugin ignores files readable or writable by users other than root, and Red Hat's procedure sets both permissions and root ownership. Added `chown root:root` to those deployment examples.
- The validation section described `cat` as checking whether the file is well-formed. `cat` only displays file contents; it does not parse or validate keyfile syntax. Updated the comment to say it inspects the generated file.
- The comparison table said normal mode validates against hardware. `nmcli connection add` can create a profile for an interface that is not currently present, so this overstated the distinction. Reworded the limitation and table row to focus on runtime device interaction instead.

## Review Notes
The command syntax for `nmcli --offline connection add`, IPv4 and IPv6 properties, DNS list handling, shell examples, Kickstart `%post` usage, and `nmcli connection reload/load` workflow were checked against official documentation and local `nmcli` 1.46.0 behavior. No remaining technical issues found.
