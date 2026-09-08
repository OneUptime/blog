# Validation Summary: How to Recover a Corrupted SQLite Database and Verify the Restore

## Status
validated

## Post Type
Technical recovery guide with Bash and SQLite CLI examples.

## Technologies Covered
- SQLite database recovery and the sqlite3 CLI
- WAL, rollback journals, and filesystem copying
- Integrity checks, foreign keys, and application data validation
- Bash and SHA-256 checksums
- Database backups and production restore procedures

## Sources Consulted
- SQLite recovery documentation: https://www.sqlite.org/recovery.html
- SQLite CLI documentation: https://www.sqlite.org/cli.html
- SQLite integrity_check: https://www.sqlite.org/pragma.html#pragma_integrity_check
- SQLite foreign_key_check: https://www.sqlite.org/pragma.html#pragma_foreign_key_check
- SQLite quick_check: https://www.sqlite.org/pragma.html#pragma_quick_check
- SQLite corruption causes: https://www.sqlite.org/howtocorrupt.html
- SQLite WAL documentation: https://www.sqlite.org/wal.html
- SQLite locking and hot-journal recovery: https://www.sqlite.org/lockingv3.html
- SQLite AUTOINCREMENT semantics: https://www.sqlite.org/autoinc.html
- SQLite online backup API: https://www.sqlite.org/backup.html
- Installed SQLite CLI version output and `.help recover`.

## Issues Found
1. The instruction to open the copy once before separating files could imply that sidecar removal is safe even if recovery fails. Changed it to require a clean close, let SQLite manage cleanup, and retain sidecars when opening or recovery fails.
2. The identifier invariant incorrectly required sequence or identifier values to exceed all existing keys. SQLite's stored AUTOINCREMENT sequence can equal the largest key. Changed the example to concern the next generated identifier, conditional on an application requirement for increasing identifiers.
3. Production replacement stopped only writers and did not explicitly prevent old sidecars from accompanying the replacement. Changed it to close all connections, archive the original file set, clear old sidecars from the destination by archiving them, and install a standalone database-aware backup. This avoids replacing an open database or pairing the restored file with an unrelated journal or WAL.

## Review Notes
- All Bash code blocks passed `bash -n` syntax checks.
- The installed Apple SQLite CLI reports version 3.51.0. Its recovery help confirms both documented options. Both recovery commands successfully exported a disposable healthy database; their SQL imported into separate new databases, preserved the sample row, returned `ok` from integrity_check, and returned no foreign-key violations.
- A disposable AUTOINCREMENT example confirmed that sqlite_sequence.seq and the largest existing key can both be 1.
- These smoke checks validate command syntax and the export/import path; they do not establish recovery completeness for damaged files. No actual incident database was supplied.
- The four SQLite documentation links in the post resolve to the intended official resources. No specific SQLite release is claimed in the post, and the commands reviewed are documented, non-deprecated interfaces.
- foreign_key_check returns one row per violation; a successful check with no rows is clean. These pragmas do not establish business correctness, as the post correctly explains.
- The alternate lost-and-found command retains default freelist scanning and only renames the holding table. Its privacy implications remain covered by the preceding paragraph.
- Shell examples assume Bash, sqlite3 with recovery support, and shasum are installed. Filesystem metadata preservation with cp -p depends on platform and permissions.
