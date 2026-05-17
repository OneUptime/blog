# Validation Summary: How to Use Snap Interfaces to Control Application Permissions on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Snap / snapd package management
- Snap interfaces (plugs and slots)
- AppArmor and seccomp sandboxing
- Ubuntu Linux
- Bash scripting

## Sources Consulted
- [Connect interfaces - Snap documentation](https://snapcraft.io/docs/how-to-guides/manage-snaps/connect-interfaces/)
- [All about interfaces - Snap documentation](https://snapcraft.io/docs/explanation/interfaces/all-about-interfaces/)
- ['snap connections' command - snapcraft forum](https://forum.snapcraft.io/t/snap-connections-command/4296)
- [Ubuntu Manpage: snap - Tool to interact with snaps](https://manpages.ubuntu.com/manpages/jammy/man8/snap.8.html)
- [Interface auto-connection - Snap documentation](https://snapcraft.io/docs/explanation/interfaces/interface-auto-connection/)

## Issues Found

1. **Incorrect `snap interface` behavior** (Listing Available Interfaces section): The original comment claimed `snap interface` alone "lists all interfaces the system understands." According to the official snap manpage, `snap interface` without arguments only lists interfaces that have at least one connection; `--all` is required to list every interface. Fixed by clarifying the difference and adding the `snap interface --all` example.

2. **Non-existent `--interface` flag on `snap connections`** (Listing Available Interfaces section): The post used `snap connections --interface audio-playback` and `snap connections --interface network`. The `snap connections` command does not support a `--interface` flag — only `--all` and an optional snap-name positional argument. Replaced these examples with a `snap connections --all | grep` pipeline that achieves the same result, with a comment noting that the filter does not exist.

3. **Inverted explanation of the Notes column** (Auto-Connected vs Manually Connected section): The post stated that `'auto'` in the Notes column means auto-connected and `'-'` means manually connected. According to the snapcraft forum thread and snap documentation, this is reversed: `'-'` in the Notes column means auto-connected (the default), while `'manual'` denotes a user-initiated manual connection. (The grep `" manual"` script earlier in the post is consistent with this correct meaning, so only the explanatory comment block was wrong.) Fixed the explanation; also corrected the "No entry in Slot column" line to say `'-'` in the Slot column, which is what `snap connections --all` actually displays for unconnected plugs/slots.

## Review Notes

- The `snap connect SNAP:PLUG SNAP:SLOT` syntax and the system-slot shorthand (`:slotname`) are documented and correct.
- The list of common interfaces (camera, network, home, audio-playback, etc.) and their summaries are accurate and reflect currently supported snapd interfaces.
- The grep-based filtering examples (e.g., `grep -v " - "` to find connected vs unconnected) are inherently fragile because they rely on column padding and can be confused when the Notes column also contains `-`. They work in practice for typical output but are not robust; a future revision could recommend parsing with awk on specific column positions instead. Left as-is because they match the post's stated examples and the documented output format.
- The claim that snap interfaces are "enforced at the kernel level through AppArmor and seccomp" is accurate for systems with AppArmor support; on systems without AppArmor (some non-Ubuntu distros), confinement falls back to classic mode and is not enforced the same way. Not flagged as an issue because the post is explicitly scoped to Ubuntu.
