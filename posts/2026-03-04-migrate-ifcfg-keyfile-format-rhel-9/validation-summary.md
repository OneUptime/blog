# Validation Summary: How to Migrate from ifcfg Files to Keyfile Format in RHEL

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NetworkManager
- ifcfg-rh connection profiles
- NetworkManager keyfile connection profiles
- nmcli
- Bash scripting

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "NetworkManager connection profiles in keyfile format": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/assembly_networkmanager-connection-profiles-in-keyfile-format_configuring-and-managing-networking
- Red Hat Enterprise Linux 9.2 release notes, "NetworkManager connection profiles in ifcfg format are deprecated": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.2_release_notes/deprecated-functionality
- Red Hat blog, "RHEL 9 networking: Say goodbye to ifcfg-files, and hello to keyfiles": https://www.redhat.com/en/blog/rhel-9-networking-say-goodbye-ifcfg-files-and-hello-keyfiles
- NetworkManager nmcli manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager keyfile settings manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-keyfile.html
- NetworkManager configuration manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager.conf.html
- NetworkManager dispatcher manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager-dispatcher.html

## Issues Found
- The post described the ifcfg deprecation and keyfile default as applying broadly to "RHEL". Updated the wording to scope this accurately to RHEL 9 and to state that support is planned for removal in the next major RHEL release.
- The migration section implied that all ifcfg profiles are migrated. Added the documented caveat that profiles with `NM_CONTROLLED=no` are ignored because NetworkManager does not manage them.
- The scripted bulk migration selected profiles by grepping any `sysconfig` text in `NAME,FILENAME` output and then splitting on the first colon, which could select the wrong record or break with unusual connection names. Updated it to filter the `FILENAME` field for `/etc/sysconfig/network-scripts/` and migrate by UUID.
- The custom scripts section said ifcfg files reference `ifup-local` and `ifdown-local`. Adjusted this to describe legacy network-scripts hook workflows, which is the accurate relationship.

## Review Notes
The main migration workflow, `nmcli connection migrate`, keyfile location, ifcfg profile location, keyfile INI-style syntax, `nmcli -f NAME,FILENAME connection show`, and NetworkManager dispatcher path were verified against official documentation. The post remains version-sensitive: the RHEL 9 guidance is accurate, but future RHEL major releases may remove ifcfg support entirely.
