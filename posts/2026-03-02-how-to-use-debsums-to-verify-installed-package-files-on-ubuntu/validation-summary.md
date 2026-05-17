# Validation Summary: How to Use debsums to Verify Installed Package Files on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- debsums (Debian/Ubuntu)
- dpkg / apt
- AIDE (Advanced Intrusion Detection Environment)
- bash scripting / cron
- md5sum

## Sources Consulted
- Official debsums(1) man page (Debian bookworm): https://manpages.debian.org/bookworm/debsums/debsums.1.en.html
- Ubuntu manpages: https://manpages.ubuntu.com/manpages/jammy/man1/debsums.1.html
- dpkg documentation regarding `/var/lib/dpkg/info/` (md5sums, conffiles)
- AIDE documentation for `aideinit` (Debian/Ubuntu wrapper) and `aide --check`

## Issues Found

1. **Misdescribed `REPLACED` status.** The original post claimed `REPLACED` indicates a modified configuration file. Per the official man page, `REPLACED` means the file has been replaced by a file from a different package (e.g., a diversion) - it is unrelated to config-file modification. Furthermore, debsums skips configuration files by default; they only get checked with `-a`/`--all` (or only checked with `-e`/`--config`). Rewrote the example output and the explanatory paragraph to reflect this, and added a note about the `-a` and `-e` flags.

2. **`-l` / `--list-missing` flag described backwards.** The post said `sudo debsums -l` lists packages that "DO have checksum data" and used a `grep "missing"` pipeline to filter for the opposite. In reality, `-l` / `--list-missing` lists packages that DO NOT have an md5sums file - there is no `-l` mode that lists packages with md5sums. Replaced both lines with the correct semantics and added the long-form flag.

3. **`--silent` mislabeled as the "Short form."** `-s` is the short form and `--silent` is the long form. Swapped the comments so the short/long labels match reality.

4. **Incorrect `grep` regex for filtering output.** The post used `grep -v "^OK\|REPLACED"`, but debsums prints the status word at the END of each line (after the filename), so anchoring with `^` matches nothing. Replaced with `grep -E "FAILED|REPLACED"` and added a clarifying comment about the line format.

## Review Notes

- The `sudo debsums -s 2>&1 >> "$REPORT"` redirection in the cron-job example has the redirections in an order (`2>&1` before `>>`) that does not send stderr to the file - it sends stderr to whatever stdout pointed at *before* the `>>`. For a cron job running as root the practical effect is minor (and cron will capture the stray stderr anyway), so left as-is.
- `sudo apt download` does not actually require root, but using `sudo` is harmless. Left as-is.
- Inside `/etc/cron.weekly/debsums-check`, the script already runs as root, so the leading `sudo` calls are redundant but not incorrect. Left as-is.
- `aide --check` on Ubuntu works because `/usr/bin/aide` honors the default config produced by `aideinit`; `aide.wrapper --check` is the more idiomatic Debian/Ubuntu invocation but the post's form is also valid.
- The post does not mention that debsums only verifies MD5 sums, which are cryptographically weak. For the file-integrity-monitoring use case this is acceptable (the threat model is accidental change or unsophisticated tampering) and the post correctly recommends AIDE for stronger needs.
