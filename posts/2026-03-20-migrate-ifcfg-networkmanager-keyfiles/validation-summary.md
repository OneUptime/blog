# Validation Summary: How to Migrate from ifcfg Files to NetworkManager Keyfiles

## Status
validated

## Post Type
Guide

## Technologies Covered
- NetworkManager
- `nmcli`
- RHEL 9 networking
- ifcfg connection profiles
- keyfile (`.nmconnection`) connection profiles

## Sources Consulted
- Red Hat Enterprise Linux 9, "NetworkManager connection profiles in keyfile format" — https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/assembly_networkmanager-connection-profiles-in-keyfile-format_configuring-and-managing-networking
- Red Hat Enterprise Linux 9.7 Release Notes, "Deprecated functionalities" — https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.7_release_notes/deprecated-functionalities
- Red Hat Enterprise Linux 9.6 Release Notes, "Known issues" — https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.6_release_notes/known-issues
- NetworkManager `nmcli` reference manual — https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager `nm-settings-keyfile` reference manual — https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-keyfile.html
- NetworkManager `NetworkManager.conf` reference manual — https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager.conf.html

## Issues Found
- The section title referenced `nm-migrate`, but the documented tool is `nmcli connection migrate`. I renamed the section and aligned the example output with the documented `successfully migrated` wording.
- The keyfile examples embedded the default gateway inside `address1`. That older syntax is still accepted, but current NetworkManager documentation recommends the separate `gateway=` key, and RHEL 9.6+ stores new or modified keyfiles that way. I updated both keyfile examples accordingly.
- The manual migration example said `nmcli connection show eth0` "exports" the profile and then used a heredoc to hand-write the keyfile. `nmcli connection show` only displays the profile, and Red Hat recommends generating keyfiles with `nmcli --offline` instead of manually editing them. I changed the wording and replaced the heredoc with a documented offline `nmcli connection add` command.
- The rollback procedure removed the migrated keyfile and assumed the original `ifcfg` profile was still available. `nmcli connection migrate` is documented as migrating profiles between settings plugins, including back to `ifcfg-rh`. I corrected rollback to restore the plugin and migrate the profile back with `nmcli connection migrate --plugin ifcfg-rh eth0`.

## Review Notes
- RHEL 9 still supports existing `ifcfg` profiles, but the format is deprecated throughout the RHEL 9 lifecycle and is removed in RHEL 10.
- `nmcli connection migrate` ignores unmanaged profiles that contain `NM_CONTROLLED=no`; the post does not mention this edge case.
- Disabling `ifcfg-rh` in `NetworkManager.conf` is optional after migration. The keyfile plugin is always active, but removing `ifcfg-rh` only makes sense once all remaining managed profiles have been converted.
