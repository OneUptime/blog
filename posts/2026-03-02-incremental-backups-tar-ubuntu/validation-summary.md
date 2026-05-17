# Validation Summary: How to Set Up Incremental Backups with tar on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- GNU tar (1.35) — `--listed-incremental`, `--multi-volume`, `--tape-length`, `--exclude-from`, `--compare`, `--extract`
- Ubuntu shell scripting (bash with `set -euo pipefail`)
- cron scheduling
- gzip / gunzip

## Sources Consulted
- GNU tar manual — Incremental Dumps: https://www.gnu.org/software/tar/manual/html_node/Incremental-Dumps.html
- GNU tar manual — Multi-Volume Archives: https://www.gnu.org/software/tar/manual/html_node/Multi_002dVolume-Archives.html
- GNU tar manual — `--test-label`: https://www.gnu.org/software/tar/manual/html_section/Operations.html
- GNU tar manual — Compression: https://www.gnu.org/software/tar/manual/html_node/gzip.html
- `tar --help` and `tar --version` from GNU tar 1.35
- Empirical verification by running tar with the example combinations on Ubuntu

## Issues Found

1. **`--gzip` is incompatible with `--multi-volume`.** The original multi-volume example combined `--multi-volume --tape-length=4G --gzip` with `.tar.gz` filenames. GNU tar refuses this combination: `tar: Cannot use multi-volume compressed archives` (exit 2). Updated the example to produce uncompressed `.tar` volumes and added a follow-up `gzip` step plus a sentence explaining the limitation.

2. **`--test-label` is not a reliable integrity check.** The original "Verifying Archive Integrity" section used `tar --test-label --file=...tar.gz` as a quick integrity test. `--test-label` is designed to verify a volume label and exits with status 0 even on uncorrupted-label archives with corrupted bodies (confirmed by injecting mid-archive corruption — `--test-label` still returned 0). Replaced with `gunzip --test ...`, which actually verifies the gzip CRC of the full stream and is the right quick-check for `.tar.gz` archives. The thorough `tar --list ... > /dev/null` example that follows was already correct and left untouched.

## Review Notes

- The level terminology ("Level 0 / Level 1+") is informal but matches how GNU tar's `--level` option behaves in practice (only levels 0 and 1 are meaningful). Acceptable simplification for a tutorial.
- `date +%u` correctly returns 1–7 with Sunday=7, matching the script's `-eq 7` check and the cron `* * 7` entry (cron accepts both 0 and 7 for Sunday).
- The `-czg snapshot -f archive` short-form invocation is valid: `-g` takes the next argv as its argument before `-f` is parsed.
- `--listed-incremental=/dev/null` during extract is the documented idiom for incremental restore (honors deletion records without writing a snapshot file).
- `--tape-length=4G` accepts the `G` suffix in GNU tar (gigabytes).
- The pipeline `tar ... | tee -a "$LOG_FILE"` combined with `set -o pipefail` will correctly fail the script if tar fails — intentional and correct.
- For production use, readers may want to add encryption (e.g., `gpg`) and off-host transfer (e.g., `rsync`/`rclone`); the closing paragraph already points this out.
