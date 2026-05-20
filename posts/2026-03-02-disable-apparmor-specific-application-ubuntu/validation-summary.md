# Validation Summary: How to Disable AppArmor for a Specific Application on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- AppArmor
- apparmor-utils (`aa-disable`, `aa-complain`, `aa-enforce`, `aa-status`)
- `apparmor_parser`
- snapd interfaces and confinement

## Sources Consulted
- Ubuntu Server documentation: AppArmor - https://ubuntu.com/server/docs/how-to/security/apparmor/
- Ubuntu manpage: `aa-disable` - https://manpages.ubuntu.com/manpages/noble/man8/aa-disable.8.html
- Ubuntu manpage: `aa-complain` - https://manpages.ubuntu.com/manpages/noble/man8/aa-complain.8.html
- Ubuntu manpage: `aa-enforce` - https://manpages.ubuntu.com/manpages/noble/man8/aa-enforce.8.html
- Ubuntu manpage: `aa-status` - https://manpages.ubuntu.com/manpages/noble/man8/apparmor_status.8.html
- Ubuntu manpage: `apparmor_parser` - https://manpages.ubuntu.com/manpages/noble/man8/apparmor_parser.8.html
- Snap documentation: Snap confinement - https://snapcraft.io/docs/explanation/security/snap-confinement/
- Snap documentation: All about interfaces - https://snapcraft.io/docs/explanation/interfaces/all-about-interfaces/
- Snap documentation: System architecture - https://snapcraft.io/docs/reference/system-architecture/

## Issues Found
- The `aa-disable` example said the argument is the profile file path, but the official manpage documents executable paths. Updated the comment to say the argument is the executable path.
- The description of `aa-disable` said it creates a symlink from the profile file to `/dev/null`. Ubuntu documentation describes disable entries as symlinks in `/etc/apparmor.d/disable/` that point to profile files. Updated the wording.
- The post said a reload or reboot is required after `aa-disable`, but the official manpage says `aa-disable` unloads the profile by default unless `--no-reload` is used. Updated the text to reserve manual unloading for `--no-reload` or manually-created symlinks.
- The complain-mode explanation said nothing is blocked. The `aa-complain` manpage notes that explicit `deny` rules are still enforced in complain mode. Added that caveat.
- The rename-profile method moved the profile file and reloaded AppArmor, which does not reliably unload an already-loaded profile. Updated the commands to unload the profile with `apparmor_parser -R` before moving it.
- The snap section implied `snap disconnect myapp:home` would allow a snap to run with fewer restrictions. Snap documentation describes interfaces as granting access when connected; disconnecting removes access. Updated the section to show `snap connect myapp:home` and clarified that snap AppArmor profiles should be managed through snap interfaces rather than edited or disabled directly.

## Review Notes
The guide is technically relevant and accurate after the targeted corrections. Future improvements could mention that profile file names commonly replace `/` with `.`, but executable-to-profile mapping can be more complex for named profiles and profile attachments.
