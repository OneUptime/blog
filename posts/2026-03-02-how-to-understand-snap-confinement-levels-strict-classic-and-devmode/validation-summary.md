# Validation Summary: How to Understand Snap Confinement Levels: Strict, Classic, and Devmode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Snap (snapd package management)
- snapcraft / snapcraft.yaml
- AppArmor (Linux Security Module)
- seccomp (system call filtering)
- Ubuntu
- Bash scripting

## Sources Consulted
- Snapcraft documentation on confinement: https://snapcraft.io/docs/snap-confinement
- Snap interface management docs: https://snapcraft.io/docs/interface-management
- snapd command reference: https://snapcraft.io/docs/snapd-commands
- snapcraft.yaml reference: https://snapcraft.io/docs/snapcraft-yaml-reference
- Snap Store review process: https://snapcraft.io/docs/permission-requests
- AppArmor / seccomp usage in snapd: https://snapcraft.io/docs/security-policies

## Issues Found
No technical issues found. All commands, flags, examples, and conceptual explanations match the current snap/snapd documentation:

- The three confinement levels (strict, classic, devmode) are correctly described.
- `snap info`, `snap connections`, `snap connect`, `snap install --classic`, and `snap install --devmode` are correct command/flag invocations.
- The `snap connect firefox:camera :camera` syntax is valid (the leading colon refers to a system/core slot).
- Classic snap examples (code, go, heroku) are all real classic-confined snaps.
- The Snap Store's manual review requirement for classic confinement is accurately described.
- AppArmor and seccomp are correctly identified as the kernel-level enforcement mechanisms used by snapd.
- The snapcraft.yaml snippet shows valid YAML structure with correct field names (`confinement`, `apps`, `command`, `plugs`).
- The `audio-playback`, `home`, `network`, `camera`, `browser-support` interfaces all exist as documented.

## Review Notes
- The example output for `snap connections firefox` is illustrative and abbreviated — actual output will include more interfaces and may have slightly different column widths, but the format is correct.
- `snap logs <name>` (mentioned in the Devmode section) only shows logs for snap services managed by snapd; for pure CLI apps without services, developers may also want to use `snappy-debug` or check `journalctl` directly (which the post does mention).
- The "Store Acceptance: No" cell for devmode in the comparison table is a slight simplification — devmode snaps can technically be uploaded but are restricted to the edge channel and cannot be released to stable/candidate/beta. The post's surrounding text ("not accept devmode snaps for production distribution") clarifies this, so the table entry is reasonable in context.
- The comment "Refresh information about confinement without reinstalling" above `snap info --verbose firefox` is slightly imprecise — `snap info --verbose` displays detailed information but doesn't "refresh" anything from a cache. Minor wording nit, not a technical error.
- The `home` interface is auto-connected on classic Ubuntu distros (which is the post's implicit context); on Ubuntu Core it would not be auto-connected. The example assumes Ubuntu Desktop, which is consistent with the tags.
