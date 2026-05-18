# Validation Summary: How to Set Up Unison for Two-Way File Synchronization on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Unison (file synchronizer)
- Ubuntu / apt
- SSH / OpenSSH (ssh-keygen, ssh-copy-id)
- Bash / shell scripting
- cron
- systemd (service & timer units)
- diff3 / meld (merge tooling)

## Sources Consulted
- Unison user manual (master): https://raw.githubusercontent.com/bcpierce00/unison/documentation/unison-manual.txt
- Unison source repository (bcpierce00/unison): https://github.com/bcpierce00/unison
- Arch Linux man page for unison(1): https://man.archlinux.org/man/extra/unison/unison.1.en
- Ubuntu man page for unison: https://manpages.ubuntu.com/manpages/xenial/man1/unison-2.48.3.1.html
- Unison Wiki / FAQ: https://github.com/bcpierce00/unison/wiki
- ArchWiki Unison page: https://wiki.archlinux.org/title/Unison

## Issues Found

1. **Conflict-resolution key directions were reversed.** The post claimed `<` accepts the left/local version and `>` accepts the right/remote version. The Unison manual states the opposite: `<` propagates *right to left* (so the right/remote version wins) and `>` propagates *left to right* (so the left/local version wins). Swapped the labels to match the manual.

2. **`mergetool` and `mergeprogram` are not real Unison preferences.** The correct preference is `merge`, and it requires a path-spec on the left: `merge = Name * -> diff3 -m CURRENT1 CURRENTARCH CURRENT2 > NEW`. Replaced both invalid options with a correct `merge` example and corrected the `diff3 -m` argument order (mine, base, theirs). Also removed the bogus `mergeprogram = meld` line and replaced it with a commented-out `merge` example for meld.

3. **`deletelast = true` is not a real Unison preference.** Deletion behaviour in Unison is controlled by preferences such as `nodeletion`, `nodeletionpartial`, `noupdate`, etc. — there is no `deletelast`. Removed the line and its (incorrect) comment claiming a default of `true`.

4. **Exit codes were wrong.** The post said `0 = success, 1 = no changes needed, 2 = conflicts detected`. The actual codes from the Unison manual are `0` = full success / up-to-date, `1` = some files skipped (e.g. conflicts), `2` = non-fatal failures during transfer, `3` = fatal error/interrupted. Updated to the documented values.

5. **`-testenv` is not a real flag.** Unison provides `-testserver` (tests that the client can connect to the remote server). There is no built-in dry-run mode. Replaced the `-testenv` example with `-testserver` and reworded the surrounding text so it no longer claims to be a dry run. Also replaced the misleading `unison -diff myproject` usage with a note explaining that `diff` is a preference that controls the diff command invoked from within the interactive UI.

6. **The "rsync transport" section was misleading.** The post implied that rsync support is an add-on shipped with `unison-gtk` and that it requires the `rsync` binary on both ends. Unison ships with its own implementation of the rsync algorithm built in; no external rsync binary or extra package is required, and `unison-gtk` only adds the GTK GUI. Rewrote the section to reflect that `rsync = true` is the built-in default and removed the bogus `apt install unison-gtk` step.

## Review Notes

- The note about Unison versions needing to match exactly between client and server is correct for the wire protocol prior to 2.52; modern Unison versions (2.52+) are somewhat more tolerant but matching versions is still the safest recommendation, so the guidance stands.
- The `fastcheck` preference is set to `false` in the example. This is much slower (full content compare instead of mtime/length), and the Unison default on Unix is `true`. The post explicitly opts in to the slower setting and the comment is accurate, so it has been left alone — but readers who want default speed should remove that line.
- `sshargs = -i /home/ubuntu/.ssh/unison_key` is valid, but on modern OpenSSH a cleaner approach is often to use an `~/.ssh/config` Host stanza; this is a style preference, not a correctness issue.
- The interactive prompt also accepts `f` ("follow Unison's recommendation") and Enter, which the post mentions earlier and is correct.
- The "Fine-Tuning Ignore Rules" section's hint `unison -help | grep ignorenot` is fine — `ignorenot` is a real preference that inverts `ignore` patterns.
