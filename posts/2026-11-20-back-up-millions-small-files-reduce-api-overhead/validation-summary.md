# Validation summary

Reviewed restic 0.18.1 repository packing, backup behavior, no-scan semantics, structured output, integrity checking and subtree restore syntax against versioned official documentation. Source enumeration and destination API costs are distinguished throughout.

## Executed fixture

Verified the official darwin/arm64 release archive against its SHA256SUMS file and confirmed the binary reports 0.18.1. The published script executed with Python 3.11 on macOS: created 1,000 distinct 4 KiB files, backed them up twice, ran check --read-data without errors, restored the first snapshot by exact ID, and compared every restored path and content hash with the pre-backup manifest. All matched. The second backup reported 1,000 unmodified files while still adding metadata; three pack files existed afterward. The published script matches the executed file and passes Bash syntax checking. The generated social image was visually inspected and the title fits.

## Limits

This is a small local correctness and layout demonstration, not a million-file performance benchmark or cloud-request test. No live network share, application consistency, production metadata fidelity or cloud backend was tested. The release checksum was checked; its detached signature was not verified. Pack count must not be interpreted as API count.

## Checked sources

- https://restic.readthedocs.io/en/v0.18.1/100_references.html
- https://github.com/restic/restic/releases/tag/v0.18.1
- https://restic.readthedocs.io/en/v0.18.1/020_installation.html
- https://restic.readthedocs.io/en/v0.18.1/075_scripting.html
- https://restic.readthedocs.io/en/v0.18.1/050_restore.html
- https://restic.readthedocs.io/en/v0.18.1/047_tuning_backup_parameters.html
- https://restic.readthedocs.io/en/v0.18.1/040_backup.html
- https://restic.readthedocs.io/en/v0.18.1/045_working_with_repos.html

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
