# Validation Summary: How to Use Sleuth Kit for File System Forensics on Ubuntu

## Status
validated

## Post Type
Tutorial / Hands-on guide

## Technologies Covered
- The Sleuth Kit (TSK) command-line forensic tools (mmls, fsstat, fls, istat, icat, blkls, mactime, jls, jcat, ifind, ffind, sigfind, hfind, srch_strings)
- Ubuntu package management (apt) and source build (build-essential, libafflib, libewf)
- ext4 file system internals (inodes, journal, extents)
- File carving with foremost and photorec (testdisk)
- Bash scripting for triage automation

## Sources Consulted
- Official TSK man pages bundled with the `sleuthkit` package on Ubuntu 24.04 (`sleuthkit 4.12.1+dfsg-1.1ubuntu2`), including fls(1), blkls(1), mactime(1), sigfind(1), hfind(1), icat(1), ifind(1), ffind(1), jls(1), srch_strings(1)
- The Sleuth Kit GitHub releases: https://github.com/sleuthkit/sleuthkit/releases (verified tag `sleuthkit-4.12.1` exists and the tarball URL is valid; latest at review time is `sleuthkit-4.15.0`)
- TSK project page: https://www.sleuthkit.org/sleuthkit/

## Issues Found
1. **`sigfind` used with a literal string `"password"`** — Incorrect. Per `sigfind(1)`, the tool searches for a *hex* binary signature at a fixed offset within each block (intended for locating lost superblocks, partition tables, FAT boot sectors, etc.), not for arbitrary text. The example would not behave as the surrounding comment claims. Replaced with `srch_strings -a -t d "$EVIDENCE" | grep -i "password"` for string searching (srch_strings ships with TSK) and kept a corrected `sigfind` example that uses a real hex signature (`sigfind -o 510 -l AA55 ...`) with a comment explaining its actual purpose.
2. **`mactime` DATE_RANGE syntax** — Incorrect. The post passed `2026-01-14 2026-01-15` as two separate arguments. Per `mactime(1)`, the range must be a single argument in the form `yyyy-mm-dd..yyyy-mm-dd`. Updated to `2026-01-14..2026-01-15` and added a clarifying comment.
3. **`hfind` query without prior indexing** — Incomplete. Per `hfind(1)`, the hash database must first be indexed with `hfind -i <db_type> <db_file>` (e.g., `hfind -i nsrl-md5 NSRLFile.txt`) before any lookup will succeed. Added the indexing step before the lookup command.

## Review Notes
- The Ubuntu repository ships TSK 4.12.1 (matching what the post compiles from source), so the version reference is consistent with Ubuntu 24.04 LTS. As of review, upstream TSK has released 4.15.0; readers wanting the newest features should adjust the `wget` URL accordingly, but 4.12.1 is still a valid, working version.
- The `mmls`, `fsstat`, `istat`, `fls`, and `icat` flags and example outputs all match the current TSK behavior.
- `fls -m "/"` correctly produces mactime body-file format with `/` as the mount-point prefix.
- `blkls -A` is the documented (and default) flag for unallocated blocks — correct.
- `icat -r` (recover) and `-o` (offset) usage is correct.
- The script in "Scripting a Complete Analysis" is syntactically valid bash and uses only flags that exist in current TSK.
- `column -t -s','` requires `bsdmainutils` / `util-linux`'s `column`; on a default Ubuntu it is present.
- The post does not mention `tsk_recover` (bulk recovery of allocated/deleted files), which would be a useful future addition but is not an error.
